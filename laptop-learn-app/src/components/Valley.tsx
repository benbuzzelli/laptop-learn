import { useRef, useCallback } from 'react';
import { drawCustomCursor } from '../games/shared/draw';
import type { WalkDirection } from '../games/shared/draw';
import { useGameCanvas } from '../games/shared/useGameCanvas';
import { playStep, playPop } from '../games/shared/audio';
import {
  getAvatar,
  drawAvatarSprite,
  getEarnedStickerCount,
  getGrowthStage,
} from '../games/shared/avatar';
import { getActiveProfile, profileKey } from '../games/shared/profile';
import { getCollectionCount, getAllSlots } from '../games/shared/collection';
import {
  getActiveQuest,
  getQuestById,
  completedToday,
} from '../games/shared/quests';
import { getQuillSpriteImage } from '../games/shared/quill';
import type { GameId } from '../games/shared/types';

// Map background
import dinoMapUrl from '../games/shared/sprites/backgrounds/dino-map.png';

// Numbered game icons — filename format is <name>-<x>-<y>.png where x,y is the
// top-left position of the icon in map pixel space.
import volcanoIcon from '../games/shared/sprites/backgrounds/games/volcano-game-178-17.png';
import dungeonIcon from '../games/shared/sprites/backgrounds/games/dungeon-game-1380-166.png';
import spellIcon from '../games/shared/sprites/backgrounds/games/spell-game-882-756.png';
import eggIcon from '../games/shared/sprites/backgrounds/games/egg-hatch-game-370-1256.png';
import museumIcon from '../games/shared/sprites/backgrounds/games/museum-1724-997.png';
import boneCaveIcon from '../games/shared/sprites/backgrounds/games/bone-cave-2615-466.png';
import jungleIcon from '../games/shared/sprites/backgrounds/games/jungle-find-2970-1107.png';

const W = 800;
const H = 600;
const MAP_W = 3618;
const MAP_H = 1727;

// World zoom: how much the map + its painted icons shrink in the viewport.
// Player and Quill keep their canvas-native size so the characters don't
// become hard to see. 0.42 shows roughly 1900×1430 of map at a time.
const ZOOM = 0.34;
const VIEW_MAP_W = W / ZOOM;
const VIEW_MAP_H = H / ZOOM;

type LocationId = GameId;

interface ValleyLocation {
  id: LocationId;
  name: string;
  description: string;
  url: string;
  x: number; // map-space top-left x
  y: number; // map-space top-left y
  w: number;
  h: number;
}

const LOCATIONS: ValleyLocation[] = [
  { id: 'volcano-escape',  name: 'Volcano',     description: 'Volcano Run',  url: volcanoIcon,  x: 178,  y: 17,   w: 484, h: 475 },
  { id: 'dino-dungeon',    name: 'Deep Cave',   description: 'Dino Dungeon', url: dungeonIcon,  x: 1380, y: 166,  w: 402, h: 300 },
  { id: 'spell-dino',      name: 'Chalkboard',  description: 'Spell Dino',   url: spellIcon,    x: 882,  y: 756,  w: 328, h: 272 },
  { id: 'egg-hunt',        name: 'Nest',        description: 'Egg Hunt',     url: eggIcon,      x: 370,  y: 1256, w: 318, h: 266 },
  { id: 'collection',      name: 'Museum',      description: 'Dino Museum',  url: museumIcon,   x: 1724, y: 997,  w: 310, h: 350 },
  { id: 'dino-match',      name: 'Fossil Cave', description: 'Dino Match',   url: boneCaveIcon, x: 2615, y: 466,  w: 318, h: 320 },
  { id: 'jungle-explorer', name: 'Jungle',      description: 'Jungle Find',  url: jungleIcon,   x: 2970, y: 1107, w: 383, h: 328 },
];

// map-space spawn point — open area near the map center-bottom
const SPAWN = { x: 1800, y: 1480 };
const POS_KEY = 'valleyMapPos';

// Quill NPC in map-space
const QUEST_GIVER = {
  x: 2250,
  y: 1400,
  name: 'Quill',
};

const WALK_SPEED = 560; // map pixels per second (~235 screen px/s at ZOOM=0.42)
const ARRIVE_DIST = 14;
const ENTER_DIST = 260; // close enough (in map pixels) to trigger a game on tap
const LOCATION_HIT_PAD = 24; // extra pixels around the location bbox for tap generosity

const imageCache = new Map<string, HTMLImageElement>();
function loadUrl(url: string): HTMLImageElement {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return img;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function loadPlayerPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(profileKey(POS_KEY));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return {
          x: clamp(parsed.x, 20, MAP_W - 20),
          y: clamp(parsed.y, 20, MAP_H - 20),
        };
      }
    }
  } catch {}
  return { ...SPAWN };
}

function savePlayerPos(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(profileKey(POS_KEY), JSON.stringify(pos));
  } catch {}
}

// Camera: top-left of viewport in map-space. Centers on the player, clamped to
// the map. When the map is larger than the viewport (it is, in both axes here),
// this gives smooth scrolling that kicks in as the player nears any edge.
function computeCamera(player: { x: number; y: number }): { camX: number; camY: number } {
  const camX = clamp(player.x - VIEW_MAP_W / 2, 0, Math.max(0, MAP_W - VIEW_MAP_W));
  const camY = clamp(player.y - VIEW_MAP_H / 2, 0, Math.max(0, MAP_H - VIEW_MAP_H));
  return { camX, camY };
}

export function Valley({
  onSelectGame,
  onOpenMyDino,
  onOpenQuestGiver,
}: {
  onSelectGame: (id: GameId) => void;
  onOpenMyDino?: () => void;
  onOpenQuestGiver?: () => void;
}) {
  const avatar = getAvatar();
  const stateRef = useRef({
    player: loadPlayerPos(),
    target: null as { x: number; y: number; locationId?: LocationId } | null,
    facing: 'down' as WalkDirection,
    moving: false,
    hoverLocation: null as LocationId | null,
    time: 0,
    myDinoBtn: null as { x: number; y: number; w: number; h: number } | null,
    hoverQuestGiver: false,
    camX: 0,
    camY: 0,
  });

  const { canvasRef } = useGameCanvas({
    width: W,
    height: H,
    title: 'Dino Valley',
    onDraw(ctx, mouse, dt) {
      const s = stateRef.current;
      s.time = mouse.time;

      // walk toward target (map-space)
      if (s.target) {
        const dx = s.target.x - s.player.x;
        const dy = s.target.y - s.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > ARRIVE_DIST) {
          const step = Math.min(WALK_SPEED * dt, dist);
          s.player.x += (dx / dist) * step;
          s.player.y += (dy / dist) * step;
          if (Math.abs(dx) > 0.5) s.facing = dx > 0 ? 'right' : 'left';
          s.moving = true;
        } else {
          s.player.x = s.target.x;
          s.player.y = s.target.y;
          s.moving = false;
          const targetLocId = s.target.locationId;
          s.target = null;
          savePlayerPos(s.player);
          if (targetLocId) {
            playPop();
            onSelectGame(targetLocId);
          }
        }
      } else {
        s.moving = false;
      }

      // update camera to follow the player
      const { camX, camY } = computeCamera(s.player);
      s.camX = camX;
      s.camY = camY;

      // mouse position in map-space (viewport is zoomed)
      const mmx = mouse.mouseX / ZOOM + camX;
      const mmy = mouse.mouseY / ZOOM + camY;

      s.hoverLocation = null;
      for (const loc of LOCATIONS) {
        if (
          mmx >= loc.x - LOCATION_HIT_PAD && mmx <= loc.x + loc.w + LOCATION_HIT_PAD &&
          mmy >= loc.y - LOCATION_HIT_PAD && mmy <= loc.y + loc.h + LOCATION_HIT_PAD
        ) {
          s.hoverLocation = loc.id;
          break;
        }
      }
      s.hoverQuestGiver = distance({ x: mmx, y: mmy }, QUEST_GIVER) < 70;

      // --- background: dino-map image, drawn at ZOOM scale ---
      const mapImg = loadUrl(dinoMapUrl);
      if (mapImg.complete && mapImg.naturalWidth > 0) {
        ctx.drawImage(mapImg, -camX * ZOOM, -camY * ZOOM, MAP_W * ZOOM, MAP_H * ZOOM);
      } else {
        ctx.fillStyle = '#86C558';
        ctx.fillRect(0, 0, W, H);
      }

      // --- title banner (screen-space) ---
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 110, 10, 220, 36, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.font = 'bold 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('Dino Valley', W / 2, 36);
      ctx.fillText('Dino Valley', W / 2, 36);
      ctx.restore();

      // --- y-sorted world entities ---
      const activeQuest = getActiveQuest();
      const questDone = completedToday();
      const hasQuestAvailable = !questDone && !activeQuest;

      type Drawable =
        | { kind: 'location'; loc: ValleyLocation; y: number }
        | { kind: 'player'; y: number }
        | { kind: 'questGiver'; y: number };

      const drawables: Drawable[] = [];
      for (const loc of LOCATIONS) drawables.push({ kind: 'location', loc, y: loc.y + loc.h });
      drawables.push({ kind: 'player', y: s.player.y });
      drawables.push({ kind: 'questGiver', y: QUEST_GIVER.y + 50 });
      drawables.sort((a, b) => a.y - b.y);

      for (const d of drawables) {
        if (d.kind === 'location') {
          drawLocation(ctx, d.loc, s.hoverLocation === d.loc.id, mouse.time, camX, camY);
        } else if (d.kind === 'player') {
          drawAvatar(ctx, s, avatar, mouse.time);
        } else {
          drawQuestGiver(ctx, s.hoverQuestGiver, mouse.time, hasQuestAvailable, !!activeQuest, camX, camY);
        }
      }

      // --- active quest banner (screen-space, bottom) ---
      if (activeQuest) {
        const quest = getQuestById(activeQuest.id);
        if (quest) {
          const step = quest.steps[activeQuest.stepIndex];
          const msg = step
            ? `Quest: ${quest.title} · step ${activeQuest.stepIndex + 1}/${quest.steps.length}: ${step.callToAction}`
            : `Quest: ${quest.title}`;
          ctx.save();
          ctx.font = 'bold 14px Fredoka, sans-serif';
          const textW = ctx.measureText(msg).width;
          const bannerW = Math.min(W - 40, textW + 36);
          const bannerX = (W - bannerW) / 2;
          const bannerY = H - 76;
          ctx.fillStyle = 'rgba(62, 39, 35, 0.88)';
          ctx.strokeStyle = 'rgba(255,213,79,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bannerX, bannerY, bannerW, 26, 13);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFE0B2';
          ctx.textAlign = 'center';
          ctx.fillText(msg, W / 2, bannerY + 18);
          ctx.restore();
        }
      }

      // --- footer: collection count (screen-space) ---
      const slots = getAllSlots();
      const collected = getCollectionCount();
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(14, H - 42, 220, 28, 10);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🦖 ${collected}/${slots.length} dinos discovered`, 24, H - 22);
      ctx.restore();

      // --- My Dino button (top-right) ---
      if (avatar) {
        const stickers = getEarnedStickerCount();
        const stage = getGrowthStage(stickers);
        const btnW = 88;
        const btnH = 88;
        const btnX = W - btnW - 14;
        const btnY = 56;
        const btnHover =
          mouse.mouseX >= btnX && mouse.mouseX <= btnX + btnW &&
          mouse.mouseY >= btnY && mouse.mouseY <= btnY + btnH;
        s.myDinoBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.save();
        ctx.fillStyle = btnHover ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)';
        ctx.shadowColor = btnHover ? 'rgba(255,255,255,0.6)' : 'transparent';
        ctx.shadowBlur = btnHover ? 14 : 0;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 14);
        ctx.fill();
        ctx.restore();

        drawAvatarSprite(
          ctx,
          btnX + btnW / 2,
          btnY + btnH / 2 - 4,
          40,
          avatar.species,
          stage.index,
        );

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = 'bold 11px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stage.name, btnX + btnW / 2, btnY + btnH - 6);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 13px Fredoka, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Playing as: ${getActiveProfile()}`, W - 16, H - 22);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap a place to visit it!', W / 2, H - 22);

      drawCustomCursor(ctx, mouse.mouseX, mouse.mouseY, !mouse.isTouch, mouse.mouseDown);
    },
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      let clientX: number, clientY: number;
      if ('changedTouches' in e) {
        if (e.changedTouches.length === 0) return;
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = (clientX - rect.left) * (W / rect.width);
      const sy = (clientY - rect.top) * (H / rect.height);
      const s = stateRef.current;

      // My Dino button (screen-space)
      const md = s.myDinoBtn;
      if (md && sx >= md.x && sx <= md.x + md.w && sy >= md.y && sy <= md.y + md.h) {
        playPop();
        onOpenMyDino?.();
        return;
      }

      // convert to map-space for everything else (viewport is zoomed)
      const mx = sx / ZOOM + s.camX;
      const my = sy / ZOOM + s.camY;

      // Quest Giver tap (map-space)
      if (distance({ x: mx, y: my }, QUEST_GIVER) < 70) {
        playPop();
        onOpenQuestGiver?.();
        return;
      }

      // location hit (map-space bbox + generous pad)
      for (const loc of LOCATIONS) {
        if (
          mx >= loc.x - LOCATION_HIT_PAD && mx <= loc.x + loc.w + LOCATION_HIT_PAD &&
          my >= loc.y - LOCATION_HIT_PAD && my <= loc.y + loc.h + LOCATION_HIT_PAD
        ) {
          const center = { x: loc.x + loc.w / 2, y: loc.y + loc.h / 2 };
          if (distance(s.player, center) < ENTER_DIST) {
            playPop();
            onSelectGame(loc.id);
          } else {
            playStep();
            // walk to just below the icon's bottom edge so the sprite doesn't overlap the art
            s.target = { x: center.x, y: loc.y + loc.h + 30, locationId: loc.id };
          }
          return;
        }
      }

      // empty tap — move toward that spot (clamped to the map)
      s.target = {
        x: clamp(mx, 20, MAP_W - 20),
        y: clamp(my, 20, MAP_H - 20),
      };
      playStep();
    },
    [onSelectGame, onOpenMyDino, onOpenQuestGiver],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="application"
      aria-label="Dino Valley, walk around the valley and tap a place to visit"
      style={{ cursor: 'none', borderRadius: 16, display: 'block', width: '100%', maxWidth: W }}
    />
  );
}

function drawLocation(
  ctx: CanvasRenderingContext2D,
  loc: ValleyLocation,
  hovered: boolean,
  _time: number,
  camX: number,
  camY: number,
) {
  const img = loadUrl(loc.url);
  if (!img.complete || img.naturalWidth === 0) return;
  // on hover, scale up ~8% around the icon's center and brighten.
  const scale = hovered ? 1.08 : 1;
  const baseW = loc.w * ZOOM;
  const baseH = loc.h * ZOOM;
  const sw = baseW * scale;
  const sh = baseH * scale;
  const cx = (loc.x - camX + loc.w / 2) * ZOOM;
  const cyTop = (loc.y - camY) * ZOOM;
  const sx = cx - sw / 2;
  const sy = cyTop - (sh - baseH) / 2;

  ctx.save();
  if (hovered) {
    ctx.shadowColor = 'rgba(255,235,150,0.95)';
    ctx.shadowBlur = 26;
    ctx.filter = 'brightness(1.12)';
  }
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.restore();

  const labelY = sy - 8;

  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 14px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText(loc.name, cx, labelY);
  ctx.fillText(loc.name, cx, labelY);
  ctx.restore();

  if (hovered) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(cx - 64, sy + sh + 4, 128, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loc.description, cx, sy + sh + 19);
    ctx.restore();
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  s: {
    player: { x: number; y: number };
    facing: WalkDirection;
    moving: boolean;
    target: { x: number; y: number; locationId?: LocationId } | null;
    camX: number;
    camY: number;
  },
  avatar: ReturnType<typeof getAvatar>,
  time: number,
) {
  // target ring (at tap destination)
  if (s.target) {
    const tx = (s.target.x - s.camX) * ZOOM;
    const ty = (s.target.y - s.camY) * ZOOM;
    ctx.save();
    const pulse = 0.5 + Math.sin(time * 5) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const species = avatar?.species ?? 'rex';
  const stage = getGrowthStage(getEarnedStickerCount());
  const isEgg = stage.index <= 3;
  const size = isEgg ? 30 : 38;
  const bob = isEgg
    ? Math.sin(time * 1.5) * 1.2
    : s.moving ? Math.sin(time * 10) * 4 : Math.sin(time * 2.5) * 2;
  const facingLeft = !isEgg && s.facing === 'left';
  drawAvatarSprite(
    ctx,
    (s.player.x - s.camX) * ZOOM,
    (s.player.y - s.camY) * ZOOM + bob,
    size,
    species,
    stage.index,
    facingLeft,
  );
}

function drawQuestGiver(
  ctx: CanvasRenderingContext2D,
  hovered: boolean,
  time: number,
  hasQuestAvailable: boolean,
  hasActiveQuest: boolean,
  camX: number,
  camY: number,
) {
  const x = (QUEST_GIVER.x - camX) * ZOOM;
  const y = (QUEST_GIVER.y - camY) * ZOOM;
  const bob = Math.sin(time * 1.2) * 3;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 42, 28, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = getQuillSpriteImage();
  if (img.complete && img.naturalWidth > 0) {
    const spriteH = 88;
    const aspect = img.naturalWidth / img.naturalHeight;
    const spriteW = spriteH * aspect;
    ctx.save();
    if (hovered || hasQuestAvailable) {
      ctx.shadowColor = hasQuestAvailable ? 'rgba(255,213,79,0.95)' : 'rgba(255,255,255,0.75)';
      ctx.shadowBlur = hasQuestAvailable ? 20 + Math.sin(time * 4) * 4 : 14;
    }
    ctx.drawImage(img, x - spriteW / 2, y - spriteH / 2 + bob, spriteW, spriteH);
    ctx.restore();
  }

  // label
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 13px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText(QUEST_GIVER.name, x, y - 54 + bob);
  ctx.fillText(QUEST_GIVER.name, x, y - 54 + bob);
  ctx.restore();

  // callout
  if (hasQuestAvailable) {
    const pulse = 1 + Math.sin(time * 5) * 0.12;
    ctx.save();
    ctx.translate(x + 26, y - 36 + bob);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3E2723';
    ctx.font = 'bold 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
  } else if (hasActiveQuest) {
    ctx.save();
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x + 26, y - 36 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

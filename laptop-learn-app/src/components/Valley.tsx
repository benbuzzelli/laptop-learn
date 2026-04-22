import { useRef, useCallback } from 'react';
import { drawDino, drawCustomCursor } from '../games/shared/draw';
import type { WalkDirection } from '../games/shared/draw';
import { getGameIconImage } from '../games/shared/dino-svgs';
import { useGameCanvas } from '../games/shared/useGameCanvas';
import { playStep, playPop } from '../games/shared/audio';
import { getAvatar } from '../games/shared/avatar';
import { getActiveProfile, profileKey } from '../games/shared/profile';
import { getCollectionCount, getAllSlots } from '../games/shared/collection';
import type { GameId } from '../games/shared/types';

const W = 800;
const H = 600;
const TILE = 50;
const COLS = Math.ceil(W / TILE);
const ROWS = Math.ceil(H / TILE);

type LocationId = GameId;

interface ValleyLocation {
  id: LocationId;
  name: string;
  x: number;
  y: number;
  icon: string;
  color: string;
  description: string;
}

function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function snapToTile(x: number, y: number): { x: number; y: number } {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / TILE)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / TILE)));
  return tileCenter(col, row);
}

// locations defined by tile (col, row) — always on grid
const LOCATIONS: ValleyLocation[] = [
  { id: 'volcano-escape', name: 'Volcano',    ...tileCenter(2, 3),  icon: '🌋', color: '#FF9800', description: 'Volcano Run' },
  { id: 'egg-hunt',       name: 'Nest',       ...tileCenter(8, 2),  icon: '🥚', color: '#FF6B6B', description: 'Egg Hunt' },
  { id: 'spell-dino',     name: 'Chalkboard', ...tileCenter(13, 3), icon: '🔤', color: '#FFA726', description: 'Spell Dino' },
  { id: 'dino-match',     name: 'Fossil Cave',...tileCenter(2, 7),  icon: '🦴', color: '#7E57C2', description: 'Dino Match' },
  { id: 'collection',     name: 'Museum',     ...tileCenter(8, 6),  icon: '🏛️', color: '#FFD700', description: 'Dino Museum' },
  { id: 'jungle-explorer',name: 'Jungle',     ...tileCenter(13, 7), icon: '🌴', color: '#2E7D32', description: 'Jungle Find' },
  { id: 'dino-dungeon',   name: 'Deep Cave',  ...tileCenter(8, 9),  icon: '🏰', color: '#795548', description: 'Dino Dungeon' },
];

const SPAWN = tileCenter(4, 9);
const POS_KEY = 'valleyPos';

function loadPlayerPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(profileKey(POS_KEY));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return { x: parsed.x, y: parsed.y };
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

const WALK_SPEED = 260; // px/sec
const ARRIVE_DIST = 22;
const ENTER_DIST = 55;
const LOCATION_HIT_R = 80;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}


export function Valley({ onSelectGame }: { onSelectGame: (id: GameId) => void }) {
  const avatar = getAvatar();
  const stateRef = useRef({
    player: loadPlayerPos(),
    target: null as { x: number; y: number; locationId?: LocationId } | null,
    facing: 'down' as WalkDirection,
    moving: false,
    hoverLocation: null as LocationId | null,
    time: 0,
  });

  const { canvasRef } = useGameCanvas({
    width: W,
    height: H,
    title: 'Dino Valley',
    onDraw(ctx, mouse, dt) {
      const s = stateRef.current;
      s.time = mouse.time;

      // update walk position
      if (s.target) {
        const dx = s.target.x - s.player.x;
        const dy = s.target.y - s.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > ARRIVE_DIST) {
          const step = Math.min(WALK_SPEED * dt, dist);
          s.player.x += (dx / dist) * step;
          s.player.y += (dy / dist) * step;
          // only update horizontal facing — vertical moves keep prior side
          if (Math.abs(dx) > 0.5) {
            s.facing = dx > 0 ? 'right' : 'left';
          }
          s.moving = true;
        } else {
          // snap exactly onto the tile center
          s.player.x = s.target.x;
          s.player.y = s.target.y;
          s.moving = false;
          const targetLocId = s.target.locationId;
          s.target = null;
          savePlayerPos(s.player);
          if (targetLocId) {
            // arrived at a location — enter its game
            playPop();
            onSelectGame(targetLocId);
          }
        }
      } else {
        s.moving = false;
      }

      // update hover location
      s.hoverLocation = null;
      for (const loc of LOCATIONS) {
        if (distance({ x: mouse.mouseX, y: mouse.mouseY }, { x: loc.x, y: loc.y }) < 48) {
          s.hoverLocation = loc.id;
          break;
        }
      }

      // --- BACKGROUND: alternating grass tile grid ---
      const TILE_LIGHT = '#86C558';
      const TILE_DARK = '#6FAF46';
      const TILE_HOVER = 'rgba(255,255,220,0.28)';

      const hoverCol = Math.floor(mouse.mouseX / TILE);
      const hoverRow = Math.floor(mouse.mouseY / TILE);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? TILE_LIGHT : TILE_DARK;
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }

      // hover highlight
      if (
        hoverCol >= 0 && hoverCol < COLS &&
        hoverRow >= 0 && hoverRow < ROWS
      ) {
        ctx.fillStyle = TILE_HOVER;
        ctx.fillRect(hoverCol * TILE, hoverRow * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hoverCol * TILE + 1, hoverRow * TILE + 1, TILE - 2, TILE - 2);
      }

      // distant mountains silhouette (overlay on top row of tiles for depth)
      ctx.save();
      ctx.fillStyle = 'rgba(70,110,80,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 95);
      ctx.lineTo(90, 45);
      ctx.lineTo(170, 80);
      ctx.lineTo(260, 35);
      ctx.lineTo(350, 75);
      ctx.lineTo(460, 40);
      ctx.lineTo(560, 72);
      ctx.lineTo(660, 40);
      ctx.lineTo(760, 70);
      ctx.lineTo(W, 55);
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // dotted path lines connecting locations to center (subtle)
      const hub = LOCATIONS.find((l) => l.id === 'collection')!;
      ctx.save();
      ctx.setLineDash([4, 10]);
      ctx.strokeStyle = 'rgba(120,90,60,0.35)';
      ctx.lineWidth = 3;
      for (const loc of LOCATIONS) {
        if (loc.id === 'collection') continue;
        ctx.beginPath();
        ctx.moveTo(loc.x, loc.y);
        ctx.lineTo(hub.x, hub.y);
        ctx.stroke();
      }
      ctx.restore();

      // title banner
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

      // --- LOCATION MARKERS ---
      // collect drawables and sort by Y so closer (lower) ones render on top
      type Drawable =
        | { kind: 'location'; loc: ValleyLocation; y: number }
        | { kind: 'player'; y: number };

      const drawables: Drawable[] = [];
      for (const loc of LOCATIONS) drawables.push({ kind: 'location', loc, y: loc.y + 30 });
      drawables.push({ kind: 'player', y: s.player.y + 15 });
      drawables.sort((a, b) => a.y - b.y);

      for (const d of drawables) {
        if (d.kind === 'location') {
          drawLocation(ctx, d.loc, s.hoverLocation === d.loc.id, mouse.time);
        } else {
          drawAvatar(ctx, s, avatar, mouse.time);
        }
      }

      // footer — profile + collection count
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

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = 'bold 13px Fredoka, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Playing as: ${getActiveProfile()}`, W - 16, H - 22);

      // help text
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
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
      const mx = (clientX - rect.left) * (W / rect.width);
      const my = (clientY - rect.top) * (H / rect.height);
      const s = stateRef.current;

      // check location hits first — accept radius OR same tile OR the tile directly above
      const clickCol = Math.floor(mx / TILE);
      const clickRow = Math.floor(my / TILE);
      for (const loc of LOCATIONS) {
        const locCol = Math.round((loc.x - TILE / 2) / TILE);
        const locRow = Math.round((loc.y - TILE / 2) / TILE);
        const sameTile = clickCol === locCol && clickRow === locRow;
        const tileAbove = clickCol === locCol && clickRow === locRow - 1;
        const inRadius = distance({ x: mx, y: my }, { x: loc.x, y: loc.y }) < LOCATION_HIT_R;
        if (sameTile || tileAbove || inRadius) {
          if (distance(s.player, { x: loc.x, y: loc.y }) < ENTER_DIST) {
            playPop();
            onSelectGame(loc.id);
          } else {
            playStep();
            s.target = { x: loc.x, y: loc.y, locationId: loc.id };
          }
          return;
        }
      }

      // empty tap — snap to the tile center the click landed in
      const snapped = snapToTile(mx, my);
      const clampedY = Math.max(TILE + TILE / 2, Math.min(H - TILE - TILE / 2, snapped.y));
      s.target = { x: snapped.x, y: clampedY };
    },
    [onSelectGame],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="application"
      aria-label="Dino Valley - walk around the valley and tap a place to visit"
      style={{ cursor: 'none', borderRadius: 16, display: 'block', width: '100%', maxWidth: W }}
    />
  );
}

function drawLocation(
  ctx: CanvasRenderingContext2D,
  loc: ValleyLocation,
  hovered: boolean,
  time: number,
) {
  const bob = Math.sin(time * 1.5 + loc.x * 0.01) * 3;
  const iconImg = getGameIconImage(loc.id);
  const hasSprite = iconImg && iconImg.complete && iconImg.naturalWidth > 0;

  // base shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(loc.x, loc.y + 36, 32, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (hasSprite) {
    // draw the sprite art directly (no backing disc needed)
    const spriteH = 90;
    const aspect = iconImg.naturalWidth / iconImg.naturalHeight;
    const spriteW = spriteH * aspect;
    ctx.save();
    if (hovered) {
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 16;
    }
    ctx.drawImage(
      iconImg,
      loc.x - spriteW / 2,
      loc.y + bob - spriteH / 2 + 6,
      spriteW,
      spriteH,
    );
    ctx.restore();
  } else {
    // platform disc fallback + emoji (e.g. Volcano without a PNG)
    ctx.save();
    ctx.fillStyle = loc.color;
    ctx.shadowColor = hovered ? loc.color : 'transparent';
    ctx.shadowBlur = hovered ? 18 : 0;
    ctx.beginPath();
    ctx.arc(loc.x, loc.y + 4 + bob, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = hovered ? '#fff' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.beginPath();
    ctx.arc(loc.x, loc.y + 4 + bob, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.font = '38px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(loc.icon, loc.x, loc.y + 5 + bob);
    ctx.restore();
  }

  // label
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 14px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText(loc.name, loc.x, loc.y - 36 + bob);
  ctx.fillText(loc.name, loc.x, loc.y - 36 + bob);
  ctx.restore();

  // subtitle on hover
  if (hovered) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(loc.x - 60, loc.y + 48, 120, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loc.description, loc.x, loc.y + 63);
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
  },
  avatar: ReturnType<typeof getAvatar>,
  time: number,
) {
  // target indicator (ring at destination)
  if (s.target) {
    ctx.save();
    const pulse = 0.5 + Math.sin(time * 5) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(s.target.x, s.target.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const color = avatar?.color ?? '#4CAF50';
  const species = avatar?.species ?? 'rex';
  const size = 40;
  const bob = s.moving ? Math.sin(time * 10) * 4 : Math.sin(time * 2.5) * 2;
  const facingLeft = s.facing === 'left';
  // drawDino's feet sit at y + size * 0.84; align them near the tile's bottom with a slight lift
  const feetOffset = TILE / 2 - size * 0.84 - 8;
  drawDino(ctx, s.player.x, s.player.y + feetOffset + bob, size, color, facingLeft, species, 0, 0);
}

import { useRef, useCallback } from 'react';
import { drawDino, drawWalkDino, drawCustomCursor, drawBackButton, drawStickerPopup, drawScore, drawEasyModeButton } from '../shared/draw';
import type { DinoSpecies, WalkDirection } from '../shared/draw';
import { getWallTileImage, getGrassTileImage, getFinishImage, getArrowImage } from '../shared/dino-svgs';
import { spawnCelebration, updateParticles, drawParticles } from '../shared/particles';
import { playStep, playCelebration, playSticker, playPop, playSuccess } from '../shared/audio';
import { earnSticker, trackProgress } from '../shared/stickers';
import { isEasyMode, toggleEasyMode } from '../shared/easyMode';
import { getDifficulty } from '../shared/difficulty';
import type { Difficulty } from '../shared/difficulty';
import { trackDinoEncounter } from '../shared/collection';
import { useGameCanvas } from '../shared/useGameCanvas';
import type { Particle, Point } from '../shared/types';

const W = 800;
const H = 600;
const COLS = 15;
const ROWS = 11;
const TILE = 50;

type DungeonCell = 'empty' | 'wall';

interface Guard {
  r: number;
  c: number;
  patrolPath: { r: number; c: number }[];
  patrolIndex: number;
  patrolDir: 1 | -1;
  facing: 'up' | 'down' | 'left' | 'right';
  moveTimer: number;
  alertTimer: number;
  species: DinoSpecies;
  color: string;
}

interface Treasure {
  r: number;
  c: number;
  collected: boolean;
  type: 'gem' | 'fossil' | 'egg';
  bobOffset: number;
}

interface DungeonRoom {
  grid: DungeonCell[][];
  guards: Guard[];
  treasures: Treasure[];
  startR: number;
  startC: number;
  exitR: number;
  exitC: number;
}

const GUARD_POOL: { species: DinoSpecies; color: string }[] = [
  { species: 'raptor', color: '#2196F3' },
  { species: 'rex', color: '#F44336' },
  { species: 'spino', color: '#3F51B5' },
  { species: 'ankylo', color: '#009688' },
];

const TREASURE_COLORS: Record<string, string> = {
  gem: '#E040FB',
  fossil: '#BCAAA4',
  egg: '#FFD700',
};

const TREASURE_EMOJIS: Record<string, string> = {
  gem: '💎',
  fossil: '🦴',
  egg: '🥚',
};

function generateRoom(level: number, difficulty: Difficulty = 'medium'): DungeonRoom {
  const grid: DungeonCell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 'wall' as DungeonCell),
  );

  // maze generation — iterative backtracking
  const visited = new Set<string>();
  const stack: { r: number; c: number }[] = [];
  const start = { r: 1, c: 1 };
  visited.add(`${start.r},${start.c}`);
  grid[start.r][start.c] = 'empty';
  stack.push(start);

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors: { r: number; c: number; wr: number; wc: number }[] = [];

    for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && !visited.has(`${nr},${nc}`)) {
        neighbors.push({ r: nr, c: nc, wr: cur.r + dr / 2, wc: cur.c + dc / 2 });
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited.add(`${next.r},${next.c}`);
      grid[next.r][next.c] = 'empty';
      grid[next.wr][next.wc] = 'empty';
      stack.push({ r: next.r, c: next.c });
    }
  }

  // widen passages for toddler friendliness
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] === 'wall' && Math.random() < 0.45) {
        let adj = 0;
        if (r > 0 && grid[r - 1][c] === 'empty') adj++;
        if (r < ROWS - 1 && grid[r + 1][c] === 'empty') adj++;
        if (c > 0 && grid[r][c - 1] === 'empty') adj++;
        if (c < COLS - 1 && grid[r][c + 1] === 'empty') adj++;
        if (adj >= 2) grid[r][c] = 'empty';
      }
    }
  }

  // find reachable cells via flood fill
  const reachable = new Set<string>();
  const floodStack = [{ r: 1, c: 1 }];
  reachable.add('1,1');
  while (floodStack.length > 0) {
    const { r, c } = floodStack.pop()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === 'empty' && !reachable.has(key)) {
        reachable.add(key);
        floodStack.push({ r: nr, c: nc });
      }
    }
  }

  const reachableCells = [...reachable].map((k) => {
    const [r, c] = k.split(',').map(Number);
    return { r, c };
  });

  // find exit — farthest from start
  let maxDist = 0;
  let exitR = ROWS - 2;
  let exitC = COLS - 2;
  for (const cell of reachableCells) {
    const dist = Math.abs(cell.r - 1) + Math.abs(cell.c - 1);
    if (dist > maxDist) {
      maxDist = dist;
      exitR = cell.r;
      exitC = cell.c;
    }
  }

  // place treasures on dead-ends and far cells
  const deadEnds = reachableCells.filter(({ r, c }) => {
    if (r === 1 && c === 1) return false;
    if (r === exitR && c === exitC) return false;
    let adj = 0;
    if (r > 0 && grid[r - 1][c] === 'empty') adj++;
    if (r < ROWS - 1 && grid[r + 1][c] === 'empty') adj++;
    if (c > 0 && grid[r][c - 1] === 'empty') adj++;
    if (c < COLS - 1 && grid[r][c + 1] === 'empty') adj++;
    return adj === 1;
  });

  const treasureTypes: Treasure['type'][] = ['gem', 'fossil', 'egg'];
  const treasureCount = Math.min(2 + Math.floor(level / 2), 5, deadEnds.length);
  const shuffled = deadEnds.sort(() => Math.random() - 0.5);
  const treasures: Treasure[] = shuffled.slice(0, treasureCount).map((pos, i) => ({
    r: pos.r,
    c: pos.c,
    collected: false,
    type: treasureTypes[i % treasureTypes.length],
    bobOffset: Math.random() * Math.PI * 2,
  }));

  // place guards on corridors (not on start, exit, or treasure cells)
  const baseGuards = Math.floor(level / 2);
  const diffBonus = difficulty === 'hard' ? 2 : difficulty === 'easy' ? -1 : 0;
  const guardCount = Math.max(0, Math.min(baseGuards + diffBonus, 6));
  const occupied = new Set<string>();
  occupied.add('1,1');
  occupied.add(`${exitR},${exitC}`);
  for (const t of treasures) occupied.add(`${t.r},${t.c}`);

  const corridorCells = reachableCells.filter(({ r, c }) => {
    if (occupied.has(`${r},${c}`)) return false;
    let adj = 0;
    if (r > 0 && grid[r - 1][c] === 'empty') adj++;
    if (r < ROWS - 1 && grid[r + 1][c] === 'empty') adj++;
    if (c > 0 && grid[r][c - 1] === 'empty') adj++;
    if (c < COLS - 1 && grid[r][c + 1] === 'empty') adj++;
    return adj >= 2;
  });

  const guards: Guard[] = [];
  const guardCandidates = corridorCells.sort(() => Math.random() - 0.5);

  for (let g = 0; g < guardCount && g < guardCandidates.length; g++) {
    const pos = guardCandidates[g];
    const patrol = buildPatrol(grid, pos.r, pos.c);
    const guardType = GUARD_POOL[g % GUARD_POOL.length];
    guards.push({
      r: pos.r,
      c: pos.c,
      patrolPath: patrol,
      patrolIndex: 0,
      patrolDir: 1,
      facing: 'down',
      moveTimer: 0,
      alertTimer: 0,
      species: guardType.species,
      color: guardType.color,
    });
  }

  return { grid, guards, treasures, startR: 1, startC: 1, exitR, exitC };
}

function buildPatrol(grid: DungeonCell[][], startR: number, startC: number): { r: number; c: number }[] {
  const path: { r: number; c: number }[] = [{ r: startR, c: startC }];
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // walk in a random valid direction for 2-4 steps
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  const steps = 2 + Math.floor(Math.random() * 3);

  let cr = startR;
  let cc = startC;
  for (let i = 0; i < steps; i++) {
    const nr = cr + dir[0];
    const nc = cc + dir[1];
    if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && grid[nr][nc] === 'empty') {
      cr = nr;
      cc = nc;
      path.push({ r: nr, c: nc });
    } else {
      break;
    }
  }

  return path;
}

function getFacing(from: { r: number; c: number }, to: { r: number; c: number }): Guard['facing'] {
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  if (Math.abs(dc) > Math.abs(dr)) return dc > 0 ? 'right' : 'left';
  return dr > 0 ? 'down' : 'up';
}

function visionRange(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 2;
  if (difficulty === 'hard') return 4;
  return 3;
}

function guardMoveInterval(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 1.2;
  if (difficulty === 'hard') return 0.5;
  return 0.8;
}

function canGuardSee(guard: Guard, pr: number, pc: number, grid: DungeonCell[][], difficulty: Difficulty): boolean {
  if (guard.alertTimer > 0) return false;
  const range = visionRange(difficulty);
  let dr = 0;
  let dc = 0;
  if (guard.facing === 'up') dr = -1;
  else if (guard.facing === 'down') dr = 1;
  else if (guard.facing === 'left') dc = -1;
  else dc = 1;

  for (let i = 1; i <= range; i++) {
    const cr = guard.r + dr * i;
    const cc = guard.c + dc * i;
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) break;
    if (grid[cr][cc] === 'wall') break;
    if (cr === pr && cc === pc) return true;
    // peripheral vision — 1 tile wide
    if (dr !== 0) {
      if ((cc - 1 === pc || cc + 1 === pc) && cr === pr) return true;
    } else {
      if ((cr - 1 === pr || cr + 1 === pr) && cc === pc) return true;
    }
  }
  return false;
}

export function DinoDungeon({ onBack }: { onBack: () => void }) {
  const stateRef = useRef({
    room: generateRoom(0, getDifficulty()),
    playerR: 1,
    playerC: 1,
    particles: [] as Particle[],
    completed: 0,
    level: 0,
    celebrating: 0,
    moveTimer: 0,
    caught: false,
    caughtTimer: 0,
    stickerPopup: '',
    stickerPopupTimer: 0,
    keysHeld: new Set<string>(),
    easyMode: isEasyMode(),
    difficulty: getDifficulty() as Difficulty,
    totalTreasures: 0,
    exitOpen: false,
    facing: 'down' as WalkDirection,
  });

  const tryMove = useCallback((dr: number, dc: number) => {
    const s = stateRef.current;
    if (s.celebrating > 0 || s.caught) return;
    const nr = s.playerR + dr;
    const nc = s.playerC + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (s.room.grid[nr][nc] === 'wall') return;

    s.playerR = nr;
    s.playerC = nc;
    s.moveTimer = 0.15;
    if (dr === -1) s.facing = 'down';
    else if (dr === 1) s.facing = 'down';
    else if (dc === -1) s.facing = 'left';
    else if (dc === 1) s.facing = 'right';
    playStep();

    // check treasure pickup
    for (const t of s.room.treasures) {
      if (!t.collected && t.r === nr && t.c === nc) {
        t.collected = true;
        s.totalTreasures++;
        playPop();
        const px = nc * TILE + TILE / 2;
        const py = nr * TILE + TILE / 2;
        s.particles.push(...spawnCelebration(px, py, 10));

        const allCollected = s.room.treasures.every((tr) => tr.collected);
        if (allCollected) {
          s.exitOpen = true;
          playSuccess();
        }
      }
    }

    // check exit
    if (nr === s.room.exitR && nc === s.room.exitC && s.exitOpen) {
      s.completed++;
      s.celebrating = 2.5;
      playCelebration();
      const px = nc * TILE + TILE / 2;
      const py = nr * TILE + TILE / 2;
      s.particles.push(...spawnCelebration(px, py, 25));
      trackDinoEncounter('raptor', 0, 'dino-dungeon');

      const total = trackProgress('dino-dungeon');
      if (total === 1) {
        earnSticker('dino-dungeon-1');
        s.stickerPopup = '🏰 First Expedition!';
        s.stickerPopupTimer = 3;
        playSticker();
      } else if (total === 3) {
        earnSticker('dino-dungeon-3');
        s.stickerPopup = '⚔️ Dungeon Master!';
        s.stickerPopupTimer = 3;
        playSticker();
      }
    }
  }, []);

  const { canvasRef, safeTimeout } = useGameCanvas({
    width: W,
    height: H,
    title: 'Dino Dungeon',
    onKeyDown(e) {
      const s = stateRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        s.keysHeld.add(e.key);
        if (s.moveTimer <= 0) {
          const dirs: Record<string, [number, number]> = {
            ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
          };
          const [dr, dc] = dirs[e.key];
          tryMove(dr, dc);
        }
      }
    },
    onKeyUp(e) {
      stateRef.current.keysHeld.delete(e.key);
    },
    onDraw(ctx, mouse, dt) {
      const s = stateRef.current;

      if (s.stickerPopupTimer > 0) s.stickerPopupTimer -= dt;
      if (s.moveTimer > 0) s.moveTimer -= dt;
      s.particles = updateParticles(s.particles, dt);

      // handle held keys
      if (s.moveTimer <= 0 && !s.caught) {
        const dirs: Record<string, [number, number]> = {
          ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        };
        for (const key of s.keysHeld) {
          if (dirs[key]) {
            tryMove(dirs[key][0], dirs[key][1]);
            break;
          }
        }
      }

      // update guards
      if (!s.caught && s.celebrating <= 0) {
        for (const guard of s.room.guards) {
          if (guard.alertTimer > 0) {
            guard.alertTimer -= dt;
            continue;
          }
          guard.moveTimer -= dt;
          if (guard.moveTimer <= 0) {
            guard.moveTimer = guardMoveInterval(s.difficulty);
            if (guard.patrolPath.length > 1) {
              guard.patrolIndex += guard.patrolDir;
              if (guard.patrolIndex >= guard.patrolPath.length - 1) guard.patrolDir = -1;
              if (guard.patrolIndex <= 0) guard.patrolDir = 1;
              const next = guard.patrolPath[guard.patrolIndex];
              const prev = { r: guard.r, c: guard.c };
              guard.r = next.r;
              guard.c = next.c;
              guard.facing = getFacing(prev, next);
            }
          }

          // check if guard sees player
          if (canGuardSee(guard, s.playerR, s.playerC, s.room.grid, s.difficulty)) {
            s.caught = true;
            s.caughtTimer = 1.5;
            const px = s.playerC * TILE + TILE / 2;
            const py = s.playerR * TILE + TILE / 2;
            s.particles.push(...spawnCelebration(px, py, 8));
          }
        }
      }

      // caught state — return to start after delay
      if (s.caught) {
        s.caughtTimer -= dt;
        if (s.caughtTimer <= 0) {
          s.caught = false;
          s.playerR = s.room.startR;
          s.playerC = s.room.startC;
          s.facing = 'down';
        }
      }

      // celebrating — advance to next room
      if (s.celebrating > 0) {
        s.celebrating -= dt;
        if (s.celebrating <= 0) {
          s.level++;
          s.room = generateRoom(s.level, s.difficulty);
          s.playerR = s.room.startR;
          s.playerC = s.room.startC;
          s.facing = 'down';
          s.exitOpen = false;
        }
      }

      // --- RENDER ---
      const gridW = COLS * TILE;
      const offsetX = (W - gridW) / 2;

      // dark cave background
      ctx.fillStyle = '#1a0e08';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(offsetX, 0);

      // draw tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE;
          const y = r * TILE;
          if (s.room.grid[r][c] === 'wall') {
            const wallImg = getWallTileImage(r, c);
            if (wallImg.complete && wallImg.naturalWidth > 0) {
              ctx.drawImage(wallImg, x, y, TILE, TILE);
            }
          } else {
            const grassImg = getGrassTileImage(r, c);
            if (grassImg.complete && grassImg.naturalWidth > 0) {
              ctx.drawImage(grassImg, x, y, TILE, TILE);
            }
          }
        }
      }

      // darken the floor for cave feel
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);

      // lava cracks for atmosphere
      for (let i = 0; i < 8; i++) {
        const lx = ((i * 97 + 31) % (COLS * TILE));
        const ly = ((i * 73 + 47) % (ROWS * TILE));
        ctx.strokeStyle = `rgba(255,${80 + Math.sin(mouse.time * 2 + i) * 40},0,${0.15 + Math.sin(mouse.time * 3 + i * 2) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 15, ly + 8);
        ctx.lineTo(lx + 10, ly + 20);
        ctx.stroke();
      }

      // start marker
      {
        const sx = s.room.startC * TILE;
        const sy = s.room.startR * TILE;
        const pulse = 0.3 + Math.sin(mouse.time * 3) * 0.1;
        ctx.fillStyle = `rgba(100,180,255,${pulse})`;
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      }

      // exit marker
      {
        const ex = s.room.exitC * TILE;
        const ey = s.room.exitR * TILE;
        if (s.exitOpen) {
          const pulse = 0.5 + Math.sin(mouse.time * 4) * 0.3;
          ctx.fillStyle = `rgba(76,175,80,${pulse})`;
          ctx.fillRect(ex + 2, ey + 2, TILE - 4, TILE - 4);
          const finishImg = getFinishImage();
          if (finishImg.complete && finishImg.naturalWidth > 0) {
            const bounce = Math.sin(mouse.time * 4) * 3;
            ctx.drawImage(finishImg, ex + 8, ey + 5 + bounce, TILE - 16, TILE - 16);
          }
        } else {
          ctx.fillStyle = 'rgba(255,50,50,0.2)';
          ctx.fillRect(ex + 2, ey + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '20px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔒', ex + TILE / 2, ey + TILE / 2 + 7);
        }
      }

      // draw treasures
      for (const t of s.room.treasures) {
        if (t.collected) continue;
        const tx = t.c * TILE + TILE / 2;
        const ty = t.r * TILE + TILE / 2;
        const bob = Math.sin(mouse.time * 3 + t.bobOffset) * 3;

        // glow
        ctx.save();
        const glowAlpha = 0.2 + Math.sin(mouse.time * 4 + t.bobOffset) * 0.1;
        ctx.shadowColor = TREASURE_COLORS[t.type];
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255,255,255,${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // emoji
        ctx.font = '22px serif';
        ctx.textAlign = 'center';
        ctx.fillText(TREASURE_EMOJIS[t.type], tx, ty + bob + 7);
      }

      // draw guard vision cones
      for (const guard of s.room.guards) {
        if (guard.alertTimer > 0) continue;
        const range = visionRange(s.difficulty);
        let dr = 0;
        let dc = 0;
        if (guard.facing === 'up') dr = -1;
        else if (guard.facing === 'down') dr = 1;
        else if (guard.facing === 'left') dc = -1;
        else dc = 1;

        const coneAlpha = 0.08 + Math.sin(mouse.time * 2) * 0.03;

        for (let i = 1; i <= range; i++) {
          const cr = guard.r + dr * i;
          const cc = guard.c + dc * i;
          if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) break;
          if (s.room.grid[cr][cc] === 'wall') break;

          ctx.fillStyle = `rgba(255,100,100,${coneAlpha})`;
          ctx.fillRect(cc * TILE + 2, cr * TILE + 2, TILE - 4, TILE - 4);

          // peripheral
          if (dr !== 0) {
            if (cc - 1 >= 0 && s.room.grid[cr][cc - 1] === 'empty') {
              ctx.fillStyle = `rgba(255,100,100,${coneAlpha * 0.5})`;
              ctx.fillRect((cc - 1) * TILE + 2, cr * TILE + 2, TILE - 4, TILE - 4);
            }
            if (cc + 1 < COLS && s.room.grid[cr][cc + 1] === 'empty') {
              ctx.fillStyle = `rgba(255,100,100,${coneAlpha * 0.5})`;
              ctx.fillRect((cc + 1) * TILE + 2, cr * TILE + 2, TILE - 4, TILE - 4);
            }
          } else {
            if (cr - 1 >= 0 && s.room.grid[cr - 1][cc] === 'empty') {
              ctx.fillStyle = `rgba(255,100,100,${coneAlpha * 0.5})`;
              ctx.fillRect(cc * TILE + 2, (cr - 1) * TILE + 2, TILE - 4, TILE - 4);
            }
            if (cr + 1 < ROWS && s.room.grid[cr + 1][cc] === 'empty') {
              ctx.fillStyle = `rgba(255,100,100,${coneAlpha * 0.5})`;
              ctx.fillRect(cc * TILE + 2, (cr + 1) * TILE + 2, TILE - 4, TILE - 4);
            }
          }
        }
      }

      // draw guards
      for (const guard of s.room.guards) {
        const gx = guard.c * TILE + TILE / 2;
        const gy = guard.r * TILE + TILE / 2;
        const facingLeft = guard.facing === 'left';
        const guardBob = Math.sin(mouse.time * 2 + guard.r * 3) * 2;

        if (guard.alertTimer > 0) {
          // alert animation — flash
          ctx.save();
          ctx.globalAlpha = 0.5 + Math.sin(mouse.time * 10) * 0.3;
          drawDino(ctx, gx, gy + guardBob, 32, guard.color, facingLeft, guard.species);
          ctx.restore();
          // exclamation
          ctx.fillStyle = '#FF4444';
          ctx.font = 'bold 18px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', gx, gy - 22);
        } else {
          drawDino(ctx, gx, gy + guardBob, 32, guard.color, facingLeft, guard.species);
        }
      }

      // draw player
      if (!s.caught || Math.sin(mouse.time * 15) > 0) {
        const px = s.playerC * TILE + TILE / 2;
        const py = s.playerR * TILE + TILE / 2;
        drawWalkDino(ctx, px, py - 3, 30, s.facing, mouse.time);
      }

      // arrow hints for valid moves
      const dirList: [string, number, number][] = [
        ['ArrowUp', -1, 0], ['ArrowDown', 1, 0], ['ArrowLeft', 0, -1], ['ArrowRight', 0, 1],
      ];
      if (!s.caught && s.celebrating <= 0) {
        for (const [key, dr, dc] of dirList) {
          const nr = s.playerR + dr;
          const nc = s.playerC + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.room.grid[nr][nc] === 'empty') {
            const ax = nc * TILE + TILE / 2;
            const ay = nr * TILE + TILE / 2;
            const arrowImg = getArrowImage(key);
            if (arrowImg && arrowImg.complete && arrowImg.naturalWidth > 0) {
              ctx.save();
              ctx.globalAlpha = 0.25;
              const arrowSize = 20;
              ctx.drawImage(arrowImg, ax - arrowSize / 2, ay - arrowSize / 2, arrowSize, arrowSize);
              ctx.restore();
            }
          }
        }
      }

      drawParticles(ctx, s.particles);
      ctx.restore();

      // caught overlay
      if (s.caught) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgba(200,50,50,0.3)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 32px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText('Spotted! 👀', W / 2, H / 2 - 20);
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText('Spotted! 👀', W / 2, H / 2 - 20);

        ctx.font = '18px Fredoka, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('Sneaking back to start...', W / 2, H / 2 + 15);
        ctx.restore();
      }

      // celebration
      if (s.celebrating > 0 && !s.caught) {
        ctx.save();
        ctx.font = 'bold 36px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText('Room cleared! 🎉', W / 2, 50);
        ctx.shadowColor = 'rgba(255,215,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Room cleared! 🎉', W / 2, 50);
        ctx.restore();
      }

      // treasure counter
      {
        const remaining = s.room.treasures.filter((t) => !t.collected).length;
        const total = s.room.treasures.length;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 80, H - 48, 160, 28, 8);
        ctx.fill();
        ctx.fillStyle = remaining === 0 ? '#4CAF50' : '#FFD700';
        ctx.font = 'bold 14px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          remaining === 0 ? 'Exit unlocked! ⭐' : `💎 ${total - remaining}/${total} treasures`,
          W / 2,
          H - 30,
        );
      }

      // room number
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Room ${s.level + 1}`, 16, H - 10);

      drawScore(ctx, '🏰', s.completed);
      drawEasyModeButton(ctx, 100, 14, mouse.mouseX, mouse.mouseY, s.easyMode);
      drawStickerPopup(ctx, s.stickerPopup, s.stickerPopupTimer, W, H);
      drawBackButton(ctx, W - 110, 10, mouse.mouseX, mouse.mouseY);
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

      if (mx > 100 && mx < 180 && my > 14 && my < 48) {
        stateRef.current.easyMode = toggleEasyMode();
        stateRef.current.difficulty = getDifficulty();
        return;
      }
      if (mx > W - 110 && mx < W && my > 10 && my < 54) {
        onBack();
        return;
      }

      // touch movement — tap a neighboring tile to move there
      const s = stateRef.current;
      if (s.caught || s.celebrating > 0) return;
      const gridW = COLS * TILE;
      const offsetX = (W - gridW) / 2;
      const tileC = Math.floor((mx - offsetX) / TILE);
      const tileR = Math.floor(my / TILE);
      const dr = tileR - s.playerR;
      const dc = tileC - s.playerC;
      if (Math.abs(dr) + Math.abs(dc) === 1) {
        tryMove(dr, dc);
      }
    },
    [onBack, tryMove],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="application"
      aria-label="Dino Dungeon - explore the cave, collect treasure, avoid guards"
      style={{ cursor: 'none', borderRadius: 16, display: 'block', width: '100%', maxWidth: W }}
    />
  );
}

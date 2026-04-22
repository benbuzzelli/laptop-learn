import { useRef, useCallback } from 'react';
import { drawDino, drawWalkDino, drawCustomCursor, drawBackButton, drawStickerPopup, drawScore, drawEasyModeButton } from '../shared/draw';
import type { DinoSpecies, WalkDirection } from '../shared/draw';
import { getWallTileImage, getGrassTileImage, getFinishImage, getArrowImage } from '../shared/dino-svgs';
import { spawnCelebration, updateParticles, drawParticles } from '../shared/particles';
import { playStep, playCelebration, playSticker, playPop, playSuccess, playMismatch } from '../shared/audio';
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

type GuardKind = 'patrol' | 'watcher';

interface Guard {
  kind: GuardKind;
  r: number;
  c: number;
  patrolPath: { r: number; c: number }[];
  patrolIndex: number;
  patrolDir: 1 | -1;
  facing: 'up' | 'down' | 'left' | 'right';
  moveTimer: number;
  alertTimer: number;
  rotationTimer: number;  // watcher: countdown until next rotation
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

type KeyColor = 'red' | 'blue' | 'yellow';

interface DungeonKey {
  r: number;
  c: number;
  color: KeyColor;
  collected: boolean;
}

interface DungeonDoor {
  r: number;
  c: number;
  color: KeyColor;
  open: boolean;
}

interface PressurePlate {
  r: number;
  c: number;
  pressed: boolean;
}

interface PlateGate {
  r: number;
  c: number;
  open: boolean;
}

interface PushBlock {
  r: number;
  c: number;
}

interface DungeonRoom {
  grid: DungeonCell[][];
  guards: Guard[];
  treasures: Treasure[];
  startR: number;
  startC: number;
  exitR: number;
  exitC: number;
  keys: DungeonKey[];
  doors: DungeonDoor[];
  plate: PressurePlate | null;
  plateGate: PlateGate | null;
  blocks: PushBlock[];
}

const PLATE_COLOR = '#66BB6A';
const PLATE_GATE_COLOR = '#2E7D32';
const BLOCK_COLOR = '#A1887F';
const BLOCK_EDGE = '#6D4C41';

const KEY_COLORS: Record<KeyColor, string> = {
  red: '#EF5350',
  blue: '#42A5F5',
  yellow: '#FFC107',
};

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
  // retry generation until we produce a provably solvable room
  for (let attempt = 0; attempt < 10; attempt++) {
    const room = buildRoom(level, difficulty);
    if (isRoomSolvable(room)) return room;
    // as a fallback, try stripping blocks (the only element that can theoretically
    // soft-lock the verifier even with safe placement, thanks to guards etc.)
    if (room.blocks.length > 0) {
      const stripped: DungeonRoom = { ...room, blocks: [] };
      if (isRoomSolvable(stripped)) return stripped;
    }
  }
  // last resort: emit a block-free, plate-free room so the player can always finish
  const fallback = buildRoom(level, difficulty);
  return { ...fallback, blocks: [], plate: null, plateGate: null };
}

function isRoomSolvable(room: DungeonRoom): boolean {
  // BFS over (r, c, keyMask, platePressed). Treats blocks as immovable walls
  // (pushing can only open more paths, so this is a conservative lower bound).
  const keyColors = [...new Set(room.keys.map((k) => k.color))];
  const keyBit: Partial<Record<KeyColor, number>> = {};
  keyColors.forEach((col, i) => { keyBit[col] = 1 << i; });
  const blockSet = new Set(room.blocks.map((b) => `${b.r},${b.c}`));

  type State = { r: number; c: number; keys: number; plate: boolean };
  const stateKey = (st: State) => `${st.r},${st.c},${st.keys},${st.plate ? 1 : 0}`;

  const initial: State = { r: room.startR, c: room.startC, keys: 0, plate: false };
  const seen = new Set<string>([stateKey(initial)]);
  const queue: State[] = [initial];

  while (queue.length > 0) {
    const st = queue.shift()!;
    if (st.r === room.exitR && st.c === room.exitC) return true;

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = st.r + dr;
      const nc = st.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (room.grid[nr][nc] === 'wall') continue;
      if (blockSet.has(`${nr},${nc}`)) continue;

      const door = room.doors.find((d) => d.r === nr && d.c === nc);
      if (door) {
        const bit = keyBit[door.color];
        if (bit === undefined || (st.keys & bit) === 0) continue;
      }
      if (room.plateGate && room.plateGate.r === nr && room.plateGate.c === nc && !st.plate) continue;

      let newKeys = st.keys;
      const pickedKey = room.keys.find((k) => k.r === nr && k.c === nc);
      if (pickedKey) {
        const bit = keyBit[pickedKey.color];
        if (bit !== undefined) newKeys |= bit;
      }
      let newPlate = st.plate;
      if (room.plate && room.plate.r === nr && room.plate.c === nc) newPlate = true;

      const next: State = { r: nr, c: nc, keys: newKeys, plate: newPlate };
      const sk = stateKey(next);
      if (!seen.has(sk)) {
        seen.add(sk);
        queue.push(next);
      }
    }
  }
  return false;
}

function buildRoom(level: number, difficulty: Difficulty = 'medium'): DungeonRoom {
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

  // widen passages for toddler friendliness (skip in hard — keeps a strict tree for doors)
  if (difficulty !== 'hard') {
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

  // compute the critical cells: every cell on the start→exit route.
  // watchers must not spawn on these; patrols should have patrols that include at least one off-path cell.
  const criticalCells = new Set<string>();
  for (const cell of shortestPath(grid, 1, 1, exitR, exitC)) {
    criticalCells.add(`${cell.r},${cell.c}`);
  }

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
  // prefer placing guards in less-trafficked spots: off the critical path first
  const shuffled = corridorCells.sort(() => Math.random() - 0.5);
  const offPath = shuffled.filter(({ r, c }) => !criticalCells.has(`${r},${c}`));
  const onPath = shuffled.filter(({ r, c }) => criticalCells.has(`${r},${c}`));
  const guardCandidates = [...offPath, ...onPath];

  // watchers only exist in medium (rarely) and hard (more common)
  const watcherProb = difficulty === 'hard' ? 0.5 : difficulty === 'medium' ? 0.2 : 0;
  for (let g = 0; g < guardCount && g < guardCandidates.length; g++) {
    const pos = guardCandidates[g];
    const onCritical = criticalCells.has(`${pos.r},${pos.c}`);
    // a stationary watcher on the critical path permanently blocks it — force patrol instead
    const kind: GuardKind = !onCritical && Math.random() < watcherProb ? 'watcher' : 'patrol';
    const patrol = kind === 'watcher' ? [{ r: pos.r, c: pos.c }] : buildPatrol(grid, pos.r, pos.c, criticalCells);
    const guardType = GUARD_POOL[g % GUARD_POOL.length];
    const facings: Guard['facing'][] = ['up', 'down', 'left', 'right'];
    guards.push({
      kind,
      r: pos.r,
      c: pos.c,
      patrolPath: patrol,
      patrolIndex: 0,
      patrolDir: 1,
      facing: kind === 'watcher' ? facings[Math.floor(Math.random() * 4)] : 'down',
      moveTimer: 0,
      alertTimer: 0,
      rotationTimer: kind === 'watcher' ? 2 + Math.random() * 1 : 0,
      species: guardType.species,
      color: guardType.color,
    });
  }

  // hard-mode: place 1–2 colored doors along the start→exit path with a matching key in the before region
  const keys: DungeonKey[] = [];
  const doors: DungeonDoor[] = [];

  if (difficulty === 'hard') {
    const path = shortestPath(grid, 1, 1, exitR, exitC);
    const doorPalette: KeyColor[] = ['red', 'blue', 'yellow'];
    const doorCount = path.length >= 14 ? 2 : path.length >= 7 ? 1 : 0;
    const doorIndices: number[] = [];
    if (doorCount >= 1) doorIndices.push(Math.floor(path.length * 0.4));
    if (doorCount >= 2) doorIndices.push(Math.floor(path.length * 0.75));

    const doorKeySet = new Set<string>(); // cells where door or key is placed
    doorKeySet.add('1,1');
    doorKeySet.add(`${exitR},${exitC}`);
    for (const t of treasures) doorKeySet.add(`${t.r},${t.c}`);

    for (let i = 0; i < doorIndices.length; i++) {
      const idx = doorIndices[i];
      const doorCell = path[idx];
      const color = doorPalette[i];
      doors.push({ r: doorCell.r, c: doorCell.c, color, open: false });
      doorKeySet.add(`${doorCell.r},${doorCell.c}`);

      // Region reachable if previous doors are open and this door is closed.
      // (Imagine the player has walked past doors 0..i-1 and is now blocked by door i.)
      const blockOnlyCurrent = new Set<string>([`${doorCell.r},${doorCell.c}`]);
      const reachableNow = floodFillAvoiding(grid, 1, 1, blockOnlyCurrent);

      // Exclude cells that were already accessible before the previous door,
      // so the key sits in the newly-opened region instead of back near spawn.
      let candidatesSet: Set<string> = reachableNow;
      if (i >= 1) {
        const prev = doors[i - 1];
        const blockPrev = new Set<string>([`${prev.r},${prev.c}`]);
        const prevRegion = floodFillAvoiding(grid, 1, 1, blockPrev);
        candidatesSet = new Set([...reachableNow].filter((c) => !prevRegion.has(c)));
      }

      const candidates = [...candidatesSet]
        .map((k) => { const [r, c] = k.split(',').map(Number); return { r, c }; })
        .filter(({ r, c }) => !doorKeySet.has(`${r},${c}`));

      if (candidates.length > 0) {
        // prefer cells far from start to make searching interesting
        candidates.sort((a, b) => {
          const da = Math.abs(a.r - 1) + Math.abs(a.c - 1);
          const db = Math.abs(b.r - 1) + Math.abs(b.c - 1);
          return db - da;
        });
        const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        keys.push({ r: pick.r, c: pick.c, color, collected: false });
        doorKeySet.add(`${pick.r},${pick.c}`);
      }
    }
  }

  // hard-mode: place a single pressure plate + gate (latching, step to unlock)
  let plate: PressurePlate | null = null;
  let plateGate: PlateGate | null = null;
  const blocks: PushBlock[] = [];
  const claimed = new Set<string>();
  claimed.add('1,1');
  claimed.add(`${exitR},${exitC}`);
  for (const t of treasures) claimed.add(`${t.r},${t.c}`);
  for (const k of keys) claimed.add(`${k.r},${k.c}`);
  for (const d of doors) claimed.add(`${d.r},${d.c}`);
  for (const g of guards) claimed.add(`${g.r},${g.c}`);

  if (difficulty === 'hard') {
    const path = shortestPath(grid, 1, 1, exitR, exitC);
    // find a cell on the path AFTER any existing door, as a candidate for the plate gate
    let lastDoorIdx = -1;
    for (const d of doors) {
      const idx = path.findIndex((p) => p.r === d.r && p.c === d.c);
      if (idx > lastDoorIdx) lastDoorIdx = idx;
    }
    // pick a gate cell ~85% of the way to the exit, but strictly after any door
    const gateCandidateIdx = Math.max(lastDoorIdx + 2, Math.floor(path.length * 0.85));
    if (gateCandidateIdx > 0 && gateCandidateIdx < path.length - 1) {
      const gateCell = path[gateCandidateIdx];
      const gateKey = `${gateCell.r},${gateCell.c}`;
      if (!claimed.has(gateKey)) {
        plateGate = { r: gateCell.r, c: gateCell.c, open: false };
        claimed.add(gateKey);

        // plate goes in the region before the plate gate, not near start, not on any claimed cell
        const plateBlocked = new Set<string>([gateKey, ...doors.map((d) => `${d.r},${d.c}`)]);
        const plateAccessible = floodFillAvoiding(grid, 1, 1, plateBlocked);
        const plateCandidates = [...plateAccessible]
          .map((k) => { const [r, c] = k.split(',').map(Number); return { r, c }; })
          .filter(({ r, c }) => !claimed.has(`${r},${c}`))
          // prefer cells farther from start for a more interesting hunt
          .sort((a, b) => {
            const da = Math.abs(a.r - 1) + Math.abs(a.c - 1);
            const db = Math.abs(b.r - 1) + Math.abs(b.c - 1);
            return db - da;
          });
        if (plateCandidates.length > 0) {
          const pick = plateCandidates[Math.floor(Math.random() * Math.min(3, plateCandidates.length))];
          plate = { r: pick.r, c: pick.c, pressed: false };
          claimed.add(`${pick.r},${pick.c}`);
        } else {
          // no valid plate spot — revert the gate
          plateGate = null;
          claimed.delete(gateKey);
        }
      }
    }

    // place push blocks only in "safe" dead-end branches:
    // block at cell M where M has 2 empty neighbors, one of which is a dead-end D,
    // and neither M nor D holds any item. Pushing the block can only send it into
    // the unused dead-end tip, so the player never gets softlocked.
    const countEmptyNeighbors = (r: number, c: number) => {
      let n = 0;
      if (r > 0 && grid[r - 1][c] === 'empty') n++;
      if (r < ROWS - 1 && grid[r + 1][c] === 'empty') n++;
      if (c > 0 && grid[r][c - 1] === 'empty') n++;
      if (c < COLS - 1 && grid[r][c + 1] === 'empty') n++;
      return n;
    };
    const safeBlockCells: { r: number; c: number }[] = [];
    for (const cell of reachableCells) {
      const { r, c } = cell;
      if (claimed.has(`${r},${c}`)) continue;
      if (countEmptyNeighbors(r, c) !== 2) continue;
      // look for a neighbor that is a dead-end (only M as its empty neighbor)
      let hasSafeDeadEnd = false;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (grid[nr][nc] !== 'empty') continue;
        if (claimed.has(`${nr},${nc}`)) continue;
        if (countEmptyNeighbors(nr, nc) === 1) {
          hasSafeDeadEnd = true;
          break;
        }
      }
      if (hasSafeDeadEnd) safeBlockCells.push({ r, c });
    }
    const blockCount = Math.min(1 + Math.floor(level / 3), 2, safeBlockCells.length);
    const shuffledSafe = safeBlockCells.sort(() => Math.random() - 0.5);
    for (let i = 0; i < blockCount; i++) {
      const b = shuffledSafe[i];
      blocks.push({ r: b.r, c: b.c });
      claimed.add(`${b.r},${b.c}`);
    }
  }

  return { grid, guards, treasures, startR: 1, startC: 1, exitR, exitC, keys, doors, plate, plateGate, blocks };
}

function shortestPath(grid: DungeonCell[][], sr: number, sc: number, er: number, ec: number): { r: number; c: number }[] {
  const parent: Record<string, string | null> = { [`${sr},${sc}`]: null };
  const queue: { r: number; c: number }[] = [{ r: sr, c: sc }];
  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    if (r === er && c === ec) break;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === 'empty' && !(key in parent)) {
        parent[key] = `${r},${c}`;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  // reconstruct
  const path: { r: number; c: number }[] = [];
  let cur: string | null = `${er},${ec}`;
  while (cur) {
    const [r, c] = cur.split(',').map(Number);
    path.unshift({ r, c });
    cur = parent[cur] ?? null;
  }
  return path;
}

function floodFillAvoiding(grid: DungeonCell[][], sr: number, sc: number, blocked: Set<string>): Set<string> {
  const seen = new Set<string>();
  seen.add(`${sr},${sc}`);
  const stack = [{ r: sr, c: sc }];
  while (stack.length > 0) {
    const { r, c } = stack.pop()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const k = `${nr},${nc}`;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (grid[nr][nc] !== 'empty') continue;
      if (blocked.has(k)) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      stack.push({ r: nr, c: nc });
    }
  }
  return seen;
}

function buildPatrol(
  grid: DungeonCell[][],
  startR: number,
  startC: number,
  criticalCells?: Set<string>,
): { r: number; c: number }[] {
  const path: { r: number; c: number }[] = [{ r: startR, c: startC }];
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // Find valid first-step directions (empty cell that isn't off-grid)
  const validDirs = dirs.filter(([dr, dc]) => {
    const nr = startR + dr;
    const nc = startC + dc;
    return nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && grid[nr][nc] === 'empty';
  });
  if (validDirs.length === 0) return path;

  // Prefer a direction whose first step leaves the critical path so the guard
  // spends meaningful time off it, giving the player a passage window.
  let chosen: [number, number] | undefined;
  if (criticalCells) {
    const offCritDirs = validDirs.filter(([dr, dc]) => {
      return !criticalCells.has(`${startR + dr},${startC + dc}`);
    });
    if (offCritDirs.length > 0) {
      chosen = offCritDirs[Math.floor(Math.random() * offCritDirs.length)];
    }
  }
  if (!chosen) chosen = validDirs[Math.floor(Math.random() * validDirs.length)];

  const steps = 2 + Math.floor(Math.random() * 3);
  let cr = startR;
  let cc = startC;
  for (let i = 0; i < steps; i++) {
    const nr = cr + chosen[0];
    const nc = cc + chosen[1];
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

function visionRange(difficulty: Difficulty, kind: GuardKind = 'patrol'): number {
  const base = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
  return kind === 'watcher' ? base + 1 : base;
}

function guardMoveInterval(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 1.2;
  if (difficulty === 'hard') return 0.5;
  return 0.8;
}

function canGuardSee(guard: Guard, pr: number, pc: number, grid: DungeonCell[][], difficulty: Difficulty): boolean {
  if (guard.alertTimer > 0) return false;
  const range = visionRange(difficulty, guard.kind);
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
    exitOpen: getDifficulty() === 'hard',
    facing: 'down' as WalkDirection,
    inventory: new Set<KeyColor>(),
    lockedBumpTimer: 0,
    running: false,
    noisePulses: [] as { x: number; y: number; age: number }[],
  });

  const tryMove = useCallback((dr: number, dc: number) => {
    const s = stateRef.current;
    if (s.celebrating > 0 || s.caught) return;
    const nr = s.playerR + dr;
    const nc = s.playerC + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (s.room.grid[nr][nc] === 'wall') return;

    // check for a closed door at the target cell
    const door = s.room.doors.find((d) => d.r === nr && d.c === nc && !d.open);
    if (door) {
      if (s.inventory.has(door.color)) {
        door.open = true;
        playSuccess();
        const px = nc * TILE + TILE / 2;
        const py = nr * TILE + TILE / 2;
        s.particles.push(...spawnCelebration(px, py, 12));
      } else {
        s.lockedBumpTimer = 0.35;
        playMismatch();
        return;
      }
    }

    // check for a closed plate gate
    if (s.room.plateGate && s.room.plateGate.r === nr && s.room.plateGate.c === nc && !s.room.plateGate.open) {
      s.lockedBumpTimer = 0.35;
      playMismatch();
      return;
    }

    // check for a push block at the target cell — try to push it
    const blockIdx = s.room.blocks.findIndex((b) => b.r === nr && b.c === nc);
    if (blockIdx !== -1) {
      const block = s.room.blocks[blockIdx];
      const br = block.r + dr;
      const bc = block.c + dc;
      // validate destination
      if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) {
        s.lockedBumpTimer = 0.2;
        return;
      }
      if (s.room.grid[br][bc] === 'wall') {
        s.lockedBumpTimer = 0.2;
        return;
      }
      const hitDoor = s.room.doors.find((d) => d.r === br && d.c === bc && !d.open);
      const hitPlateGate = s.room.plateGate && s.room.plateGate.r === br && s.room.plateGate.c === bc && !s.room.plateGate.open;
      const hitBlock = s.room.blocks.some((b) => b.r === br && b.c === bc);
      if (hitDoor || hitPlateGate || hitBlock) {
        s.lockedBumpTimer = 0.2;
        return;
      }
      // push it
      block.r = br;
      block.c = bc;
      playPop();

      // if the block landed on the plate, activate it too
      if (s.room.plate && !s.room.plate.pressed && s.room.plate.r === br && s.room.plate.c === bc) {
        s.room.plate.pressed = true;
        if (s.room.plateGate) s.room.plateGate.open = true;
        playSuccess();
        s.particles.push(...spawnCelebration(bc * TILE + TILE / 2, br * TILE + TILE / 2, 15));
      }
    }

    s.playerR = nr;
    s.playerC = nc;
    s.moveTimer = s.running ? 0.08 : 0.15;
    if (dr === -1) s.facing = 'down';
    else if (dr === 1) s.facing = 'down';
    else if (dc === -1) s.facing = 'left';
    else if (dc === 1) s.facing = 'right';
    playStep();

    // noise: running alerts nearby guards (they turn to face the sound)
    if (s.running) {
      const NOISE_RADIUS = 4;
      s.noisePulses.push({ x: nc * TILE + TILE / 2, y: nr * TILE + TILE / 2, age: 0 });
      for (const guard of s.room.guards) {
        const d = Math.abs(guard.r - nr) + Math.abs(guard.c - nc);
        if (d <= NOISE_RADIUS) {
          // face toward player
          const gdr = nr - guard.r;
          const gdc = nc - guard.c;
          if (Math.abs(gdc) >= Math.abs(gdr)) {
            guard.facing = gdc > 0 ? 'right' : 'left';
          } else {
            guard.facing = gdr > 0 ? 'down' : 'up';
          }
          // watchers pause rotation briefly after hearing noise
          if (guard.kind === 'watcher') guard.rotationTimer = 1.5;
        }
      }
    }

    // check key pickup (hard mode)
    for (const k of s.room.keys) {
      if (!k.collected && k.r === nr && k.c === nc) {
        k.collected = true;
        s.inventory.add(k.color);
        playPop();
        const px = nc * TILE + TILE / 2;
        const py = nr * TILE + TILE / 2;
        s.particles.push(...spawnCelebration(px, py, 12));
      }
    }

    // check pressure plate
    if (s.room.plate && !s.room.plate.pressed && s.room.plate.r === nr && s.room.plate.c === nc) {
      s.room.plate.pressed = true;
      if (s.room.plateGate) s.room.plateGate.open = true;
      playSuccess();
      const px = nc * TILE + TILE / 2;
      const py = nr * TILE + TILE / 2;
      s.particles.push(...spawnCelebration(px, py, 15));
    }

    // check treasure pickup
    for (const t of s.room.treasures) {
      if (!t.collected && t.r === nr && t.c === nc) {
        t.collected = true;
        s.totalTreasures++;
        playPop();
        const px = nc * TILE + TILE / 2;
        const py = nr * TILE + TILE / 2;
        s.particles.push(...spawnCelebration(px, py, 10));

        // treasures still gate the exit in easy/medium; hard uses doors for challenge
        if (s.difficulty !== 'hard') {
          const allCollected = s.room.treasures.every((tr) => tr.collected);
          if (allCollected) {
            s.exitOpen = true;
            playSuccess();
          }
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
      if (e.key === 'Shift') {
        s.running = true;
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        s.keysHeld.add(e.key);
        s.running = e.shiftKey;
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
      if (e.key === 'Shift') {
        stateRef.current.running = false;
        return;
      }
      stateRef.current.keysHeld.delete(e.key);
    },
    onDraw(ctx, mouse, dt) {
      const s = stateRef.current;

      if (s.stickerPopupTimer > 0) s.stickerPopupTimer -= dt;
      if (s.moveTimer > 0) s.moveTimer -= dt;
      if (s.lockedBumpTimer > 0) s.lockedBumpTimer -= dt;
      s.particles = updateParticles(s.particles, dt);

      // advance noise pulses
      for (const pulse of s.noisePulses) pulse.age += dt;
      s.noisePulses = s.noisePulses.filter((p) => p.age < 0.5);

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

          if (guard.kind === 'watcher') {
            // rotate cone every few seconds
            guard.rotationTimer -= dt;
            if (guard.rotationTimer <= 0) {
              const cycle: Guard['facing'][] = ['down', 'right', 'up', 'left'];
              const nextIdx = (cycle.indexOf(guard.facing) + 1) % cycle.length;
              guard.facing = cycle[nextIdx];
              guard.rotationTimer = s.difficulty === 'hard' ? 1.5 : 2.2;
            }
          } else {
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
          s.exitOpen = s.difficulty === 'hard';
          s.inventory.clear();
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

      // draw pressure plate
      if (s.room.plate) {
        const p = s.room.plate;
        const px = p.c * TILE;
        const py = p.r * TILE;
        const pulse = p.pressed ? 0 : 0.2 + Math.sin(mouse.time * 3) * 0.1;

        ctx.save();
        if (p.pressed) {
          ctx.fillStyle = '#4CAF50';
        } else {
          ctx.shadowColor = PLATE_COLOR;
          ctx.shadowBlur = 8 + pulse * 20;
          ctx.fillStyle = PLATE_COLOR;
        }
        ctx.beginPath();
        ctx.ellipse(px + TILE / 2, py + TILE / 2 + 4, TILE * 0.38, TILE * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px + TILE / 2, py + TILE / 2 + 4, TILE * 0.38, TILE * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
        // inner indicator
        ctx.fillStyle = p.pressed ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2 + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // draw plate gate (closed: solid; open: faded outline)
      if (s.room.plateGate) {
        const g = s.room.plateGate;
        const gx = g.c * TILE;
        const gy = g.r * TILE;
        if (!g.open) {
          ctx.fillStyle = PLATE_GATE_COLOR;
          ctx.fillRect(gx + 4, gy + 4, TILE - 8, TILE - 8);
          // horizontal bars
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          for (let b = 0; b < 3; b++) {
            ctx.fillRect(gx + 8, gy + 12 + b * 10, TILE - 16, 3);
          }
          // center emblem
          ctx.fillStyle = PLATE_COLOR;
          ctx.beginPath();
          ctx.arc(gx + TILE / 2, gy + TILE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // faint residue
          ctx.strokeStyle = 'rgba(100,180,100,0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.strokeRect(gx + 6, gy + 6, TILE - 12, TILE - 12);
          ctx.setLineDash([]);
        }
      }

      // draw push blocks
      for (const b of s.room.blocks) {
        const bx = b.c * TILE;
        const by = b.r * TILE;
        ctx.fillStyle = BLOCK_COLOR;
        ctx.fillRect(bx + 5, by + 5, TILE - 10, TILE - 10);
        ctx.strokeStyle = BLOCK_EDGE;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx + 5, by + 5, TILE - 10, TILE - 10);
        // corner nails + wood grain lines
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(bx + 10, by + 10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + TILE - 10, by + 10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 10, by + TILE - 10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + TILE - 10, by + TILE - 10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 8, by + TILE / 2);
        ctx.lineTo(bx + TILE - 8, by + TILE / 2);
        ctx.stroke();
      }

      // draw closed doors (hard mode)
      for (const d of s.room.doors) {
        if (d.open) continue;
        const dx = d.c * TILE;
        const dy = d.r * TILE;
        const color = KEY_COLORS[d.color];

        // frame
        ctx.fillStyle = '#4A2E22';
        ctx.fillRect(dx + 3, dy + 3, TILE - 6, TILE - 6);
        // colored panel
        ctx.fillStyle = color;
        ctx.fillRect(dx + 8, dy + 8, TILE - 16, TILE - 16);
        // keyhole
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(dx + TILE / 2, dy + TILE / 2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(dx + TILE / 2 - 2, dy + TILE / 2 - 2, 4, 10);
        // bolts
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(dx + 10, dy + 10, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(dx + TILE - 10, dy + 10, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(dx + 10, dy + TILE - 10, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(dx + TILE - 10, dy + TILE - 10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // draw keys (hard mode)
      for (const k of s.room.keys) {
        if (k.collected) continue;
        const kx = k.c * TILE + TILE / 2;
        const ky = k.r * TILE + TILE / 2;
        const bob = Math.sin(mouse.time * 3 + k.r * 1.3 + k.c) * 3;
        const color = KEY_COLORS[k.color];

        ctx.save();
        const glowAlpha = 0.25 + Math.sin(mouse.time * 4 + k.r) * 0.1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255,255,255,${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(kx, ky + bob, 13, 0, Math.PI * 2);
        ctx.fill();

        // key body (colored circle + stem + teeth)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(kx, ky + bob - 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(kx - 1.5, ky + bob - 2, 3, 10);
        ctx.fillRect(kx + 1, ky + bob + 4, 5, 2);
        ctx.fillRect(kx + 1, ky + bob + 7, 4, 2);
        // highlight dot
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(kx - 2, ky + bob - 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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

      // noise pulses (expanding rings from where the player ran)
      for (const pulse of s.noisePulses) {
        const p = pulse.age / 0.5;
        const r = 10 + p * (TILE * 4);
        const alpha = (1 - p) * 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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

      // bottom HUD: keys inventory (hard) + treasure counter
      {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 110, H - 48, 220, 28, 8);
        ctx.fill();

        if (s.difficulty === 'hard' && s.room.doors.length > 0) {
          // draw a key icon per door color; filled if collected, greyed if not
          const colors: KeyColor[] = [];
          for (const d of s.room.doors) {
            if (!colors.includes(d.color)) colors.push(d.color);
          }
          const iconSpacing = 26;
          const totalW = colors.length * iconSpacing;
          const startX = W / 2 - totalW / 2 + iconSpacing / 2;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px Fredoka, sans-serif';
          ctx.fillText('Keys:', W / 2 - totalW / 2 - 50, H - 29);

          for (let i = 0; i < colors.length; i++) {
            const col = colors[i];
            const has = s.inventory.has(col);
            const cx = startX + i * iconSpacing;
            const cy = H - 34;
            ctx.save();
            if (has) {
              ctx.shadowColor = KEY_COLORS[col];
              ctx.shadowBlur = 10;
            }
            ctx.fillStyle = has ? KEY_COLORS[col] : 'rgba(255,255,255,0.22)';
            ctx.beginPath();
            ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 1.5, cy, 3, 9);
            ctx.fillRect(cx + 1, cy + 4, 5, 2);
            ctx.fillRect(cx + 1, cy + 7, 4, 2);
            ctx.restore();
          }
        } else {
          const remaining = s.room.treasures.filter((t) => !t.collected).length;
          const total = s.room.treasures.length;
          ctx.fillStyle = remaining === 0 ? '#4CAF50' : '#FFD700';
          ctx.font = 'bold 14px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            remaining === 0 ? 'Exit unlocked! ⭐' : `💎 ${total - remaining}/${total} treasures`,
            W / 2,
            H - 30,
          );
        }
      }

      // room number
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Room ${s.level + 1}`, 16, H - 10);

      // running-state indicator
      if (s.difficulty === 'hard') {
        ctx.textAlign = 'right';
        ctx.fillStyle = s.running ? '#FFEB3B' : 'rgba(255,255,255,0.35)';
        ctx.font = 'bold 12px Fredoka, sans-serif';
        ctx.fillText(s.running ? '🏃 Running (loud!)' : 'Shift = run', W - 16, H - 10);
      }

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
        const s = stateRef.current;
        s.easyMode = toggleEasyMode();
        s.difficulty = getDifficulty();
        // regenerate the current room so door/key layout matches the new difficulty
        s.room = generateRoom(s.level, s.difficulty);
        s.playerR = s.room.startR;
        s.playerC = s.room.startC;
        s.facing = 'down';
        s.inventory.clear();
        s.exitOpen = s.difficulty === 'hard';
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

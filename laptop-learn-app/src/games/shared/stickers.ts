import type { Sticker } from './types';

const STICKER_KEY = 'dinoLearn_stickers';
const PROGRESS_KEY = 'dinoLearn_progress';

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  game: string;
  threshold: number;
}

const ALL_STICKERS: StickerDef[] = [
  { id: 'egg-hunt-1', emoji: '🥚', name: 'First Hatch', game: 'egg-hunt', threshold: 1 },
  { id: 'egg-hunt-5', emoji: '🐣', name: 'Egg Expert', game: 'egg-hunt', threshold: 5 },
  { id: 'dino-path-1', emoji: '🦶', name: 'First Steps', game: 'dino-path', threshold: 1 },
  { id: 'dino-path-3', emoji: '🌟', name: 'Path Finder', game: 'dino-path', threshold: 3 },
  { id: 'spell-dino-1', emoji: '🔤', name: 'First Word', game: 'spell-dino', threshold: 1 },
  { id: 'spell-dino-3', emoji: '📖', name: 'Dino Scholar', game: 'spell-dino', threshold: 3 },
  { id: 'volcano-1', emoji: '🌋', name: 'First Escape', game: 'volcano', threshold: 1 },
  { id: 'volcano-3', emoji: '🏆', name: 'Escape Artist', game: 'volcano', threshold: 3 },
  { id: 'dino-match-1', emoji: '🃏', name: 'First Match', game: 'dino-match', threshold: 1 },
  { id: 'dino-match-3', emoji: '🧠', name: 'Memory Master', game: 'dino-match', threshold: 3 },
];

export interface StickerWithProgress extends Sticker {
  game: string;
  threshold: number;
  progress: number;
}

export function loadStickers(): StickerWithProgress[] {
  try {
    const raw = localStorage.getItem(STICKER_KEY);
    const earnedIds: string[] = raw ? JSON.parse(raw) : [];
    const progress = loadProgress();

    // auto-grant stickers if progress meets threshold but sticker wasn't saved
    let dirty = false;
    for (const s of ALL_STICKERS) {
      const prog = progress[s.game] ?? 0;
      if (prog >= s.threshold && Array.isArray(earnedIds) && !earnedIds.includes(s.id)) {
        earnedIds.push(s.id);
        dirty = true;
      }
    }
    if (dirty) {
      localStorage.setItem(STICKER_KEY, JSON.stringify(earnedIds));
    }

    return ALL_STICKERS.map((s) => ({
      id: s.id,
      emoji: s.emoji,
      name: s.name,
      game: s.game,
      threshold: s.threshold,
      earned: Array.isArray(earnedIds) && earnedIds.includes(s.id),
      progress: progress[s.game] ?? 0,
    }));
  } catch {
    return ALL_STICKERS.map((s) => ({
      ...s,
      earned: false,
      progress: 0,
    }));
  }
}

export function earnSticker(id: string) {
  try {
    const raw = localStorage.getItem(STICKER_KEY);
    const saved: string[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(saved) && !saved.includes(id)) {
      saved.push(id);
      localStorage.setItem(STICKER_KEY, JSON.stringify(saved));
    }
  } catch {
    // ignore
  }
}

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return {};
  } catch {
    return {};
  }
}

export function trackProgress(game: string): number {
  try {
    const progress = loadProgress();
    const current = (progress[game] ?? 0) + 1;
    progress[game] = current;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return current;
  } catch {
    return 0;
  }
}

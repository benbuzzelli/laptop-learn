import { profileKey } from './profile';
import type { DinoSpecies } from './draw';

const AVATAR_KEY = 'avatar';

export interface Avatar {
  species: DinoSpecies;
  color: string;
}

export const AVATAR_SPECIES: { species: DinoSpecies; label: string }[] = [
  { species: 'rex', label: 'T-Rex' },
  { species: 'stego', label: 'Stego' },
  { species: 'tric', label: 'Triceratops' },
  { species: 'bronto', label: 'Bronto' },
  { species: 'raptor', label: 'Raptor' },
];

export const AVATAR_COLORS: { value: string; label: string }[] = [
  { value: '#4CAF50', label: 'Green' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#E91E63', label: 'Pink' },
  { value: '#2196F3', label: 'Blue' },
  { value: '#9C27B0', label: 'Purple' },
  { value: '#FFEB3B', label: 'Yellow' },
  { value: '#F44336', label: 'Red' },
  { value: '#00BCD4', label: 'Teal' },
];

export function getAvatar(): Avatar | null {
  try {
    const raw = localStorage.getItem(profileKey(AVATAR_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.species === 'string' && typeof parsed.color === 'string') {
      return parsed;
    }
  } catch {}
  return null;
}

export function setAvatar(avatar: Avatar) {
  try {
    localStorage.setItem(profileKey(AVATAR_KEY), JSON.stringify(avatar));
  } catch {}
}

export function hasAvatar(): boolean {
  return getAvatar() !== null;
}

import type { DinoSpecies } from './draw';

// v0 base sprites
import rexP0 from './sprites/rex-0.png';
import rexP1 from './sprites/rex-1.png';
import rexP2 from './sprites/rex-2.png';
import stegP0 from './sprites/steg-0.png';
import stegP1 from './sprites/steg-1.png';
import stegP2 from './sprites/steg-2.png';
import brontP0 from './sprites/bront-0.png';
import brontP1 from './sprites/bront-1.png';
import brontP2 from './sprites/bront-2.png';
import raptorP0 from './sprites/raptor-0.png';
import raptorP1 from './sprites/raptor-1.png';
import raptorP2 from './sprites/raptor-2.png';
import ankyP0 from './sprites/anky-0.png';
import ankyP1 from './sprites/anky-1.png';
import ankyP2 from './sprites/anky-2.png';
import parasP0 from './sprites/paras-0.png';
import parasP1 from './sprites/paras-1.png';
import parasP2 from './sprites/paras-2.png';
import spinoP0 from './sprites/spino-0.png';
import spinoP1 from './sprites/spino-1.png';
import spinoP2 from './sprites/spino-2.png';
import pterP0 from './sprites/pter-0.png';
import pterP1 from './sprites/pter-1.png';
import pterP2 from './sprites/pter-2.png';
import triP0 from './sprites/tri-0.png';
import triP1 from './sprites/tri-1.png';
import triP2 from './sprites/tri-2.png';

// v1 sprites
import rexV1P0 from './sprites/rex-v1-0.png';
import rexV1P1 from './sprites/rex-v1-1.png';
import rexV1P2 from './sprites/rex-v1-2.png';
import stegV1P0 from './sprites/steg-v1-0.png';
import stegV1P1 from './sprites/steg-v1-1.png';
import stegV1P2 from './sprites/steg-v1-2.png';
import brontV1P0 from './sprites/bront-v1-0.png';
import brontV1P1 from './sprites/bront-v1-1.png';
import brontV1P2 from './sprites/bront-v1-2.png';
import raptorV1P0 from './sprites/raptor-v1-0.png';
import raptorV1P1 from './sprites/raptor-v1-1.png';
import raptorV1P2 from './sprites/raptor-v1-2.png';
import ankyV1P0 from './sprites/anky-v1-0.png';
import ankyV1P1 from './sprites/anky-v1-1.png';
import ankyV1P2 from './sprites/anky-v1-2.png';
import parasV1P0 from './sprites/paras-v1-0.png';
import parasV1P1 from './sprites/paras-v1-1.png';
import parasV1P2 from './sprites/paras-v1-2.png';
import spinoV1P0 from './sprites/spino-v1-0.png';
import spinoV1P1 from './sprites/spino-v1-1.png';
import spinoV1P2 from './sprites/spino-v1-2.png';
import pterV1P0 from './sprites/pter-v1-0.png';
import pterV1P1 from './sprites/pter-v1-1.png';
import pterV1P2 from './sprites/pter-v1-2.png';

// Baby sprites
import babyRex from './sprites/baby-rex.png';
import babyAnky from './sprites/baby-anky.png';
import babyBront from './sprites/baby-bront.png';
import babyPtera from './sprites/baby-ptera.png';
import babySpino from './sprites/baby-spino.png';
import babyTri from './sprites/baby-tri.png';

// Egg sprites (5 types, 4 stages each)
import egg1 from './sprites/egg-1.png';
import egg1Broken from './sprites/egg-1-broken.png';
import egg1Hatched from './sprites/egg-1-hatched.png';
import egg1Grown from './sprites/egg-1-grown.png';
import egg2 from './sprites/egg-2.png';
import egg2Broken from './sprites/egg-2-broken.png';
import egg2Hatched from './sprites/egg-2-hatched.png';
import egg2Grown from './sprites/egg-2-grown.png';
import egg3 from './sprites/egg-3.png';
import egg3Broken from './sprites/egg-3-broken.png';
import egg3Hatched from './sprites/egg-3-hatched.png';
import egg3Grown from './sprites/egg-3-grown.png';
import egg4 from './sprites/egg-4.png';
import egg4Broken from './sprites/egg-4-broken.png';
import egg4Hatched from './sprites/egg-4-hatched.png';
import egg4Grown from './sprites/egg-4-grown.png';
import egg5 from './sprites/egg-5.png';
import egg5Broken from './sprites/egg-5-broken.png';
import egg5Hatched from './sprites/egg-5-hatched.png';
import egg5Grown from './sprites/egg-5-grown.png';

// Maze tile sprites
import grassUrl from './sprites/grass.png';
import grass1Url from './sprites/grass-1.png';
import grass2Url from './sprites/grass-2.png';
import grass3Url from './sprites/grass-3.png';
import grassGemsUrl from './sprites/grass-gems.png';
import grassBonesUrl from './sprites/grass-bones.png';
import wallUrl from './sprites/wall.png';
import wall1Url from './sprites/wall-1.png';
import wall2Url from './sprites/wall-2.png';
import arrowUpUrl from './sprites/up.png';
import arrowDownUrl from './sprites/down.png';
import arrowLeftUrl from './sprites/left.png';
import arrowRightUrl from './sprites/right.png';

import finishUrl from './sprites/finish.png';

// Misc sprites
import mouseUrl from './sprites/mouse.png';
import mouseClickUrl from './sprites/mouse-click.png';
import volcanoUrl from './sprites/volcano.png';
import footprintUrl from './sprites/foot-print.png';
import titleLogoUrl from './sprites/title-logo.png';

type PoseSet = [string, string, string];

const POSES_V0: Record<DinoSpecies, PoseSet> = {
  rex: [rexP0, rexP1, rexP2],
  stego: [stegP0, stegP1, stegP2],
  bronto: [brontP0, brontP1, brontP2],
  raptor: [raptorP0, raptorP1, raptorP2],
  ankylo: [ankyP0, ankyP1, ankyP2],
  para: [parasP0, parasP1, parasP2],
  spino: [spinoP0, spinoP1, spinoP2],
  ptera: [pterP0, pterP1, pterP2],
  tric: [triP0, triP1, triP2],
};

const POSES_V1: Record<DinoSpecies, PoseSet> = {
  rex: [rexV1P0, rexV1P1, rexV1P2],
  stego: [stegV1P0, stegV1P1, stegV1P2],
  bronto: [brontV1P0, brontV1P1, brontV1P2],
  raptor: [raptorV1P0, raptorV1P1, raptorV1P2],
  ankylo: [ankyV1P0, ankyV1P1, ankyV1P2],
  para: [parasV1P0, parasV1P1, parasV1P2],
  spino: [spinoV1P0, spinoV1P1, spinoV1P2],
  ptera: [pterV1P0, pterV1P1, pterV1P2],
  tric: [triP0, triP1, triP2],
};

const ALL_VERSIONS = [POSES_V0, POSES_V1];

const BABY_SPRITES: string[] = [babyRex, babyAnky, babyBront, babyPtera, babySpino, babyTri];

export type EggStage = 'whole' | 'broken' | 'hatched' | 'grown';

interface EggSpriteSet {
  whole: string;
  broken: string;
  hatched: string;
  grown: string;
}

const EGG_SETS: EggSpriteSet[] = [
  { whole: egg1, broken: egg1Broken, hatched: egg1Hatched, grown: egg1Grown },
  { whole: egg2, broken: egg2Broken, hatched: egg2Hatched, grown: egg2Grown },
  { whole: egg3, broken: egg3Broken, hatched: egg3Hatched, grown: egg3Grown },
  { whole: egg4, broken: egg4Broken, hatched: egg4Hatched, grown: egg4Grown },
  { whole: egg5, broken: egg5Broken, hatched: egg5Hatched, grown: egg5Grown },
];

const imageCache = new Map<string, HTMLImageElement>();

function loadUrl(url: string): HTMLImageElement {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return img;
}

export function getDinoImage(species: DinoSpecies, _color?: string, pose = 0, version = 0): HTMLImageElement {
  const versionSet = ALL_VERSIONS[Math.abs(version) % ALL_VERSIONS.length];
  const poses = versionSet[species];
  const url = poses[Math.abs(pose) % 3];
  return loadUrl(url);
}

export function getBabyDinoImage(speciesIndex: number): HTMLImageElement {
  return loadUrl(BABY_SPRITES[Math.abs(speciesIndex) % BABY_SPRITES.length]);
}

export function getEggImage(eggType: number, stage: EggStage): HTMLImageElement {
  const set = EGG_SETS[Math.abs(eggType) % EGG_SETS.length];
  return loadUrl(set[stage]);
}

export const EGG_TYPE_COUNT = EGG_SETS.length;

export function getMouseImage(clicking = false): HTMLImageElement {
  return loadUrl(clicking ? mouseClickUrl : mouseUrl);
}

export function getVolcanoImage(): HTMLImageElement {
  return loadUrl(volcanoUrl);
}

export function getFootprintImage(): HTMLImageElement {
  return loadUrl(footprintUrl);
}

export function getTitleLogoImage(): HTMLImageElement {
  return loadUrl(titleLogoUrl);
}

// Grass tiles: base (60%), numbered variants (10% each), specials (5% each)
const GRASS_TILES = [
  { url: grassUrl, weight: 60 },
  { url: grass1Url, weight: 10 },
  { url: grass2Url, weight: 10 },
  { url: grass3Url, weight: 10 },
  { url: grassGemsUrl, weight: 5 },
  { url: grassBonesUrl, weight: 5 },
];
const GRASS_TOTAL_WEIGHT = GRASS_TILES.reduce((s, t) => s + t.weight, 0);

const WALL_TILES = [wallUrl, wall1Url, wall2Url];

const ARROW_URLS: Record<string, string> = {
  ArrowUp: arrowUpUrl,
  ArrowDown: arrowDownUrl,
  ArrowLeft: arrowLeftUrl,
  ArrowRight: arrowRightUrl,
};

function tileHash(r: number, c: number): number {
  const n = Math.sin(r * 127.1 + c * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function getGrassTileImage(r: number, c: number): HTMLImageElement {
  let pick = tileHash(r, c) * GRASS_TOTAL_WEIGHT;
  for (const tile of GRASS_TILES) {
    pick -= tile.weight;
    if (pick <= 0) return loadUrl(tile.url);
  }
  return loadUrl(grassUrl);
}

export function getWallTileImage(r: number, c: number): HTMLImageElement {
  const idx = Math.floor(tileHash(r, c) * WALL_TILES.length * 0.999);
  return loadUrl(WALL_TILES[idx]);
}

export function getFinishImage(): HTMLImageElement {
  return loadUrl(finishUrl);
}

export function getArrowImage(direction: string): HTMLImageElement | null {
  const url = ARROW_URLS[direction];
  if (!url) return null;
  return loadUrl(url);
}

const STICKER_SPRITE_MAP: Record<string, string> = {
  'egg-hunt-1': egg1,
  'egg-hunt-5': egg1Grown,
  'dino-path-1': footprintUrl,
  'dino-path-3': rexP0,
  'spell-dino-1': triP0,
  'spell-dino-3': brontP0,
  'volcano-1': volcanoUrl,
  'volcano-3': raptorP0,
  'dino-match-1': stegP0,
  'dino-match-3': ankyP0,
};

export function getStickerImage(stickerId: string): HTMLImageElement | null {
  const url = STICKER_SPRITE_MAP[stickerId];
  if (!url) return null;
  return loadUrl(url);
}

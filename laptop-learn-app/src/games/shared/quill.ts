import neutral from './sprites/quill/neutral.png';
import excited from './sprites/quill/excited.png';
import grateful from './sprites/quill/grateful.png';
import confidentReady from './sprites/quill/confident-ready.png';
import seriousWarning from './sprites/quill/serious-warning.png';
import wink from './sprites/quill/wink.png';
import worried from './sprites/quill/worried.png';
import fullBody from './sprites/quill/quill.png';

export type QuillEmote =
  | 'neutral'
  | 'excited'
  | 'grateful'
  | 'confident-ready'
  | 'serious-warning'
  | 'wink'
  | 'worried';

const EMOTE_URLS: Record<QuillEmote, string> = {
  'neutral': neutral,
  'excited': excited,
  'grateful': grateful,
  'confident-ready': confidentReady,
  'serious-warning': seriousWarning,
  'wink': wink,
  'worried': worried,
};

export function getQuillEmoteUrl(emote: QuillEmote): string {
  return EMOTE_URLS[emote] ?? EMOTE_URLS.neutral;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadUrl(url: string): HTMLImageElement {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return img;
}

// Full-body Quill sprite, used for the valley NPC marker.
export function getQuillSpriteImage(): HTMLImageElement {
  return loadUrl(fullBody);
}

// Kick off eager loads so the first popup isn't blank for a frame.
export function preloadQuillEmotes() {
  for (const url of Object.values(EMOTE_URLS)) loadUrl(url);
  loadUrl(fullBody);
}

const KEY = 'dinoLearn_easyMode';

export function isEasyMode(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function toggleEasyMode(): boolean {
  const next = !isEasyMode();
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // ignore
  }
  return next;
}

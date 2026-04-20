import { useRef, useEffect, useCallback } from 'react';

export interface GameCanvasState {
  mouseX: number;
  mouseY: number;
  isTouch: boolean;
  mouseDown: boolean;
  time: number;
}

interface UseGameCanvasOptions {
  width: number;
  height: number;
  onDraw: (ctx: CanvasRenderingContext2D, mouse: GameCanvasState, dt: number) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  title?: string;
}

export function useGameCanvas(opts: UseGameCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseState = useRef<GameCanvasState>({
    mouseX: opts.width / 2,
    mouseY: opts.height / 2,
    isTouch: false,
    mouseDown: false,
    time: 0,
  });
  const timeoutsRef = useRef<number[]>([]);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (opts.title) document.title = `Dino Learn - ${opts.title}`;
    else document.title = 'Dino Learn!';
  }, [opts.title]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = opts.width;
    const H = opts.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${W}px`;
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${W}/${H}`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let lastTime = performance.now();
    let animId: number;

    const getCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (W / rect.width),
        y: (clientY - rect.top) * (H / rect.height),
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const c = getCoords(e.clientX, e.clientY);
      mouseState.current.mouseX = c.x;
      mouseState.current.mouseY = c.y;
      mouseState.current.isTouch = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const c = getCoords(e.touches[0].clientX, e.touches[0].clientY);
        mouseState.current.mouseX = c.x;
        mouseState.current.mouseY = c.y;
        mouseState.current.isTouch = true;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      mouseState.current.isTouch = true;
      if (e.touches.length > 0) {
        const c = getCoords(e.touches[0].clientX, e.touches[0].clientY);
        mouseState.current.mouseX = c.x;
        mouseState.current.mouseY = c.y;
      }
      mouseState.current.mouseDown = true;
      opts.onMouseDown?.();
    };

    const handleTouchEnd = () => {
      mouseState.current.mouseDown = false;
      opts.onMouseUp?.();
    };

    const handleMouseDown = () => { mouseState.current.mouseDown = true; opts.onMouseDown?.(); };
    const handleMouseUp = () => { mouseState.current.mouseDown = false; opts.onMouseUp?.(); };

    const handleKeyDown = (e: KeyboardEvent) => { opts.onKeyDown?.(e); };
    const handleKeyUp = (e: KeyboardEvent) => { opts.onKeyUp?.(e); };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      mouseState.current.time += dt;

      ctx.clearRect(0, 0, W, H);
      opts.onDraw(ctx, mouseState.current, dt);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      for (const id of timeoutsRef.current) clearTimeout(id);
      timeoutsRef.current = [];
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { canvasRef, mouseState, safeTimeout };
}

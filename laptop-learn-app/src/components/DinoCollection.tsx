import { useRef, useCallback } from 'react';
import { drawDino, drawCustomCursor, drawBackButton } from '../games/shared/draw';
import { useGameCanvas } from '../games/shared/useGameCanvas';
import { getAllSlots, getCollectionCount } from '../games/shared/collection';
import type { CollectionSlot } from '../games/shared/collection';

const W = 800;
const H = 600;

const SLOT_W = 82;
const SLOT_H = 95;
const GAP = 10;
const COLS = 6;

const DINO_COLORS: Record<string, string> = {
  rex: '#4CAF50',
  stego: '#FF9800',
  bronto: '#9C27B0',
  raptor: '#2196F3',
  ankylo: '#009688',
  para: '#E91E63',
  spino: '#3F51B5',
  ptera: '#00BCD4',
  tric: '#8BC34A',
};

export function DinoCollection({ onBack }: { onBack: () => void }) {
  const bgGradRef = useRef<CanvasGradient | null>(null);

  const { canvasRef } = useGameCanvas({
    width: W,
    height: H,
    title: 'Dino Collection',
    onDraw(ctx, mouse, _dt) {
      const slots = getAllSlots();
      const count = getCollectionCount();

      if (!bgGradRef.current) {
        bgGradRef.current = ctx.createLinearGradient(0, 0, 0, H);
        bgGradRef.current.addColorStop(0, '#1a1a2e');
        bgGradRef.current.addColorStop(0.4, '#16213e');
        bgGradRef.current.addColorStop(1, '#0f3460');
      }
      ctx.fillStyle = bgGradRef.current;
      ctx.fillRect(0, 0, W, H);

      // stars
      const th = (a: number, b: number) => {
        const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
        return n - Math.floor(n);
      };
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 35; i++) {
        const sx = th(i, 0) * W;
        const sy = th(i, 1) * H * 0.35;
        ctx.globalAlpha = 0.2 + Math.sin(mouse.time * 1.5 + i) * 0.15;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // title
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 26px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dino Collection', W / 2, 38);

      // count
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px Fredoka, sans-serif';
      ctx.fillText(`${count} / ${slots.length} discovered`, W / 2, 56);

      const v0Slots = slots.filter((s) => s.version === 0);
      const v1Slots = slots.filter((s) => s.version === 1);

      // v0 section
      const v0Rows = Math.ceil(v0Slots.length / COLS);
      const v0GridW = Math.min(COLS, v0Slots.length) * SLOT_W + (Math.min(COLS, v0Slots.length) - 1) * GAP;
      const v0StartX = (W - v0GridW) / 2;
      const v0StartY = 72;

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 13px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Classic Dinos', v0StartX, v0StartY);

      drawSlotGrid(ctx, v0Slots, v0StartX, v0StartY + 8, mouse.time, mouse.mouseX, mouse.mouseY);

      // v1 section
      const v1GridW = Math.min(COLS, v1Slots.length) * SLOT_W + (Math.min(COLS, v1Slots.length) - 1) * GAP;
      const v1StartX = (W - v1GridW) / 2;
      const v1StartY = v0StartY + 8 + v0Rows * (SLOT_H + GAP) + 20;

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 13px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Special Dinos', v1StartX, v1StartY);

      drawSlotGrid(ctx, v1Slots, v1StartX, v1StartY + 8, mouse.time, mouse.mouseX, mouse.mouseY);

      // footer hint
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '13px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Play games to discover new dinos!', W / 2, H - 16);

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

      if (mx > W - 110 && mx < W && my > 10 && my < 54) {
        onBack();
      }
    },
    [onBack],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="application"
      aria-label="Dino Collection - view your discovered dinosaurs"
      style={{ cursor: 'none', borderRadius: 16, display: 'block', width: '100%', maxWidth: W, outline: 'none' }}
    />
  );
}

function drawSlotGrid(
  ctx: CanvasRenderingContext2D,
  slots: CollectionSlot[],
  startX: number,
  startY: number,
  time: number,
  mx: number,
  my: number,
) {
  for (let i = 0; i < slots.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = startX + col * (SLOT_W + GAP);
    const y = startY + row * (SLOT_H + GAP);
    const slot = slots[i];
    const discovered = slot.record !== null;

    const isHovered = mx > x && mx < x + SLOT_W && my > y && my < y + SLOT_H;

    ctx.fillStyle = discovered
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(x, y, SLOT_W, SLOT_H, 12);
    ctx.fill();

    ctx.strokeStyle = discovered
      ? `rgba(255,255,255,${isHovered ? 0.3 : 0.1})`
      : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = discovered && isHovered ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, SLOT_W, SLOT_H, 12);
    ctx.stroke();

    if (discovered) {
      const color = DINO_COLORS[slot.species] ?? '#4CAF50';
      const bob = Math.sin(time * 2 + i * 0.7) * 2;
      drawDino(ctx, x + SLOT_W / 2, y + 30 + bob, 35, color, false, slot.species, 0, slot.version);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot.label, x + SLOT_W / 2, y + SLOT_H - 18);

      if (slot.record) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px Fredoka, sans-serif';
        ctx.fillText(`seen ${slot.record.encounters}x`, x + SLOT_W / 2, y + SLOT_H - 7);
      }

      if (isHovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.3)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, SLOT_W, SLOT_H, 12);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', x + SLOT_W / 2, y + 42);

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px Fredoka, sans-serif';
      ctx.fillText('???', x + SLOT_W / 2, y + SLOT_H - 18);

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '9px Fredoka, sans-serif';
      ctx.fillText('undiscovered', x + SLOT_W / 2, y + SLOT_H - 7);
    }
  }
}

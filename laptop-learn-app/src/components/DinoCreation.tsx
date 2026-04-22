import { useRef, useCallback } from 'react';
import { drawDino, drawCustomCursor } from '../games/shared/draw';
import { useGameCanvas } from '../games/shared/useGameCanvas';
import { playPop, playCelebration } from '../games/shared/audio';
import { AVATAR_SPECIES, AVATAR_COLORS, setAvatar } from '../games/shared/avatar';
import type { Avatar } from '../games/shared/avatar';
import { getActiveProfile } from '../games/shared/profile';
import { spawnCelebration, updateParticles, drawParticles } from '../games/shared/particles';
import type { Particle } from '../games/shared/types';

const W = 800;
const H = 600;

type Step = 'species' | 'color' | 'done';

interface Hit {
  kind: 'species' | 'color' | 'next' | 'back';
  index?: number;
  rect: { x: number; y: number; w: number; h: number };
}

export function DinoCreation({ onDone }: { onDone: () => void }) {
  const stepRef = useRef<Step>('species');
  const speciesRef = useRef(0);
  const colorRef = useRef(0);
  const hitsRef = useRef<Hit[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const finish = useCallback(() => {
    const avatar: Avatar = {
      species: AVATAR_SPECIES[speciesRef.current].species,
      color: AVATAR_COLORS[colorRef.current].value,
    };
    setAvatar(avatar);
    playCelebration();
    onDone();
  }, [onDone]);

  const { canvasRef } = useGameCanvas({
    width: W,
    height: H,
    title: 'Meet your dino',
    onDraw(ctx, mouse, dt) {
      particlesRef.current = updateParticles(particlesRef.current, dt);
      const hits: Hit[] = [];

      // background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#7DC4E8');
      bg.addColorStop(0.5, '#A8D8A8');
      bg.addColorStop(1, '#6BA67A');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // sparkles
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 137) % W);
        const sy = 40 + ((i * 73) % 240);
        const a = 0.15 + Math.sin(mouse.time * 1.6 + i) * 0.15;
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const step = stepRef.current;
      const speciesIdx = speciesRef.current;
      const colorIdx = colorRef.current;

      // title
      const title = step === 'species' ? 'Pick your dino!' : 'Pick a color!';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.font = 'bold 38px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(title, W / 2, 70);
      ctx.fillText(title, W / 2, 70);

      // subtitle: active profile
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '14px Fredoka, sans-serif';
      ctx.fillText(`Choosing for ${getActiveProfile()}`, W / 2, 94);

      // preview dino (large)
      const previewCx = W / 2;
      const previewCy = step === 'species' ? 210 : 220;
      const bob = Math.sin(mouse.time * 2.5) * 5;
      drawDino(
        ctx,
        previewCx,
        previewCy + bob,
        step === 'species' ? 90 : 110,
        AVATAR_COLORS[colorIdx].value,
        false,
        AVATAR_SPECIES[speciesIdx].species,
        0,
        0,
      );

      if (step === 'species') {
        // species picker row
        const rowY = 360;
        const gap = 14;
        const boxW = 120;
        const boxH = 150;
        const totalW = AVATAR_SPECIES.length * boxW + (AVATAR_SPECIES.length - 1) * gap;
        const startX = (W - totalW) / 2;

        for (let i = 0; i < AVATAR_SPECIES.length; i++) {
          const x = startX + i * (boxW + gap);
          const y = rowY;
          const selected = i === speciesIdx;
          const hovered =
            mouse.mouseX >= x && mouse.mouseX <= x + boxW &&
            mouse.mouseY >= y && mouse.mouseY <= y + boxH;

          ctx.save();
          ctx.fillStyle = selected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.roundRect(x, y, boxW, boxH, 16);
          ctx.fill();
          if (selected || hovered) {
            ctx.shadowColor = selected ? 'rgba(76,175,80,0.6)' : 'rgba(255,255,255,0.4)';
            ctx.shadowBlur = selected ? 18 : 10;
            ctx.strokeStyle = selected ? '#4CAF50' : 'rgba(255,255,255,0.9)';
            ctx.lineWidth = selected ? 4 : 2;
            ctx.beginPath();
            ctx.roundRect(x, y, boxW, boxH, 16);
            ctx.stroke();
          }
          ctx.restore();

          // dino sprite
          const sBob = selected ? Math.sin(mouse.time * 4) * 3 : 0;
          drawDino(
            ctx,
            x + boxW / 2,
            y + boxH / 2 - 8 + sBob,
            55,
            AVATAR_COLORS[colorIdx].value,
            false,
            AVATAR_SPECIES[i].species,
            0,
            0,
          );

          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.font = 'bold 13px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(AVATAR_SPECIES[i].label, x + boxW / 2, y + boxH - 14);

          hits.push({ kind: 'species', index: i, rect: { x, y, w: boxW, h: boxH } });
        }
      } else {
        // color picker grid
        const perRow = 4;
        const rows = Math.ceil(AVATAR_COLORS.length / perRow);
        const boxW = 100;
        const boxH = 70;
        const gap = 12;
        const gridW = perRow * boxW + (perRow - 1) * gap;
        const startX = (W - gridW) / 2;
        const startY = 340;

        for (let i = 0; i < AVATAR_COLORS.length; i++) {
          const col = i % perRow;
          const row = Math.floor(i / perRow);
          const x = startX + col * (boxW + gap);
          const y = startY + row * (boxH + gap);
          const selected = i === colorIdx;
          const hovered =
            mouse.mouseX >= x && mouse.mouseX <= x + boxW &&
            mouse.mouseY >= y && mouse.mouseY <= y + boxH;

          ctx.save();
          ctx.fillStyle = AVATAR_COLORS[i].value;
          ctx.beginPath();
          ctx.roundRect(x, y, boxW, boxH, 14);
          ctx.fill();
          if (selected || hovered) {
            ctx.shadowColor = selected ? '#fff' : 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = selected ? 18 : 8;
            ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.7)';
            ctx.lineWidth = selected ? 4 : 2;
            ctx.beginPath();
            ctx.roundRect(x, y, boxW, boxH, 14);
            ctx.stroke();
          }
          ctx.restore();

          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.font = 'bold 12px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(AVATAR_COLORS[i].label, x + boxW / 2, y + boxH - 10);
          // subtle checkmark on selected
          if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.font = 'bold 22px Fredoka, sans-serif';
            ctx.fillText('✓', x + boxW / 2, y + boxH / 2);
          }

          hits.push({ kind: 'color', index: i, rect: { x, y, w: boxW, h: boxH } });
        }

        // back button
        const backW = 120;
        const backH = 54;
        const backX = W / 2 - 200;
        const backY = H - 90;
        const backHover =
          mouse.mouseX >= backX && mouse.mouseX <= backX + backW &&
          mouse.mouseY >= backY && mouse.mouseY <= backY + backH;
        ctx.save();
        ctx.fillStyle = backHover ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.roundRect(backX, backY, backW, backH, 14);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← Back', backX + backW / 2, backY + backH / 2 + 6);
        ctx.restore();
        hits.push({ kind: 'back', rect: { x: backX, y: backY, w: backW, h: backH } });
      }

      // next/done button
      const btnW = step === 'species' ? 180 : 180;
      const btnH = 54;
      const btnX = step === 'species' ? (W - btnW) / 2 : W / 2 + 20;
      const btnY = H - 90;
      const btnHover =
        mouse.mouseX >= btnX && mouse.mouseX <= btnX + btnW &&
        mouse.mouseY >= btnY && mouse.mouseY <= btnY + btnH;

      ctx.save();
      const btnPulse = 1 + Math.sin(mouse.time * 3) * 0.03;
      ctx.shadowColor = 'rgba(76,175,80,0.5)';
      ctx.shadowBlur = btnHover ? 20 : 12;
      ctx.fillStyle = '#4CAF50';
      ctx.translate(btnX + btnW / 2, btnY + btnH / 2);
      ctx.scale(btnPulse, btnPulse);
      ctx.translate(-(btnX + btnW / 2), -(btnY + btnH / 2));
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 14);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(step === 'species' ? 'Next →' : "That's my dino!", btnX + btnW / 2, btnY + btnH / 2 + 7);
      hits.push({ kind: 'next', rect: { x: btnX, y: btnY, w: btnW, h: btnH } });

      drawParticles(ctx, particlesRef.current);
      drawCustomCursor(ctx, mouse.mouseX, mouse.mouseY, !mouse.isTouch, mouse.mouseDown);

      hitsRef.current = hits;
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

      for (const hit of hitsRef.current) {
        if (
          mx >= hit.rect.x && mx <= hit.rect.x + hit.rect.w &&
          my >= hit.rect.y && my <= hit.rect.y + hit.rect.h
        ) {
          if (hit.kind === 'species' && hit.index !== undefined) {
            speciesRef.current = hit.index;
            playPop();
            particlesRef.current.push(
              ...spawnCelebration(hit.rect.x + hit.rect.w / 2, hit.rect.y + hit.rect.h / 2, 4),
            );
          } else if (hit.kind === 'color' && hit.index !== undefined) {
            colorRef.current = hit.index;
            playPop();
            particlesRef.current.push(
              ...spawnCelebration(hit.rect.x + hit.rect.w / 2, hit.rect.y + hit.rect.h / 2, 4),
            );
          } else if (hit.kind === 'next') {
            if (stepRef.current === 'species') {
              stepRef.current = 'color';
              playPop();
            } else {
              finish();
            }
          } else if (hit.kind === 'back') {
            stepRef.current = 'species';
            playPop();
          }
          break;
        }
      }
    },
    [finish],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      role="application"
      aria-label="Create your baby dinosaur"
      style={{ cursor: 'none', borderRadius: 16, display: 'block', width: '100%', maxWidth: W }}
    />
  );
}

import { useState, useEffect, useCallback } from 'react';
import { loadStickers } from '../games/shared/stickers';
import { isEasyMode, toggleEasyMode } from '../games/shared/easyMode';

const TIMER_KEY = 'dinoLearn_timerMinutes';
const PROGRESS_KEY = 'dinoLearn_progress';

function getTimerMinutes(): number {
  try {
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) return Math.max(0, parseInt(saved, 10) || 0);
  } catch {}
  return 0;
}

function setTimerMinutes(mins: number) {
  try {
    localStorage.setItem(TIMER_KEY, String(Math.max(0, mins)));
  } catch {}
}

function getProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch {}
  return {};
}

function resetProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem('dinoLearn_stickers');
    localStorage.removeItem('dinoLearn_collection');
  } catch {}
}

const GAME_NAMES: Record<string, string> = {
  'egg-hunt': 'Dino Egg Hunt',
  'dino-path': 'Dino Path',
  'spell-dino': 'Spell the Dino',
  'volcano': 'Volcano Escape',
  'dino-match': 'Dino Match',
  'jungle-explorer': 'Jungle Explorer',
};

export function ParentDashboard({ onClose, onTimerRestart }: { onClose: () => void; onTimerRestart: () => void }) {
  const [timer, setTimer] = useState(getTimerMinutes());
  const [easyMode, setEasyMode] = useState(isEasyMode());
  const [progress, setProgress] = useState(getProgress());
  const [stickers, setStickers] = useState(loadStickers());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setProgress(getProgress());
    setStickers(loadStickers());
  }, []);

  const handleTimerChange = useCallback((mins: number) => {
    setTimer(mins);
    setTimerMinutes(mins);
    onTimerRestart();
  }, [onTimerRestart]);

  const handleEasyModeToggle = useCallback(() => {
    const next = toggleEasyMode();
    setEasyMode(next);
  }, []);

  const handleReset = useCallback(() => {
    resetProgress();
    setProgress({});
    setStickers(loadStickers());
    setShowResetConfirm(false);
  }, []);

  const earnedCount = stickers.filter((s) => s.earned).length;
  const totalCompletions = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      fontFamily: 'Fredoka, sans-serif',
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: 20,
        border: '2px solid rgba(255,255,255,0.15)',
        width: '90%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 28,
        color: '#fff',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, color: '#FFD700' }}>Parent Dashboard</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'Fredoka, sans-serif',
            }}
          >
            Close
          </button>
        </div>

        {/* Time Limit */}
        <Section title="Time Limit">
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 12px' }}>
            Set a play time limit. When time runs out, the session ends with a friendly screen.
            Set to 0 for unlimited play.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 10, 15, 20, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleTimerChange(mins)}
                style={{
                  background: timer === mins ? '#4CAF50' : 'rgba(255,255,255,0.08)',
                  border: timer === mins ? '2px solid #66BB6A' : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: timer === mins ? 'bold' : 'normal',
                }}
              >
                {mins === 0 ? 'No limit' : `${mins} min`}
              </button>
            ))}
          </div>
          {timer > 0 && (
            <button
              onClick={onTimerRestart}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 13,
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'Fredoka, sans-serif',
                marginTop: 10,
              }}
            >
              Restart Timer Now
            </button>
          )}
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '8px 0 0' }}>
            Current: {timer === 0 ? 'Unlimited' : `${timer} minutes`}.
            Selecting a time starts it immediately.
          </p>
        </Section>

        {/* Easy Mode */}
        <Section title="Easy Mode">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleEasyModeToggle}
              style={{
                background: easyMode ? '#4CAF50' : 'rgba(255,255,255,0.08)',
                border: easyMode ? '2px solid #66BB6A' : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
                padding: '8px 18px',
                cursor: 'pointer',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: easyMode ? 'bold' : 'normal',
              }}
            >
              {easyMode ? 'ON' : 'OFF'}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Bigger hit areas, hints, and fewer cards in matching game
            </span>
          </div>
        </Section>

        {/* Progress */}
        <Section title="Progress">
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <StatCard label="Total Completions" value={totalCompletions} color="#4ECDC4" />
            <StatCard label="Stickers Earned" value={`${earnedCount}/${stickers.length}`} color="#FFD700" />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
          }}>
            {Object.entries(GAME_NAMES).map(([key, name]) => (
              <div key={key} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding: '10px 14px',
              }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{progress[key] ?? 0}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>completions</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Stickers Detail */}
        <Section title="Stickers">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 8,
          }}>
            {stickers.map((s) => (
              <div key={s.id} style={{
                background: s.earned ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.03)',
                border: s.earned ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '8px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22 }}>{s.earned ? s.emoji : '🔒'}</div>
                <div style={{ fontSize: 11, color: s.earned ? '#fff' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {s.name}
                </div>
                {!s.earned && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    {s.progress}/{s.threshold}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Reset */}
        <Section title="Reset Data">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                background: 'rgba(244,67,54,0.15)',
                border: '2px solid rgba(244,67,54,0.3)',
                borderRadius: 10,
                color: '#EF5350',
                fontSize: 14,
                padding: '8px 18px',
                cursor: 'pointer',
                fontFamily: 'Fredoka, sans-serif',
              }}
            >
              Reset All Progress
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: '#EF5350', fontSize: 13 }}>Are you sure?</span>
              <button
                onClick={handleReset}
                style={{
                  background: '#EF5350',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: 'Fredoka, sans-serif',
                }}
              >
                Yes, reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: 'Fredoka, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          )}
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '8px 0 0' }}>
            This clears all stickers and game progress. Settings are kept.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{
        margin: '0 0 10px',
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 6,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: '12px 18px',
      borderLeft: `4px solid ${color}`,
      minWidth: 130,
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

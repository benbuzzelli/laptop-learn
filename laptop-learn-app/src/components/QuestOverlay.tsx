import type { Quest, QuestStep } from '../games/shared/quests';
import { getQuillEmoteUrl } from '../games/shared/quill';
import type { QuillEmote } from '../games/shared/quill';

export type QuestOverlayMode =
  | { kind: 'intro'; quest: Quest; alreadyCompletedToday: boolean }
  | { kind: 'stepComplete'; quest: Quest; nextStep: QuestStep; stepIndex: number }
  | { kind: 'questComplete'; quest: Quest }
  | null;

interface QuestOverlayProps {
  mode: QuestOverlayMode;
  onAccept?: () => void;
  onContinue?: () => void;
  onClose: () => void;
  onGoToGame?: (gameId: string) => void;
}

const bgColor = 'rgba(0,0,0,0.6)';
const cardBg = 'linear-gradient(180deg, #fff7e0 0%, #ffe4b5 100%)';

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 'min(620px, 94vw)',
        maxHeight: '90dvh',
        overflow: 'auto',
        background: cardBg,
        color: '#3E2723',
        borderRadius: 22,
        border: '3px solid #8D6E63',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        padding: 28,
        fontFamily: 'Fredoka, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function TitleBanner({ emote, title, subtitle }: { emote: QuillEmote; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        background: 'rgba(255,255,255,0.8)',
        borderRadius: '50%',
        padding: 6,
        border: '3px solid #8D6E63',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      }}>
        <img
          src={getQuillEmoteUrl(emote)}
          alt="Quill"
          style={{ width: 108, height: 108, objectFit: 'contain', display: 'block', borderRadius: '50%' }}
        />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 16, opacity: 0.7, marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  );
}

function BigButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? '#4CAF50' : 'rgba(255,255,255,0.7)',
        color: primary ? '#fff' : '#3E2723',
        border: primary ? 'none' : '2px solid rgba(0,0,0,0.2)',
        borderRadius: 14,
        padding: '14px 22px',
        fontFamily: 'inherit',
        fontSize: 20,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: primary ? '0 4px 12px rgba(76,175,80,0.4)' : 'none',
        flex: 1,
      }}
    >
      {label}
    </button>
  );
}

export function QuestOverlay({ mode, onAccept, onContinue, onClose, onGoToGame }: QuestOverlayProps) {
  if (!mode) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: bgColor,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mode.kind === 'intro' && (
        <CardShell>
          <TitleBanner
            emote={mode.quest.introEmote ?? 'confident-ready'}
            title={mode.quest.title}
            subtitle="Today's Adventure"
          />
          <div style={{ fontSize: 19, lineHeight: 1.5, padding: '4px 8px' }}>
            {mode.quest.intro}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 12,
            padding: 12,
            border: '1px dashed rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>
              This quest has {mode.quest.steps.length} steps:
            </div>
            {mode.quest.steps.map((s, i) => (
              <div key={i} style={{ fontSize: 16, padding: '3px 0' }}>
                {i + 1}. {s.callToAction}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, opacity: 0.8, textAlign: 'center' }}>
            Reward: {mode.quest.reward.emoji} {mode.quest.reward.name} sticker
          </div>
          {mode.alreadyCompletedToday ? (
            <>
              <div style={{
                textAlign: 'center',
                fontSize: 16,
                color: '#2E7D32',
                fontWeight: 700,
              }}>
                ✓ You finished today's quest! Come back tomorrow.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <BigButton label="Thanks!" onClick={onClose} primary />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <BigButton label="Later" onClick={onClose} />
              <BigButton label="Let's go!" onClick={() => onAccept?.()} primary />
            </div>
          )}
        </CardShell>
      )}

      {mode.kind === 'stepComplete' && (
        <CardShell>
          <TitleBanner
            emote={mode.nextStep.emote ?? 'excited'}
            title="Great job!"
            subtitle={`Step ${mode.stepIndex} of ${mode.quest.steps.length} complete`}
          />
          <div style={{ fontSize: 19, lineHeight: 1.5, padding: '4px 8px' }}>
            {mode.nextStep.narrative}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.8)',
            borderRadius: 12,
            padding: 14,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 700,
          }}>
            Next: {mode.nextStep.callToAction}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <BigButton label="Later" onClick={onClose} />
            <BigButton
              label="Go!"
              onClick={() => onGoToGame?.(mode.nextStep.gameId)}
              primary
            />
          </div>
        </CardShell>
      )}

      {mode.kind === 'questComplete' && (
        <CardShell>
          <TitleBanner
            emote={mode.quest.outroEmote ?? 'grateful'}
            title="Quest Complete!"
            subtitle={mode.quest.title}
          />
          <div style={{ fontSize: 19, lineHeight: 1.5, padding: '4px 8px' }}>
            {mode.quest.outro}
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #ffecb3 0%, #ffd54f 100%)',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            border: '3px dashed #f9a825',
          }}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>{mode.quest.reward.emoji}</div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 6 }}>New sticker!</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{mode.quest.reward.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <BigButton label="Awesome!" onClick={() => onContinue?.()} primary />
          </div>
        </CardShell>
      )}
    </div>
  );
}

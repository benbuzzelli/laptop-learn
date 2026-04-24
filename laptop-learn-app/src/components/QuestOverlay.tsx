import type { Quest, QuestStep } from '../games/shared/quests';
import { getQuillBillboardUrl, billboardFromEmote } from '../games/shared/quill';
import type { QuillBillboard } from '../games/shared/quill';

export type QuestOverlayMode =
  | { kind: 'intro'; quest: Quest; alreadyCompletedToday: boolean }
  | { kind: 'stepComplete'; quest: Quest; nextStep: QuestStep; stepIndex: number }
  | { kind: 'questComplete'; quest: Quest }
  | { kind: 'quillIntro' }
  | { kind: 'questContinue'; quest: Quest; currentStep: QuestStep; stepIndex: number }
  | null;

interface QuestOverlayProps {
  mode: QuestOverlayMode;
  onAccept?: () => void;
  onContinue?: () => void;
  onClose: () => void;
  onGoToGame?: (gameId: string) => void;
  onMeetQuillDone?: () => void;
}

const bgColor = 'rgba(0,0,0,0.6)';

// Billboard PNGs are ~593×650 (portrait) stone tablets with Quill peeking
// over the top-left. The papyrus text zone is inset from the frame runes;
// Quill's head overhangs the TOP of the tablet, so the text area starts
// below where he is.
// Debug toggle — shows a translucent blue rectangle behind the text zone
// so we can verify content aligns with the billboard's papyrus area.
const DEBUG_TEXT_ZONE = false;

function CardShell({
  billboard,
  children,
  footer,
}: {
  billboard: QuillBillboard;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: 'min(440px, 88vw)',
        aspectRatio: '593 / 653',
        maxHeight: '88dvh',
        fontFamily: 'Fredoka, sans-serif',
        color: '#3E2723',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
      }}
    >
      <img
        src={getQuillBillboardUrl(billboard)}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          // Papyrus text zone inside the stone tablet, below where Quill peeks
          // from the top-left. The bottom rune bar is ~11% tall; sides ~10%.
          top: '38%',
          bottom: '12%',
          left: '14%',
          right: '14%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          minHeight: 0,
          background: DEBUG_TEXT_ZONE ? 'rgba(30,120,220,0.35)' : 'transparent',
          outline: DEBUG_TEXT_ZONE ? '2px dashed rgba(30,120,220,0.8)' : 'none',
        }}
      >
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 0,
            paddingRight: 4,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              flex: '0 0 auto',
              paddingTop: 8,
              paddingBottom: 2,
              // give button drop-shadows room so they don't look clipped
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function TitleBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: 0.3,
        color: '#3E2723',
        textShadow: '0 1px 0 rgba(255,240,200,0.75), 0 2px 3px rgba(62,39,35,0.18)',
      }}>{title}</div>
      {subtitle && (
        <div style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.6,
          color: '#6D4C41',
          fontWeight: 600,
        }}>{subtitle}</div>
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
  const primaryBg = 'linear-gradient(180deg, #7CC07A 0%, #4CAF50 55%, #2E7D32 100%)';
  const secondaryBg = 'linear-gradient(180deg, #F3E0B3 0%, #DEC08C 55%, #B89266 100%)';
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? primaryBg : secondaryBg,
        color: primary ? '#fff' : '#3E2723',
        border: `2px solid ${primary ? '#2E5D2F' : '#6F4E37'}`,
        borderRadius: 12,
        padding: '9px 14px',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 0.3,
        cursor: 'pointer',
        textShadow: primary
          ? '0 1px 1px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(255,250,220,0.6)',
        boxShadow: primary
          ? '0 3px 0 #1B5E20, 0 5px 10px rgba(46,125,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
          : '0 3px 0 #6F4E37, 0 5px 10px rgba(60,40,20,0.3), inset 0 1px 0 rgba(255,250,220,0.6)',
        flex: 1,
        transform: 'translateY(0)',
        transition: 'transform 100ms, box-shadow 100ms',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(2px)';
        e.currentTarget.style.boxShadow = primary
          ? '0 1px 0 #1B5E20, 0 2px 6px rgba(46,125,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
          : '0 1px 0 #6F4E37, 0 2px 6px rgba(60,40,20,0.3), inset 0 1px 0 rgba(255,250,220,0.6)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = primary
          ? '0 3px 0 #1B5E20, 0 5px 10px rgba(46,125,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
          : '0 3px 0 #6F4E37, 0 5px 10px rgba(60,40,20,0.3), inset 0 1px 0 rgba(255,250,220,0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = primary
          ? '0 3px 0 #1B5E20, 0 5px 10px rgba(46,125,50,0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
          : '0 3px 0 #6F4E37, 0 5px 10px rgba(60,40,20,0.3), inset 0 1px 0 rgba(255,250,220,0.6)';
      }}
    >
      {label}
    </button>
  );
}

function stepBillboard(step: QuestStep): QuillBillboard {
  if (step.billboard) return step.billboard;
  if (step.emote) return billboardFromEmote(step.emote);
  return 'mischievous';
}

function introBillboardFor(q: Quest): QuillBillboard {
  if (q.introBillboard) return q.introBillboard;
  if (q.introEmote) return billboardFromEmote(q.introEmote);
  return 'neutral';
}

function outroBillboardFor(q: Quest): QuillBillboard {
  if (q.outroBillboard) return q.outroBillboard;
  if (q.outroEmote) return billboardFromEmote(q.outroEmote);
  return 'relieved';
}

export function QuestOverlay({ mode, onAccept, onContinue, onClose, onGoToGame, onMeetQuillDone }: QuestOverlayProps) {
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
        <CardShell
          billboard={introBillboardFor(mode.quest)}
          footer={
            mode.alreadyCompletedToday ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <BigButton label="Thanks!" onClick={onClose} primary />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <BigButton label="Later" onClick={onClose} />
                <BigButton label="Let's go!" onClick={() => onAccept?.()} primary />
              </div>
            )
          }
        >
          <TitleBanner
            title={mode.quest.title}
            subtitle="Today's Adventure"
          />
          <div style={{
            fontSize: 14,
            lineHeight: 1.45,
            padding: '2px 2px',
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            {mode.quest.intro}
          </div>
          <div style={{
            background: 'linear-gradient(180deg, rgba(231,205,155,0.55) 0%, rgba(206,176,123,0.45) 100%)',
            borderRadius: 10,
            padding: '8px 10px',
            border: '1px solid rgba(111,78,55,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,248,220,0.55), 0 1px 2px rgba(62,39,35,0.15)',
          }}>
            <div style={{
              fontSize: 10.5,
              opacity: 0.8,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              fontWeight: 600,
              color: '#6D4C41',
            }}>
              {mode.quest.steps.length} steps
            </div>
            {mode.quest.steps.map((s, i) => (
              <div key={i} style={{
                fontSize: 14,
                padding: '3px 0',
                borderTop: i === 0 ? 'none' : '1px dashed rgba(111,78,55,0.25)',
                color: '#3E2723',
              }}>
                <span style={{ fontWeight: 700, marginRight: 4, color: '#6F4E37' }}>{i + 1}.</span>
                {s.callToAction}
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 13,
            textAlign: 'center',
            color: '#6F4E37',
            fontStyle: 'italic',
          }}>
            Reward: <span style={{ fontStyle: 'normal', fontWeight: 700, color: '#3E2723' }}>{mode.quest.reward.emoji} {mode.quest.reward.name}</span> sticker
          </div>
          {mode.alreadyCompletedToday && (
            <div style={{
              textAlign: 'center',
              fontSize: 14,
              color: '#2E7D32',
              fontWeight: 700,
            }}>
              ✓ You finished today's quest! Come back tomorrow.
            </div>
          )}
        </CardShell>
      )}

      {mode.kind === 'stepComplete' && (
        <CardShell
          billboard={stepBillboard(mode.nextStep)}
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <BigButton label="Later" onClick={onClose} />
              <BigButton
                label="Go!"
                onClick={() => onGoToGame?.(mode.nextStep.gameId)}
                primary
              />
            </div>
          }
        >
          <TitleBanner
            title="Great job!"
            subtitle={`Step ${mode.stepIndex} of ${mode.quest.steps.length} complete`}
          />
          <div style={{
            fontSize: 14,
            lineHeight: 1.45,
            padding: '2px 2px',
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            {mode.nextStep.narrative}
          </div>
          <div style={{
            background: 'linear-gradient(180deg, #6D4C41 0%, #4E342E 100%)',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            border: '1px solid #3E2723',
            color: '#FFECB3',
            letterSpacing: 0.3,
            textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            boxShadow: 'inset 0 1px 0 rgba(255,236,179,0.2), 0 2px 4px rgba(62,39,35,0.3)',
          }}>
            <span style={{ opacity: 0.75, fontSize: 10, letterSpacing: 2, marginRight: 6, textTransform: 'uppercase' }}>Next</span>
            {mode.nextStep.callToAction}
          </div>
        </CardShell>
      )}

      {mode.kind === 'quillIntro' && (
        <CardShell
          billboard="neutral"
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <BigButton label="Nice to meet you, Quill!" onClick={() => onMeetQuillDone?.()} primary />
            </div>
          }
        >
          <TitleBanner title="Hi there!" subtitle="Nice to meet you" />
          <div style={{
            fontSize: 14,
            lineHeight: 1.45,
            padding: '2px 2px',
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            I'm <strong>Quill</strong>, the valley's quest keeper! Every day I find
            new adventures for brave little dinos like you. Tap me whenever you want
            a new quest, and I'll tell you who needs help and where to go.
          </div>
          <div style={{
            background: 'linear-gradient(180deg, rgba(231,205,155,0.55) 0%, rgba(206,176,123,0.45) 100%)',
            borderRadius: 10,
            padding: 10,
            border: '1px solid rgba(111,78,55,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,248,220,0.55), 0 1px 2px rgba(62,39,35,0.15)',
            fontSize: 13,
            lineHeight: 1.45,
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            Finish a quest and I'll give you a special sticker. Let's help the valley
            together!
          </div>
        </CardShell>
      )}

      {mode.kind === 'questContinue' && (
        <CardShell
          billboard={stepBillboard(mode.currentStep)}
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <BigButton label="Later" onClick={onClose} />
              <BigButton
                label="Go!"
                onClick={() => onGoToGame?.(mode.currentStep.gameId)}
                primary
              />
            </div>
          }
        >
          <TitleBanner
            title={mode.quest.title}
            subtitle={`Step ${mode.stepIndex + 1} of ${mode.quest.steps.length}`}
          />
          <div style={{
            fontSize: 14,
            lineHeight: 1.45,
            padding: '2px 2px',
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            {mode.currentStep.narrative}
          </div>
          <div style={{
            background: 'linear-gradient(180deg, #6D4C41 0%, #4E342E 100%)',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            border: '1px solid #3E2723',
            color: '#FFECB3',
            letterSpacing: 0.3,
            textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            boxShadow: 'inset 0 1px 0 rgba(255,236,179,0.2), 0 2px 4px rgba(62,39,35,0.3)',
          }}>
            <span style={{ opacity: 0.75, fontSize: 10, letterSpacing: 2, marginRight: 6, textTransform: 'uppercase' }}>Next</span>
            {mode.currentStep.callToAction}
          </div>
        </CardShell>
      )}

      {mode.kind === 'questComplete' && (
        <CardShell
          billboard={outroBillboardFor(mode.quest)}
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <BigButton label="Awesome!" onClick={() => onContinue?.()} primary />
            </div>
          }
        >
          <TitleBanner
            title="Quest Complete!"
            subtitle={mode.quest.title}
          />
          <div style={{
            fontSize: 14,
            lineHeight: 1.45,
            padding: '2px 2px',
            color: '#3E2723',
            textShadow: '0 1px 0 rgba(255,245,210,0.6)',
          }}>
            {mode.quest.outro}
          </div>
          <div style={{
            background: 'radial-gradient(circle at 50% 30%, #FFF3C4 0%, #FFD54F 50%, #F9A825 100%)',
            borderRadius: 14,
            padding: 12,
            textAlign: 'center',
            border: '2px solid #C17A00',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 10px rgba(201,122,0,0.35)',
          }}>
            <div style={{ fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>{mode.quest.reward.emoji}</div>
            <div style={{
              fontSize: 10.5,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#8B4513',
              fontWeight: 700,
            }}>New sticker</div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#3E2723',
              letterSpacing: 0.3,
              textShadow: '0 1px 0 rgba(255,255,255,0.55)',
            }}>{mode.quest.reward.name}</div>
          </div>
        </CardShell>
      )}
    </div>
  );
}

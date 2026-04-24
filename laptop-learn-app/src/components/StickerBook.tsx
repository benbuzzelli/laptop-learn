import { useMemo, useState } from 'react';
import { loadStickers, getStickerImageUrl, QUEST_STICKER_GAME } from '../games/shared/stickers';
import type { StickerWithProgress } from '../games/shared/stickers';
import { playPop } from '../games/shared/audio';

const GAME_LABELS: Record<string, string> = {
  'egg-hunt': 'Egg Hunt',
  'dino-path': 'Dino Path',
  'spell-dino': 'Spell Dino',
  'volcano': 'Volcano Escape',
  'dino-match': 'Dino Match',
  'jungle-explorer': 'Jungle Explorer',
  'dino-dungeon': 'Dino Dungeon',
  [QUEST_STICKER_GAME]: 'Quest Rewards',
};

function StickerCard({ sticker, onTap }: { sticker: StickerWithProgress; onTap: () => void }) {
  const imageUrl = getStickerImageUrl(sticker.id);
  const hasImage = !!imageUrl;

  return (
    <button
      onClick={onTap}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        cursor: 'pointer',
        minHeight: 150,
        fontFamily: 'inherit',
        transition: 'transform 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        width: 104,
        height: 104,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: sticker.earned
          ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
          : 'grayscale(1) opacity(0.4) drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
      }}>
        {hasImage ? (
          <img
            src={imageUrl}
            alt={sticker.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div style={{
            fontSize: 72,
            lineHeight: 1,
          }}>{sticker.emoji}</div>
        )}
      </div>

      {/* Wooden placard */}
      <Placard label={sticker.earned ? sticker.name : '???'} dim={!sticker.earned} />
    </button>
  );
}

function Placard({ label, dim = false }: { label: string; dim?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        minWidth: '85%',
        maxWidth: '100%',
        // wood-tone gradient plank with carved edges
        background: dim
          ? 'linear-gradient(180deg, #A48E70 0%, #8B6F4E 55%, #6F4E37 100%)'
          : 'linear-gradient(180deg, #C9A77A 0%, #A47F52 55%, #7A5A38 100%)',
        border: `2px solid ${dim ? '#4E342E' : '#5D3E1F'}`,
        borderRadius: 10,
        padding: '5px 12px',
        boxShadow: dim
          ? '0 2px 0 rgba(62,39,35,0.35), inset 0 1px 0 rgba(255,240,200,0.22)'
          : '0 3px 0 rgba(62,39,35,0.45), 0 5px 10px rgba(62,39,35,0.25), inset 0 1px 0 rgba(255,240,200,0.45)',
        color: dim ? 'rgba(255,245,220,0.55)' : '#FFF5DC',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 0.3,
        lineHeight: 1.2,
        textShadow: '0 1px 1px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {/* tiny nail-head accents on the corners */}
      <span style={{
        position: 'absolute', top: 3, left: 4, width: 4, height: 4,
        borderRadius: '50%', background: dim ? '#3E2723' : '#2E1B0E',
        boxShadow: 'inset 0 1px 0 rgba(255,230,180,0.4)',
      }} />
      <span style={{
        position: 'absolute', top: 3, right: 4, width: 4, height: 4,
        borderRadius: '50%', background: dim ? '#3E2723' : '#2E1B0E',
        boxShadow: 'inset 0 1px 0 rgba(255,230,180,0.4)',
      }} />
      {label}
    </div>
  );
}

export function StickerBook({ onBack }: { onBack: () => void }) {
  const stickers = useMemo(() => loadStickers(), []);
  const [detail, setDetail] = useState<StickerWithProgress | null>(null);

  const earnedCount = stickers.filter((s) => s.earned).length;

  const byGame = useMemo(() => {
    const groups: Record<string, StickerWithProgress[]> = {};
    for (const s of stickers) {
      if (!groups[s.game]) groups[s.game] = [];
      groups[s.game].push(s);
    }
    return groups;
  }, [stickers]);

  // Stable display order: known games first, quests last
  const gameOrder = [
    'egg-hunt',
    'jungle-explorer',
    'dino-match',
    'spell-dino',
    'volcano',
    'dino-dungeon',
    'dino-path',
    QUEST_STICKER_GAME,
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 900,
        height: '100dvh',
        maxHeight: 700,
        background: 'linear-gradient(180deg, #FFE4B5 0%, #FFD9A3 60%, #D7B48B 100%)',
        borderRadius: 16,
        color: '#3E2723',
        fontFamily: 'Fredoka, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 22px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '2px dashed rgba(111,78,55,0.3)',
      }}>
        <button
          onClick={() => { playPop(); onBack(); }}
          style={{
            background: 'rgba(255,255,255,0.7)',
            color: '#3E2723',
            border: '2px solid rgba(111,78,55,0.4)',
            borderRadius: 12,
            padding: '8px 16px',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 0 rgba(111,78,55,0.4)',
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>Sticker Book</div>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 4 }}>
            ⭐ {earnedCount} of {stickers.length} collected
          </div>
        </div>
      </div>

      {/* Grid body */}
      <div style={{
        flex: '1 1 auto',
        overflowY: 'auto',
        padding: '14px 22px 22px',
      }}>
        {gameOrder.map((gameId) => {
          const group = byGame[gameId];
          if (!group?.length) return null;
          const earnedInGroup = group.filter((s) => s.earned).length;
          return (
            <section key={gameId} style={{ marginBottom: 18 }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: '#6D4C41',
                margin: '0 0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>{GAME_LABELS[gameId] ?? gameId}</span>
                <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500, letterSpacing: 0 }}>
                  {earnedInGroup}/{group.length}
                </span>
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 10,
              }}>
                {group.map((s) => (
                  <StickerCard key={s.id} sticker={s} onTap={() => { playPop(); setDetail(s); }} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Detail modal */}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #fff7e0 0%, #ffe4b5 100%)',
              color: '#3E2723',
              borderRadius: 18,
              border: '3px solid #8D6E63',
              padding: 22,
              width: 'min(380px, 90vw)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{
              width: 180,
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {(() => {
                const url = getStickerImageUrl(detail.id);
                if (url) {
                  return (
                    <img
                      src={url}
                      alt={detail.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: detail.earned ? 'none' : 'grayscale(1) opacity(0.4)',
                      }}
                    />
                  );
                }
                return (
                  <div style={{
                    fontSize: 110,
                    filter: detail.earned ? 'none' : 'grayscale(1) opacity(0.4)',
                  }}>{detail.emoji}</div>
                );
              })()}
            </div>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.7 }}>
              {GAME_LABELS[detail.game] ?? detail.game}
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.15,
            }}>
              {detail.earned ? detail.name : 'Keep playing!'}
            </div>
            <div style={{ fontSize: 15, textAlign: 'center', opacity: 0.85, lineHeight: 1.4 }}>
              {detail.earned
                ? detail.game === QUEST_STICKER_GAME
                  ? `Earned by finishing Quill's quest.`
                  : `Earned after ${detail.threshold} win${detail.threshold === 1 ? '' : 's'}.`
                : detail.game === QUEST_STICKER_GAME
                  ? 'Finish this quest with Quill to earn it.'
                  : `Play ${GAME_LABELS[detail.game] ?? detail.game} to earn this sticker!`}
            </div>
            <button
              onClick={() => { playPop(); setDetail(null); }}
              style={{
                background: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 24px',
                fontSize: 17,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                marginTop: 4,
                boxShadow: '0 3px 0 #1B5E20',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ReviewResult, MoveAnalysis, MoveClassification } from '../../types/analysis';

interface ReviewPanelProps {
  review: ReviewResult;
  currentMoveAnalysis: MoveAnalysis | null;
  currentIndex: number;
  onMoveClick: (index: number) => void;
  /** White player name */
  whiteName?: string;
  /** Black player name */
  blackName?: string;
}

/* ── Classification metadata ────────────────────────────── */
type ClassRow = {
  key: MoveClassification | 'BRILLIANT' | 'VERY_GOOD' | 'EXCELLENT' | 'THEORETICAL';
  label: string;
  symbol: string;
  color: string;
};

const CLASS_ROWS: ClassRow[] = [
  { key: 'BRILLIANT',   label: 'Brilliant',   symbol: '!!', color: '#1eddb8' },
  { key: 'BEST',        label: 'Best',         symbol: '★',  color: '#f7c948' },
  { key: 'VERY_GOOD',   label: 'Very Good',    symbol: '!',  color: '#5fa836' },
  { key: 'EXCELLENT',   label: 'Excellent',    symbol: '●',  color: '#5da271' },
  { key: 'GOOD',        label: 'Good',         symbol: '✓',  color: '#5c8a3c' },
  { key: 'THEORETICAL', label: 'Theoretical',  symbol: '⊕',  color: '#9b9b9b' },
  { key: 'INACCURACY',  label: 'Inaccuracy',   symbol: '?!', color: '#f0a500' },
  { key: 'MISTAKE',     label: 'Mistake',      symbol: '?',  color: '#e07000' },
  { key: 'BLUNDER',     label: 'Blunder',      symbol: '??', color: '#c41e3a' },
];

/* Map backend classification strings to a count per side */
function countBy(
  moves: MoveAnalysis[],
  color: 'white' | 'black',
  key: string,
): number {
  return moves.filter(
    (m) => m.color === color && (m.classification as string) === key,
  ).length;
}

const accuracyBarColor = (acc: number): string => {
  if (acc >= 90) return '#4ade80';
  if (acc >= 75) return '#facc15';
  if (acc >= 60) return '#fb923c';
  return '#f87171';
};

const accuracyTextColor = (acc: number): string => {
  if (acc >= 90) return 'text-green-400';
  if (acc >= 75) return 'text-yellow-400';
  if (acc >= 60) return 'text-orange-400';
  return 'text-red-400';
};

const formatCp = (cp: number): string => {
  if (Math.abs(cp) >= 29000) return cp > 0 ? '+M' : '-M';
  const p = cp / 100;
  return p >= 0 ? `+${p.toFixed(2)}` : p.toFixed(2);
};

/* ── Small symbol badge ─────────────────────────────────── */
const SymbolBadge: React.FC<{ symbol: string; color: string; size?: 'sm' | 'md' }> = ({
  symbol,
  color,
  size = 'sm',
}) => {
  const dim = size === 'md' ? 'w-7 h-7 text-sm' : 'w-5 h-5 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${dim}`}
      style={{ backgroundColor: color + '28', color, border: `1.5px solid ${color}66` }}
    >
      {symbol}
    </span>
  );
};

/* ── MoveAnnotation inline ──────────────────────────────── */
const InlineAnnotation: React.FC<{ classification: MoveClassification }> = ({
  classification,
}) => {
  const row = CLASS_ROWS.find((r) => r.key === classification);
  if (!row) return null;
  return (
    <span
      className="text-xs font-bold ml-0.5"
      style={{ color: row.color }}
    >
      {row.symbol}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   REPORT TAB
═══════════════════════════════════════════════════════════ */
const ReportTab: React.FC<{
  review: ReviewResult;
  currentMoveAnalysis: MoveAnalysis | null;
  whiteName: string;
  blackName: string;
}> = ({ review, currentMoveAnalysis, whiteName, blackName }) => (
  <div className="flex flex-col gap-0 overflow-y-auto">
    {/* ── Opening ── */}
    {review.openingName && (
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-0.5">
          Opening
        </p>
        <p className="text-white text-sm font-medium">
          {review.openingName}
          {review.openingEco && (
            <span className="text-gray-400 font-normal ml-1">({review.openingEco})</span>
          )}
        </p>
      </div>
    )}

    {/* ── Player header ── */}
    <div className="px-4 py-3 border-b border-gray-800">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
        <span className="text-gray-400 text-xs font-semibold uppercase">Players</span>
        {/* White */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div
            className="w-9 h-9 rounded-full border-2 border-gray-500 flex items-center justify-center font-bold text-sm"
            style={{ background: '#e5e7eb', color: '#1a1a1a' }}
          >
            {whiteName[0]?.toUpperCase() ?? 'W'}
          </div>
          <span className="text-gray-300 text-xs truncate max-w-[80px] text-center">
            {whiteName}
          </span>
        </div>
        {/* Black */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div
            className="w-9 h-9 rounded-full border-2 border-gray-500 flex items-center justify-center font-bold text-sm"
            style={{ background: '#374151', color: '#e5e7eb' }}
          >
            {blackName[0]?.toUpperCase() ?? 'B'}
          </div>
          <span className="text-gray-300 text-xs truncate max-w-[80px] text-center">
            {blackName}
          </span>
        </div>
      </div>
    </div>

    {/* ── Accuracy row ── */}
    <div className="px-4 py-3 border-b border-gray-800">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
        <span className="text-gray-300 text-sm font-medium">Accuracy</span>
        {(['white', 'black'] as const).map((c) => {
          const acc = review.accuracy[c];
          return (
            <div key={c} className="flex flex-col items-center min-w-[80px] gap-1">
              <span className={`text-2xl font-extrabold leading-none ${accuracyTextColor(acc)}`}>
                {acc.toFixed(0)}
              </span>
              <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${acc}%`, backgroundColor: accuracyBarColor(acc) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ── Classification rows ── */}
    <div className="border-b border-gray-800">
      {CLASS_ROWS.map((row) => {
        const wCount = countBy(review.moves, 'white', row.key);
        const bCount = countBy(review.moves, 'black', row.key);
        return (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2.5 hover:bg-gray-800/40 transition-colors"
          >
            <span className="font-semibold text-sm" style={{ color: row.color }}>
              {row.label}
            </span>
            {/* White count */}
            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
              <span className="text-white font-semibold text-sm tabular-nums">{wCount}</span>
              <SymbolBadge symbol={row.symbol} color={row.color} />
            </div>
            {/* Black count */}
            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
              <span className="text-white font-semibold text-sm tabular-nums">{bCount}</span>
              <SymbolBadge symbol={row.symbol} color={row.color} />
            </div>
          </div>
        );
      })}
    </div>

    {/* ── Current move analysis ── */}
    {currentMoveAnalysis && (
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-400 text-sm">
            {currentMoveAnalysis.moveNumber}.{currentMoveAnalysis.color === 'black' ? '..' : ''}
          </span>
          <span className="text-white font-bold text-lg font-mono">
            {currentMoveAnalysis.san}
          </span>
          {(() => {
            const row = CLASS_ROWS.find((r) => r.key === currentMoveAnalysis.classification);
            return row ? (
              <>
                <SymbolBadge symbol={row.symbol} color={row.color} size="md" />
                <span className="text-sm font-semibold" style={{ color: row.color }}>
                  {row.label}
                </span>
              </>
            ) : null;
          })()}
        </div>

        {/* Eval change */}
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-1">
            <span className="text-gray-500 text-xs">Before</span>
            <span className="text-gray-100 text-xs font-mono font-semibold">
              {formatCp(currentMoveAnalysis.evalBefore)}
            </span>
          </div>
          <span className="text-gray-600">→</span>
          <div className="bg-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-1">
            <span className="text-gray-500 text-xs">After</span>
            <span className="text-gray-100 text-xs font-mono font-semibold">
              {formatCp(currentMoveAnalysis.evalAfter)}
            </span>
          </div>
        </div>

        {/* Best move */}
        {currentMoveAnalysis.bestMove &&
          currentMoveAnalysis.bestMove !== currentMoveAnalysis.san && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-500 text-xs">Best:</span>
              <span className="text-green-400 font-mono font-semibold text-sm bg-green-400/10 px-2 py-0.5 rounded">
                {currentMoveAnalysis.bestMove}
              </span>
            </div>
          )}

        {/* Tactical event */}
        {currentMoveAnalysis.tacticalEvent && (
          <div className="mb-3">
            <span className="inline-block bg-purple-500/20 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-500/30">
              {currentMoveAnalysis.tacticalEvent.type.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Explanation */}
        {currentMoveAnalysis.explanation && (
          <p className="text-sm text-gray-300 leading-relaxed border-t border-gray-700/50 pt-3">
            {currentMoveAnalysis.explanation}
          </p>
        )}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MOVES TAB
═══════════════════════════════════════════════════════════ */
const MovesTab: React.FC<{
  review: ReviewResult;
  currentIndex: number;
  onMoveClick: (index: number) => void;
}> = ({ review, currentIndex, onMoveClick }) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  return (
    <div className="p-3 overflow-y-auto">
      {Array.from({ length: Math.ceil(review.moves.length / 2) }, (_, rowIndex) => {
        const whiteMove = review.moves[rowIndex * 2];
        const blackMove = review.moves[rowIndex * 2 + 1];
        const whiteIdx = rowIndex * 2 + 1;
        const blackIdx = rowIndex * 2 + 2;

        return (
          <div key={rowIndex} className="flex items-center gap-1 py-0.5">
            {/* Move number */}
            <span className="text-gray-500 w-7 text-right flex-shrink-0 text-xs tabular-nums pr-1">
              {rowIndex + 1}.
            </span>

            {/* White move */}
            {whiteMove && (
              <button
                ref={currentIndex === whiteIdx ? activeRef : undefined}
                onClick={() => onMoveClick(whiteIdx)}
                className={`flex-1 text-left px-2 py-1.5 rounded-lg transition-all duration-100 font-mono text-sm flex items-center gap-1 ${
                  currentIndex === whiteIdx
                    ? 'bg-amber-500 text-black font-bold shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="flex-1">{whiteMove.san}</span>
                {whiteMove.classification !== 'GOOD' && whiteMove.classification !== 'BEST' && (
                  <InlineAnnotation classification={whiteMove.classification} />
                )}
              </button>
            )}

            {/* Black move */}
            {blackMove ? (
              <button
                ref={currentIndex === blackIdx ? activeRef : undefined}
                onClick={() => onMoveClick(blackIdx)}
                className={`flex-1 text-left px-2 py-1.5 rounded-lg transition-all duration-100 font-mono text-sm flex items-center gap-1 ${
                  currentIndex === blackIdx
                    ? 'bg-amber-500 text-black font-bold shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="flex-1">{blackMove.san}</span>
                {blackMove.classification !== 'GOOD' && blackMove.classification !== 'BEST' && (
                  <InlineAnnotation classification={blackMove.classification} />
                )}
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PANEL
═══════════════════════════════════════════════════════════ */
export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  review,
  currentMoveAnalysis,
  currentIndex,
  onMoveClick,
  whiteName = 'White',
  blackName = 'Black',
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'moves'>('report');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {(['report', 'moves'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold capitalize tracking-wide transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-amber-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'report' ? 'Report' : 'Moves'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === 'report' ? (
          <div className="flex-1 overflow-y-auto">
            <ReportTab
              review={review}
              currentMoveAnalysis={currentMoveAnalysis}
              whiteName={whiteName}
              blackName={blackName}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <MovesTab
              review={review}
              currentIndex={currentIndex}
              onMoveClick={onMoveClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};

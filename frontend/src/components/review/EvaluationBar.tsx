import React from 'react';

interface EvaluationBarProps {
  /** Evaluation in pawns (e.g. +1.5 = white up 1.5 pawns) */
  evaluation: number;
  /** If set, displays "M{n}" instead of numeric eval */
  mateIn?: number | null;
}

/**
 * Chess.com-style vertical evaluation bar.
 * White fills from bottom, black from top.
 * Shows numeric eval at top (black side) and bottom (white side).
 */
export const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, mateIn }) => {
  const CAP = 10; // pawns
  const clamped = Math.max(-CAP, Math.min(CAP, evaluation));

  // whitePercent: 50% = equal, 100% = total white advantage, 0% = total black advantage
  const whitePercent = ((clamped + CAP) / (2 * CAP)) * 100;
  const blackPercent = 100 - whitePercent;

  const formatEval = () => {
    if (mateIn != null) return `M${Math.abs(mateIn)}`;
    const abs = Math.abs(evaluation);
    if (abs >= CAP) return abs.toFixed(0);
    return abs.toFixed(1);
  };

  const evalLabel = formatEval();
  const sign = evaluation >= 0 ? '+' : '';

  return (
    <div className="flex flex-col h-full w-6 rounded overflow-hidden flex-shrink-0 relative select-none">
      {/* Black side (top) */}
      <div
        className="w-full bg-gray-900 transition-all duration-300 ease-out flex items-start justify-center pt-1"
        style={{ height: `${blackPercent}%`, minHeight: '4px' }}
      >
        {blackPercent > 14 && (
          <span className="text-gray-200 text-[9px] font-bold leading-none rotate-0">
            {evaluation < 0 ? evalLabel : ''}
          </span>
        )}
      </div>

      {/* White side (bottom) */}
      <div
        className="w-full bg-gray-100 transition-all duration-300 ease-out flex items-end justify-center pb-1"
        style={{ height: `${whitePercent}%`, minHeight: '4px' }}
      >
        {whitePercent > 14 && (
          <span className="text-gray-700 text-[9px] font-bold leading-none">
            {evaluation >= 0 ? evalLabel : ''}
          </span>
        )}
      </div>

      {/* Eval label overlay when segments too small */}
      {(blackPercent <= 14 || whitePercent <= 14) && (
        <div className="absolute inset-x-0 bottom-1 flex items-center justify-center pointer-events-none">
          <span
            className="text-[9px] font-bold leading-none"
            style={{ color: evaluation >= 0 ? '#1f2937' : '#f3f4f6' }}
          >
            {sign}{evalLabel}
          </span>
        </div>
      )}
    </div>
  );
};

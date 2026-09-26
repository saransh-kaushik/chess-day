import React from 'react';

interface ReviewControlsProps {
  currentIndex: number;
  totalMoves: number;
  onPrevious: () => void;
  onNext: () => void;
  onStart: () => void;
  onEnd: () => void;
}

/**
 * Media-player-style navigation controls for stepping through game review positions.
 */
export const ReviewControls: React.FC<ReviewControlsProps> = ({
  currentIndex,
  totalMoves,
  onPrevious,
  onNext,
  onStart,
  onEnd,
}) => {
  const atStart = currentIndex === 0;
  const atEnd = currentIndex >= totalMoves;

  const btnBase =
    'flex items-center justify-center w-10 h-10 rounded-lg text-lg font-medium transition-all duration-150 ' +
    'disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500/40';
  const btnStyle = 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white';

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700/60">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          className={`${btnBase} ${btnStyle}`}
          onClick={onStart}
          disabled={atStart}
          title="Go to start"
          aria-label="Go to start"
        >
          ⏮
        </button>
        <button
          className={`${btnBase} ${btnStyle}`}
          onClick={onPrevious}
          disabled={atStart}
          title="Previous move"
          aria-label="Previous move"
        >
          ←
        </button>
      </div>

      {/* Center: move counter */}
      <div className="flex flex-col items-center">
        <span className="text-white font-semibold text-sm tabular-nums">
          Move{' '}
          <span className="text-amber-400">{currentIndex}</span>
          {' '}/{' '}{totalMoves}
        </span>
        <span className="text-gray-500 text-xs">Use ← → keys</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <button
          className={`${btnBase} ${btnStyle}`}
          onClick={onNext}
          disabled={atEnd}
          title="Next move"
          aria-label="Next move"
        >
          →
        </button>
        <button
          className={`${btnBase} ${btnStyle}`}
          onClick={onEnd}
          disabled={atEnd}
          title="Go to end"
          aria-label="Go to end"
        >
          ⏭
        </button>
      </div>
    </div>
  );
};

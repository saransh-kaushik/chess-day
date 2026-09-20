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
 * Navigation controls for stepping through game review positions.
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
    'px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const primary = 'bg-gray-700 hover:bg-gray-600 text-white';

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-gray-900 rounded-b">
      <div className="flex gap-1">
        {/* Go to start */}
        <button
          className={`${btnBase} ${primary}`}
          onClick={onStart}
          disabled={atStart}
          title="Start"
          aria-label="Go to start"
        >
          ⏮
        </button>
        {/* Previous */}
        <button
          className={`${btnBase} ${primary}`}
          onClick={onPrevious}
          disabled={atStart}
          title="Previous move"
          aria-label="Previous move"
        >
          ← Prev
        </button>
      </div>

      {/* Move counter */}
      <span className="text-gray-400 text-sm tabular-nums">
        {currentIndex} / {totalMoves}
      </span>

      <div className="flex gap-1">
        {/* Next */}
        <button
          className={`${btnBase} ${primary}`}
          onClick={onNext}
          disabled={atEnd}
          title="Next move"
          aria-label="Next move"
        >
          Next →
        </button>
        {/* Go to end */}
        <button
          className={`${btnBase} ${primary}`}
          onClick={onEnd}
          disabled={atEnd}
          title="End"
          aria-label="Go to end"
        >
          ⏭
        </button>
      </div>
    </div>
  );
};

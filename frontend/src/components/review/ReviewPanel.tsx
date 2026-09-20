import React from 'react';
import { ReviewResult, MoveAnalysis } from '../../types/analysis';
import { MoveAnnotation } from './MoveAnnotation';

interface ReviewPanelProps {
  review: ReviewResult;
  currentMoveAnalysis: MoveAnalysis | null;
  currentIndex: number;
  onMoveClick: (index: number) => void;
}

/**
 * Right-side panel in the Review screen.
 * Shows overall stats (accuracy, blunders, mistakes, inaccuracies),
 * selected move analysis with explanation, and scrollable move list.
 */
export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  review,
  currentMoveAnalysis,
  currentIndex,
  onMoveClick,
}) => {
  const formatEval = (cp: number) => {
    if (Math.abs(cp) >= 29000) return cp > 0 ? '+M' : '-M';
    const pawns = cp / 100;
    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* ── Accuracy Summary ── */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">
          Game Summary
        </h3>

        {review.openingName && (
          <p className="text-gray-400 text-xs mb-3">
            <span className="text-gray-500">Opening: </span>
            <span className="text-gray-300">{review.openingName}</span>
            {review.openingEco && (
              <span className="text-gray-500 ml-1">({review.openingEco})</span>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* White */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {review.accuracy.white.toFixed(0)}%
            </div>
            <div className="text-gray-400 text-xs">White Accuracy</div>
          </div>
          {/* Black */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {review.accuracy.black.toFixed(0)}%
            </div>
            <div className="text-gray-400 text-xs">Black Accuracy</div>
          </div>
        </div>

        {/* Mistake counts */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-red-400 font-bold">
              {review.blunders.white + review.blunders.black}
            </div>
            <div className="text-gray-500">Blunders</div>
          </div>
          <div>
            <div className="text-orange-400 font-bold">
              {review.mistakes.white + review.mistakes.black}
            </div>
            <div className="text-gray-500">Mistakes</div>
          </div>
          <div>
            <div className="text-yellow-400 font-bold">
              {review.inaccuracies.white + review.inaccuracies.black}
            </div>
            <div className="text-gray-500">Inaccuracies</div>
          </div>
        </div>
      </div>

      {/* ── Selected Move Analysis ── */}
      {currentMoveAnalysis && (
        <div className="bg-gray-800 rounded-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold text-sm">
              Move {currentMoveAnalysis.moveNumber}
              {currentMoveAnalysis.color === 'black' ? '...' : '. '}
              {currentMoveAnalysis.san}
            </span>
            <MoveAnnotation classification={currentMoveAnalysis.classification} size="sm" />
          </div>

          {/* Eval change */}
          <div className="flex gap-4 text-xs text-gray-400 mb-3">
            <span>
              Before:{' '}
              <span className="text-gray-200">{formatEval(currentMoveAnalysis.evalBefore)}</span>
            </span>
            <span>
              After:{' '}
              <span className="text-gray-200">{formatEval(currentMoveAnalysis.evalAfter)}</span>
            </span>
          </div>

          {/* Best move */}
          {currentMoveAnalysis.bestMove &&
            currentMoveAnalysis.bestMove !== currentMoveAnalysis.san && (
              <div className="text-xs text-gray-400 mb-3">
                Best:{' '}
                <span className="text-green-400 font-medium font-mono">
                  {currentMoveAnalysis.bestMove}
                </span>
              </div>
            )}

          {/* Explanation */}
          {currentMoveAnalysis.explanation && (
            <p className="text-sm text-gray-300 leading-relaxed border-t border-gray-700 pt-3">
              {currentMoveAnalysis.explanation}
            </p>
          )}
        </div>
      )}

      {/* ── Scrollable Move List ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-800 rounded-lg p-3">
        <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Moves</h3>
        <div className="space-y-0.5">
          {Array.from({ length: Math.ceil(review.moves.length / 2) }, (_, rowIndex) => {
            const whiteMove = review.moves[rowIndex * 2];
            const blackMove = review.moves[rowIndex * 2 + 1];
            const whiteHalfMoveIndex = rowIndex * 2 + 1; // 1-based
            const blackHalfMoveIndex = rowIndex * 2 + 2;

            return (
              <div key={rowIndex} className="flex items-center gap-1 text-sm">
                {/* Move number */}
                <span className="text-gray-500 w-6 text-right flex-shrink-0 text-xs">
                  {rowIndex + 1}.
                </span>

                {/* White move */}
                {whiteMove && (
                  <button
                    onClick={() => onMoveClick(whiteHalfMoveIndex)}
                    className={`flex-1 text-left px-1.5 py-0.5 rounded transition-colors font-mono text-xs flex items-center gap-1 ${
                      currentIndex === whiteHalfMoveIndex
                        ? 'bg-amber-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>{whiteMove.san}</span>
                    {whiteMove.classification !== 'GOOD' &&
                      whiteMove.classification !== 'BEST' && (
                        <MoveAnnotation classification={whiteMove.classification} size="sm" />
                      )}
                  </button>
                )}

                {/* Black move */}
                {blackMove ? (
                  <button
                    onClick={() => onMoveClick(blackHalfMoveIndex)}
                    className={`flex-1 text-left px-1.5 py-0.5 rounded transition-colors font-mono text-xs flex items-center gap-1 ${
                      currentIndex === blackHalfMoveIndex
                        ? 'bg-amber-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>{blackMove.san}</span>
                    {blackMove.classification !== 'GOOD' &&
                      blackMove.classification !== 'BEST' && (
                        <MoveAnnotation classification={blackMove.classification} size="sm" />
                      )}
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

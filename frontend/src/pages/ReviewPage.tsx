import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/board/ChessBoard';
import { EvalGraph, EvaluationBar, ReviewPanel, ReviewControls } from '../components/review';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useGameReview } from '../hooks/useGameReview';
import { useGameStore } from '../store/gameStore';
import { useAnalysisStore } from '../store/analysisStore';
import { useAuthStore } from '../store/authStore';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { gameState } = useGameStore();
  const { review, isAnalyzing, analysisProgress } = useAnalysisStore();
  const { user } = useAuthStore();

  const {
    currentMoveIndex,
    currentFen,
    currentMoveAnalysis,
    goToMove,
    goToPrevious,
    goToNext,
    goToStart,
    goToEnd,
    analyzeLocally,
    requestDeepAnalysis,
  } = useGameReview();

  const [analysisStarted, setAnalysisStarted] = useState(false);

  // Auto-start analysis when page loads and we have moves
  useEffect(() => {
    if (!analysisStarted && gameState.moves.length > 0 && !review) {
      setAnalysisStarted(true);
      analyzeLocally(gameState.pgn);
    }
  }, [analysisStarted, gameState.moves.length, gameState.pgn, review, analyzeLocally]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Home') goToStart();
      else if (e.key === 'End') goToEnd();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrevious, goToNext, goToStart, goToEnd]);

  // No game to review
  if (gameState.moves.length === 0 && !review) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">No game to review yet.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400"
          >
            Play a Game
          </button>
        </div>
      </div>
    );
  }

  // Analysis loading
  if (isAnalyzing || (!review && analysisStarted)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-bold text-white">Analyzing Game…</h2>
          <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">{analysisProgress}%</p>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const evaluations = review.moves.map((m) => m.evalAfter);
  const currentEval = currentMoveAnalysis?.evalAfter ?? 0;
  const mateIn = undefined; // extend later if mate detection is added

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Home
          </button>
          <h1 className="text-white font-bold">Game Review</h1>
          {review.openingName && (
            <span className="text-gray-400 text-sm hidden sm:inline">
              — {review.openingName}
              {review.openingEco && ` (${review.openingEco})`}
            </span>
          )}
        </div>
        {/* Deep analysis button (requires backend) */}
        {user && !user.isGuest && gameState.id && (
          <button
            onClick={() => requestDeepAnalysis(gameState.id!)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Deep Analysis
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main area: board + panel */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
          {/* Left: eval bar + board */}
          <div className="flex gap-2 items-start flex-shrink-0">
            <EvaluationBar evaluation={currentEval} mateIn={mateIn} />
            <div className="flex flex-col gap-2">
              <ChessBoard
                fen={currentFen}
                orientation="white"
                onMove={() => false}
                interactive={false}
                lastMove={
                  currentMoveAnalysis
                    ? (() => {
                        const mv = gameState.moves[currentMoveIndex - 1];
                        return mv
                          ? { from: mv.uci.slice(0, 2), to: mv.uci.slice(2, 4) }
                          : null;
                      })()
                    : null
                }
              />
            </div>
          </div>

          {/* Right: review panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ReviewPanel
              review={review}
              currentMoveAnalysis={currentMoveAnalysis}
              currentIndex={currentMoveIndex}
              onMoveClick={goToMove}
            />
          </div>
        </div>

        {/* Eval graph */}
        <div className="px-4 pb-2">
          <EvalGraph
            evaluations={evaluations}
            currentMove={currentMoveIndex}
            onMoveClick={(i) => goToMove(i + 1)}
          />
        </div>

        {/* Navigation controls */}
        <ReviewControls
          currentIndex={currentMoveIndex}
          totalMoves={review.moves.length}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onStart={goToStart}
          onEnd={goToEnd}
        />
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/board/ChessBoard';
import { EvalGraph, EvaluationBar, ReviewPanel, ReviewControls } from '../components/review';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useGameReview } from '../hooks/useGameReview';
import { useGameStore } from '../store/gameStore';
import { useAnalysisStore } from '../store/analysisStore';
import { useAuthStore } from '../store/authStore';
import { useChessSound } from '../hooks/useChessSound';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { gameState } = useGameStore();
  const { review, isAnalyzing, analysisProgress } = useAnalysisStore();
  const { user } = useAuthStore();
  const { playSound } = useChessSound();

  const {
    currentMoveIndex,
    currentFen,
    currentMoveAnalysis,
    goToMove,
    goToPrevious,
    goToNext,
    goToStart,
    goToEnd,
    requestBackendAnalysis,
    requestDeepAnalysis,
  } = useGameReview();

  const hasRequestedRef = useRef(false);
  const prevMoveIndexRef = useRef(currentMoveIndex);

  // Auto-start backend analysis when page loads and we have moves
  useEffect(() => {
    if (!hasRequestedRef.current && !review && !isAnalyzing && gameState.moves.length > 0) {
      hasRequestedRef.current = true;
      requestBackendAnalysis();
    }
  }, [review, isAnalyzing, gameState.moves.length, requestBackendAnalysis]);

  // Play sounds when navigating moves
  useEffect(() => {
    if (currentMoveIndex === prevMoveIndexRef.current) return;
    prevMoveIndexRef.current = currentMoveIndex;

    if (!currentMoveAnalysis) {
      playSound('navigate');
      return;
    }

    const cls = currentMoveAnalysis.classification;
    if (cls === 'BLUNDER') {
      playSound('blunder');
    } else if (cls === 'MISTAKE') {
      playSound('mistake');
    } else if (cls === 'INACCURACY') {
      playSound('inaccuracy');
    } else if (cls === 'BEST') {
      playSound('best');
    } else {
      playSound('navigate');
    }
  }, [currentMoveIndex, currentMoveAnalysis, playSound]);

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
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
  if (isAnalyzing || (!review && hasRequestedRef.current)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-bold text-white">Analyzing Game…</h2>
          <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
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
  const currentEval = currentMoveAnalysis ? currentMoveAnalysis.evalAfter / 100 : 0;

  const lastMoveUci =
    currentMoveAnalysis?.uci ??
    (currentMoveIndex > 0 ? gameState.moves[currentMoveIndex - 1]?.uci : undefined);
  const lastMove = lastMoveUci
    ? { from: lastMoveUci.slice(0, 2), to: lastMoveUci.slice(2, 4) }
    : null;

  const openingLabel = review.openingName
    ? `${review.openingName}${review.openingEco ? ` (${review.openingEco})` : ''}`
    : 'Game Review';

  // Player names from game state
  const whiteName = gameState.white?.name ?? 'White';
  const blackName = gameState.black?.name ?? 'Black';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0"
          >
            ← Home
          </button>
          <div className="w-px h-4 bg-gray-700 flex-shrink-0" />
          <span className="text-white font-semibold text-sm truncate">{openingLabel}</span>
        </div>

        {user && !user.isGuest && (gameState.id || review.gameId) && (
          <button
            onClick={() => requestDeepAnalysis(gameState.id || review.gameId)}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {isAnalyzing ? 'Analyzing…' : '⚡ Deep Analysis'}
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: eval bar + board + graph + controls */}
        <div className="flex flex-col flex-shrink-0 p-3 gap-3">
          {/* Board row: eval bar + board */}
          <div className="flex gap-2 items-stretch">
            {/* Evaluation bar */}
            <div style={{ alignSelf: 'stretch' }}>
              <EvaluationBar evaluation={currentEval} />
            </div>

            {/* Chess board */}
            <ChessBoard
              fen={currentFen}
              orientation="white"
              onMove={() => false}
              interactive={false}
              lastMove={lastMove}
            />
          </div>

          {/* Eval graph */}
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            <EvalGraph
              evaluations={evaluations}
              moveAnalyses={review.moves}
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

        {/* RIGHT COLUMN: review panel */}
        <div className="flex-1 min-h-0 overflow-hidden lg:border-l border-gray-800">
          <ReviewPanel
            review={review}
            currentMoveAnalysis={currentMoveAnalysis}
            currentIndex={currentMoveIndex}
            onMoveClick={goToMove}
            whiteName={whiteName}
            blackName={blackName}
          />
        </div>
      </div>
    </div>
  );
};

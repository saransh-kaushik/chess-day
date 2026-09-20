import { useCallback } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { useGameStore } from '../store/gameStore';
import { requestAnalysis, triggerAnalysis } from '../api/analysis';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const useGameReview = () => {
  const {
    review,
    isAnalyzing,
    analysisProgress,
    currentReviewMoveIndex,
    setAnalyzing,
    setCurrentMoveIndex,
    setReview,
  } = useAnalysisStore();
  const { gameState } = useGameStore();

  const currentMoveAnalysis = review?.moves[currentReviewMoveIndex - 1] || null;

  const currentFen = currentReviewMoveIndex === 0
    ? (review?.moves[0]?.fenBefore || gameState.moves[0]?.fenBefore || STARTING_FEN)
    : (review?.moves[currentReviewMoveIndex - 1]?.fenAfter ||
       gameState.moves[currentReviewMoveIndex - 1]?.fenAfter ||
       STARTING_FEN);

  const goToMove = useCallback((index: number) => {
    const maxIndex = review?.moves.length ?? gameState.moves.length;
    if (index >= 0 && index <= maxIndex) {
      setCurrentMoveIndex(index);
    }
  }, [review?.moves.length, gameState.moves.length, setCurrentMoveIndex]);

  const goToPrevious = useCallback(() => {
    goToMove(currentReviewMoveIndex - 1);
  }, [goToMove, currentReviewMoveIndex]);

  const goToNext = useCallback(() => {
    goToMove(currentReviewMoveIndex + 1);
  }, [goToMove, currentReviewMoveIndex]);

  const goToStart = useCallback(() => {
    goToMove(0);
  }, [goToMove]);

  const goToEnd = useCallback(() => {
    const maxIndex = review?.moves.length ?? gameState.moves.length;
    goToMove(maxIndex);
  }, [goToMove, review?.moves.length, gameState.moves.length]);

  const requestBackendAnalysis = useCallback(async (customDepth?: number) => {
    setAnalyzing(true, 10);
    try {
      let pgn = gameState.pgn;
      const moveList = gameState.moves.map((m) => m.uci || m.san);

      if (gameState.moves.length > 0) {
        const movesSanText = gameState.moves.reduce((acc, m, idx) => {
          if (idx % 2 === 0) {
            return `${acc}${Math.floor(idx / 2) + 1}. ${m.san} `;
          }
          return `${acc}${m.san} `;
        }, '').trim();

        const firstSan = gameState.moves[0]?.san;
        if (!pgn || (firstSan && !pgn.includes(firstSan))) {
          pgn = `[Event "Game Review"]\n[Site "Chess Day"]\n[Date "${new Date().toISOString().slice(0, 10)}"]\n[Result "*"]\n\n${movesSanText} *`;
        }
      }

      setAnalyzing(true, 30);
      let reviewResult;
      if (gameState.id) {
        reviewResult = await triggerAnalysis(gameState.id, customDepth);
      } else {
        reviewResult = await requestAnalysis({
          gameId: gameState.id ?? undefined,
          pgn,
          moves: moveList,
          depth: customDepth,
          mode: gameState.mode,
        });
      }

      setAnalyzing(true, 90);
      setReview(reviewResult);
    } catch (err) {
      console.error('Backend game review error:', err);
    } finally {
      setAnalyzing(false, 100);
    }
  }, [gameState.id, gameState.pgn, gameState.moves, gameState.mode, setAnalyzing, setReview]);

  const requestDeepAnalysis = useCallback(async (gameId?: string) => {
    const id = gameId || gameState.id;
    if (id) {
      setAnalyzing(true, 10);
      try {
        const deepResult = await triggerAnalysis(id, 20);
        setReview(deepResult);
      } catch (err) {
        console.error('Deep analysis error:', err);
      } finally {
        setAnalyzing(false, 100);
      }
    } else {
      await requestBackendAnalysis(20);
    }
  }, [gameState.id, setAnalyzing, setReview, requestBackendAnalysis]);

  return {
    review,
    currentMoveIndex: currentReviewMoveIndex,
    currentFen,
    currentMoveAnalysis,
    goToMove,
    goToPrevious,
    goToNext,
    goToStart,
    goToEnd,
    isAnalyzing,
    analysisProgress,
    analyzeLocally: requestBackendAnalysis,
    requestBackendAnalysis,
    requestDeepAnalysis,
  };
};

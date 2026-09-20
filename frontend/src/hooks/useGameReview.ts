import { useAnalysisStore } from '../store/analysisStore';
import { useGameStore } from '../store/gameStore';
import { useStockfish } from './useStockfish';

export const useGameReview = () => {
  const { review, isAnalyzing, currentReviewMoveIndex, setAnalyzing, setCurrentMoveIndex, setReview } = useAnalysisStore();
  const { gameState } = useGameStore();
  const { analyzeGame } = useStockfish();

  const currentMoveAnalysis = review?.moves[currentReviewMoveIndex - 1] || null;
  const currentFen = currentReviewMoveIndex === 0 
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
    : gameState.moves[currentReviewMoveIndex - 1]?.fenAfter || '';

  const goToMove = (index: number) => {
    if (index >= 0 && index <= (review?.moves.length || gameState.moves.length)) {
      setCurrentMoveIndex(index);
    }
  };

  const analyzeLocally = async (_pgn: string) => {
    setAnalyzing(true, 0);
    const fens = gameState.moves.map((m) => m.fenAfter);
    // Simulating deep analysis mapping
    const evals = await analyzeGame(fens, 18, (p) => setAnalyzing(true, p));
    
    // Map evals to review result mockup
    const mockReview = {
      gameId: 'local',
      accuracy: { white: 85, black: 80 },
      blunders: { white: 1, black: 2 },
      mistakes: { white: 2, black: 1 },
      inaccuracies: { white: 3, black: 3 },
      moves: evals.map((e, i) => ({
        moveNumber: Math.floor(i / 2) + 1,
        san: gameState.moves[i].san,
        color: i % 2 === 0 ? 'white' : 'black',
        classification: 'GOOD' as const,
        evalBefore: 0,
        evalAfter: e.score,
        evalLoss: 0,
        bestMove: e.bestMove,
        principalVariation: e.pv,
        accuracy: 90,
        tacticalEvent: null,
        explanation: 'Good move',
      })),
      openingName: 'Italian Game',
      openingEco: 'C50',
      analysisDepth: 18,
    };
    
    setReview(mockReview as any);
    setAnalyzing(false, 100);
  };

  const requestDeepAnalysis = async (_gameId: string) => {
    // Backend call simulation
  };

  return {
    review,
    currentMoveIndex: currentReviewMoveIndex,
    currentFen,
    currentMoveAnalysis,
    goToMove,
    goToPrevious: () => goToMove(currentReviewMoveIndex - 1),
    goToNext: () => goToMove(currentReviewMoveIndex + 1),
    goToStart: () => goToMove(0),
    goToEnd: () => goToMove(review?.moves.length || 0),
    isAnalyzing,
    analyzeLocally,
    requestDeepAnalysis
  };
};

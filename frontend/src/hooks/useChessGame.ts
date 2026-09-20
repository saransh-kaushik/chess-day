import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useGameStore } from '../store/gameStore';
import { GameMode, TimeControl, PlayerColor } from '../types/chess';

export interface UseChessGameReturn {
  game: Chess;
  gameState: any;
  legalMoves: string[];
  makeMove: (uci: string) => boolean;
  resetGame: (mode: GameMode, timeControl?: TimeControl) => void;
  resign: (color: PlayerColor) => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  isCheck: boolean;
  isGameOver: boolean;
}

export const useChessGame = (): UseChessGameReturn => {
  const [game, setGame] = useState(new Chess());
  const { gameState, addMove, setGameState, setResult } = useGameStore();
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const updateGameState = useCallback((g: Chess) => {
    setLegalMoves(g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || '')));
    if (g.isCheckmate()) {
      setResult(g.turn() === 'w' ? '0-1' : '1-0', 'completed');
    } else if (g.isDraw() || g.isStalemate() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) {
      setResult('1/2-1/2', 'completed');
    }
  }, [setResult]);

  useEffect(() => {
    updateGameState(game);
  }, [game, updateGameState]);

  const makeMove = (uci: string): boolean => {
    try {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci.substring(4) : undefined;
      
      const move = game.move({ from, to, promotion });
      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        addMove({
          uci,
          san: move.san,
          fenBefore: game.fen(),
          fenAfter: newGame.fen(),
          moveNumber: Math.floor((game.history().length) / 2) + 1,
          color: move.color === 'w' ? 'white' : 'black',
          timestamp: Date.now(),
        });
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const resetGame = (mode: GameMode, timeControl?: TimeControl) => {
    const newGame = new Chess();
    setGame(newGame);
    setGameState({
      mode,
      timeControl,
      currentFen: newGame.fen(),
      moves: [],
      status: 'active',
      result: null,
      isWhiteTurn: true,
    });
  };

  const resign = (color: PlayerColor) => {
    setResult(color === 'white' ? '0-1' : '1-0', 'completed');
  };

  const offerDraw = () => {
    // simplified
  };

  const acceptDraw = () => {
    setResult('1/2-1/2', 'completed');
  };

  return {
    game,
    gameState,
    legalMoves,
    makeMove,
    resetGame,
    resign,
    offerDraw,
    acceptDraw,
    isCheck: game.inCheck(),
    isGameOver: game.isGameOver(),
  };
};

import { useCallback } from 'react';
import { Chess } from 'chess.js';
import { useGameStore } from '../store/gameStore';
import { useAnalysisStore } from '../store/analysisStore';
import { ChessMove } from '../types/chess';

/**
 * Hook that parses a PGN string and loads it into the game store,
 * ready for review analysis.
 *
 * Returns a `loadPgn` function that throws on invalid PGN.
 */
export const usePgnLoader = () => {
  const { setGameState } = useGameStore();
  const { clearReview } = useAnalysisStore();

  const loadPgn = useCallback(
    (pgn: string): { whiteName: string; blackName: string; moveCount: number } => {
      const chess = new Chess();

      // Will throw if PGN is invalid
      chess.loadPgn(pgn.trim());

      const headers = chess.header();
      const whiteName = headers['White'] ?? 'White';
      const blackName = headers['Black'] ?? 'Black';
      const resultStr = headers['Result'] ?? '*';


      // Rebuild move list with FEN snapshots
      const replay = new Chess();
      const history = chess.history({ verbose: true });

      const moves: ChessMove[] = history.map((m, idx) => {
        const fenBefore = replay.fen();
        replay.move(m);
        const fenAfter = replay.fen();

        return {
          uci: m.from + m.to + (m.promotion ?? ''),
          san: m.san,
          fenBefore,
          fenAfter,
          moveNumber: Math.floor(idx / 2) + 1,
          color: m.color === 'w' ? 'white' : 'black',
          timestamp: Date.now(),
        };
      });

      const finalFen = replay.fen();

      // Map result string to typed GameResult
      const resultMap: Record<string, '1-0' | '0-1' | '1/2-1/2' | '*'> = {
        '1-0': '1-0',
        '0-1': '0-1',
        '1/2-1/2': '1/2-1/2',
        '*': '*',
      };
      const result = resultMap[resultStr] ?? null;


      // Clear previous review state
      clearReview();


      // Populate the game store
      setGameState({
        id: null,
        mode: 'local', // PGN review is treated as a local game
        status: 'completed',
        result,
        white: { type: 'human', name: whiteName, color: 'white' },
        black: { type: 'human', name: blackName, color: 'black' },
        currentFen: finalFen,
        moves,
        pgn: pgn.trim(),
        timeControl: null,
        whiteTime: 0,
        blackTime: 0,
        isWhiteTurn: replay.turn() === 'w',
      });

      return { whiteName, blackName, moveCount: moves.length };
    },
    [setGameState, clearReview],
  );

  return { loadPgn };
};

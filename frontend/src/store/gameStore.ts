import { create } from 'zustand';
import { GameState, GameResult, GameStatus, ChessMove } from '../types/chess';

interface GameStore {
  gameState: GameState;
  setGameState: (state: Partial<GameState>) => void;
  addMove: (move: ChessMove) => void;
  resetGame: () => void;
  setResult: (result: GameResult, status: GameStatus) => void;
  updateClock: (white: number, black: number) => void;
}

const initialGameState: GameState = {
  id: null,
  mode: 'local',
  status: 'idle',
  result: null,
  white: { type: 'human', name: 'Player 1', color: 'white' },
  black: { type: 'human', name: 'Player 2', color: 'black' },
  currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  pgn: '',
  timeControl: null,
  whiteTime: 0,
  blackTime: 0,
  isWhiteTurn: true,
};

export const useGameStore = create<GameStore>((set) => ({
  gameState: initialGameState,
  setGameState: (state) => set((prev) => ({ gameState: { ...prev.gameState, ...state } })),
  addMove: (move) => set((prev) => ({ 
    gameState: { 
      ...prev.gameState, 
      moves: [...prev.gameState.moves, move],
      currentFen: move.fenAfter,
      isWhiteTurn: move.color === 'black'
    } 
  })),
  resetGame: () => set({ gameState: initialGameState }),
  setResult: (result, status) => set((prev) => ({ gameState: { ...prev.gameState, result, status } })),
  updateClock: (white, black) => set((prev) => ({ gameState: { ...prev.gameState, whiteTime: white, blackTime: black } })),
}));

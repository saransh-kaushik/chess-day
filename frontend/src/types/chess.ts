export type GameMode = 'local' | 'bot' | 'online';
export type PlayerColor = 'white' | 'black';
export type GameStatus = 'idle' | 'active' | 'completed' | 'abandoned';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*' | null;

export interface TimeControl {
  initial: number;   // seconds
  increment: number; // seconds per move
}

export interface Player {
  type: 'human' | 'bot' | 'remote';
  name: string;
  color: PlayerColor;
}

export interface ChessMove {
  uci: string;
  san: string;
  fenBefore: string;
  fenAfter: string;
  moveNumber: number;
  color: PlayerColor;
  timestamp: number;
  clockRemaining?: number;
}

export interface Puzzle {
  id: string;
  fen: string;
  rating: number | null;
  source: string;
}

export interface GameState {
  id: string | null;
  mode: GameMode;
  status: GameStatus;
  result: GameResult;
  white: Player;
  black: Player;
  currentFen: string;
  moves: ChessMove[];
  pgn: string;
  timeControl: TimeControl | null;
  whiteTime: number;  // remaining seconds
  blackTime: number;
  isWhiteTurn: boolean;
}

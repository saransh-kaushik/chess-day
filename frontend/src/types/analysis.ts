export type MoveClassification = 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';

export interface TacticalEvent {
  type: string;        // 'HANGING_PIECE', 'FORK', 'PIN', etc.
  piece?: string;
  square?: string;
  severity?: string;
}

export interface MoveAnalysis {
  moveNumber: number;
  san: string;
  uci?: string;
  fenBefore?: string;
  fenAfter?: string;
  color: 'white' | 'black';
  classification: MoveClassification;
  evalBefore: number;       // centipawns
  evalAfter: number;
  evalLoss: number;
  bestMove: string;
  principalVariation: string[];
  accuracy: number;
  tacticalEvent: TacticalEvent | null;
  explanation: string;
}

export interface ReviewResult {
  gameId: string;
  accuracy: { white: number; black: number };
  blunders: { white: number; black: number };
  mistakes: { white: number; black: number };
  inaccuracies: { white: number; black: number };
  moves: MoveAnalysis[];
  openingName: string | null;
  openingEco: string | null;
  analysisDepth: number;
}

import { apiClient } from './client';
import { ReviewResult, MoveAnalysis, MoveClassification } from '../types/analysis';

export interface RequestAnalysisParams {
  gameId?: string;
  pgn?: string;
  moves?: string[];
  initialFen?: string;
  depth?: number;
  mode?: string;
}

export function normalizeReview(data: any): ReviewResult {
  if (!data) {
    return {
      gameId: '',
      accuracy: { white: 0, black: 0 },
      blunders: { white: 0, black: 0 },
      mistakes: { white: 0, black: 0 },
      inaccuracies: { white: 0, black: 0 },
      moves: [],
      openingName: null,
      openingEco: null,
      analysisDepth: 14,
    };
  }

  const whiteSummary = data.white ?? {};
  const blackSummary = data.black ?? {};

  const whiteAcc = data.accuracy?.white ?? whiteSummary.accuracy ?? 0;
  const blackAcc = data.accuracy?.black ?? blackSummary.accuracy ?? 0;

  const whiteBlunders = data.blunders?.white ?? whiteSummary.blunders ?? 0;
  const blackBlunders = data.blunders?.black ?? blackSummary.blunders ?? 0;

  const whiteMistakes = data.mistakes?.white ?? whiteSummary.mistakes ?? 0;
  const blackMistakes = data.mistakes?.black ?? blackSummary.mistakes ?? 0;

  const whiteInaccuracies = data.inaccuracies?.white ?? whiteSummary.inaccuracies ?? 0;
  const blackInaccuracies = data.inaccuracies?.black ?? blackSummary.inaccuracies ?? 0;

  const openingName = data.openingName ?? data.opening?.name ?? null;
  const openingEco = data.openingEco ?? data.opening?.eco ?? null;

  const rawMoves: any[] = data.moves ?? data.moves_analysis ?? [];
  const moves: MoveAnalysis[] = rawMoves.map((m: any, idx: number) => {
    const moveNumber = m.moveNumber ?? m.move_number ?? (Math.floor(idx / 2) + 1);
    const color = m.color ?? (idx % 2 === 0 ? 'white' : 'black');
    const classification = (m.classification ?? 'GOOD') as MoveClassification;
    const evalBefore = m.evalBefore ?? m.eval_before ?? 0;
    const evalAfter = m.evalAfter ?? m.eval_after ?? 0;
    const evalLoss = m.evalLoss ?? m.eval_loss ?? 0;
    const bestMove = m.bestMove ?? m.best_move_uci ?? '';
    const principalVariation = m.principalVariation ?? m.principal_variation ?? [];
    const accuracy = m.accuracy ?? 100;
    const explanation = m.explanation ?? '';

    let tacticalEvent = m.tacticalEvent ?? null;
    if (!tacticalEvent && m.tactical_events && m.tactical_events.length > 0) {
      const firstTe = m.tactical_events[0];
      tacticalEvent = {
        type: firstTe.pattern ?? firstTe.type,
        piece: firstTe.piece,
        square: firstTe.square,
        severity: firstTe.severity,
      };
    }

    return {
      moveNumber,
      san: m.san ?? '',
      uci: m.uci,
      fenBefore: m.fenBefore ?? m.fen_before,
      fenAfter: m.fenAfter ?? m.fen_after,
      color,
      classification,
      evalBefore,
      evalAfter,
      evalLoss,
      bestMove,
      principalVariation,
      accuracy,
      tacticalEvent,
      explanation,
    };
  });

  return {
    gameId: data.gameId ?? data.game_id ?? '',
    accuracy: { white: whiteAcc, black: blackAcc },
    blunders: { white: whiteBlunders, black: blackBlunders },
    mistakes: { white: whiteMistakes, black: blackMistakes },
    inaccuracies: { white: whiteInaccuracies, black: blackInaccuracies },
    moves,
    openingName,
    openingEco,
    analysisDepth: data.analysisDepth ?? data.analysis_depth ?? 14,
  };
}

export const requestAnalysis = async (params: RequestAnalysisParams): Promise<ReviewResult> => {
  const res = await apiClient.post<any>('/analysis', {
    game_id: params.gameId,
    pgn: params.pgn,
    moves: params.moves,
    initial_fen: params.initialFen,
    depth: params.depth,
    mode: params.mode ?? 'local',
  });
  return normalizeReview(res.data);
};

export const triggerAnalysis = async (gameId: string, depth?: number): Promise<ReviewResult> => {
  const res = await apiClient.post<any>(`/analysis/${gameId}${depth ? `?depth=${depth}` : ''}`);
  return normalizeReview(res.data);
};

export const getReview = async (gameId: string): Promise<ReviewResult> => {
  const res = await apiClient.get<any>(`/analysis/${gameId}`);
  return normalizeReview(res.data);
};

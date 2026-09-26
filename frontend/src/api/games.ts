import { apiClient } from './client';

export type GameMode = 'local' | 'bot' | 'online';

export interface CreateGameRequest {
  mode: GameMode;
  time_control?: { initial: number; increment: number } | null;
  white_guest_name?: string;
  black_guest_name?: string;
}

export interface GameResponse {
  id: string;
  mode: GameMode;
  status: string;
  white_player_id: string | null;
  black_player_id: string | null;
  white_guest_name: string | null;
  black_guest_name: string | null;
  initial_fen: string;
  current_fen: string;
  pgn: string;
  result: string | null;
  time_control: { initial: number; increment: number } | null;
  created_at: string;
  completed_at: string | null;
}

export interface CompleteGameRequest {
  pgn: string;
  result: string;
}

export interface GameListOut {
  games: GameResponse[];
  total: number;
  page: number;
  page_size: number;
}

export const createGame = async (data: CreateGameRequest): Promise<GameResponse> => {
  const res = await apiClient.post<GameResponse>('/games', data);
  return res.data;
};

export const getGame = async (gameId: string): Promise<GameResponse> => {
  const res = await apiClient.get<GameResponse>(`/games/${gameId}`);
  return res.data;
};

export const listGames = async (page = 1, pageSize = 20): Promise<GameListOut> => {
  const res = await apiClient.get<GameListOut>('/games', {
    params: { page, page_size: pageSize },
  });
  return res.data;
};

export const resignGame = async (gameId: string): Promise<GameResponse> => {
  const res = await apiClient.post<GameResponse>(`/games/${gameId}/resign`);
  return res.data;
};

export const offerDraw = async (gameId: string): Promise<void> => {
  await apiClient.post(`/games/${gameId}/draw-offer`);
};

export const acceptDraw = async (gameId: string): Promise<GameResponse> => {
  const res = await apiClient.post<GameResponse>(`/games/${gameId}/draw-accept`);
  return res.data;
};

export const completeGame = async (
  gameId: string,
  data: CompleteGameRequest
): Promise<GameResponse> => {
  const res = await apiClient.post<GameResponse>(`/games/${gameId}/complete`, data);
  return res.data;
};

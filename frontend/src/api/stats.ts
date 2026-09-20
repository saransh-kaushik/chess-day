import { apiClient } from './client';

export interface PlayerStats {
  id: string;
  user_id: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  avg_accuracy: number | null;
  total_blunders: number;
  total_mistakes: number;
  total_inaccuracies: number;
  tactical_mistakes: number;
  positional_mistakes: number;
  updated_at: string;
}

export const getMyStats = async (): Promise<PlayerStats> => {
  const res = await apiClient.get<PlayerStats>('/stats/me');
  return res.data;
};

export const getUserStats = async (userId: string): Promise<PlayerStats> => {
  const res = await apiClient.get<PlayerStats>(`/stats/${userId}`);
  return res.data;
};

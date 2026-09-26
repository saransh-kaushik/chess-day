import { apiClient } from './client';
import { LeaderboardEntry, OpeningStat } from '../types/api';

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

export interface LeaderboardOut {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  page_size: number;
}

export const getLeaderboard = async (page = 1, pageSize = 20): Promise<LeaderboardOut> => {
  const res = await apiClient.get<LeaderboardOut>('/stats/leaderboard', {
    params: { page, page_size: pageSize },
  });
  return res.data;
};

export interface OpeningStatsOut {
  openings: OpeningStat[];
  total: number;
}

export const getMyOpenings = async (): Promise<OpeningStatsOut> => {
  const res = await apiClient.get<OpeningStatsOut>('/stats/openings');
  return res.data;
};

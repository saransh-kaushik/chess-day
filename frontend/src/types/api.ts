export interface User {
  id: string;
  username: string;
  email: string | null;
  is_guest: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  avg_accuracy: number | null;
}

export interface OpeningStat {
  eco: string | null;
  name: string | null;
  count: number;
  win_rate: number;
}

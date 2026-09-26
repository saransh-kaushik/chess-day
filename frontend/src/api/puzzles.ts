import { apiClient } from './client';
import { Puzzle } from '../types/chess';

export interface PuzzleAttemptResult {
  correct: boolean;
  solution: string[];
}

export const getRandomPuzzle = async (): Promise<Puzzle> => {
  const res = await apiClient.get<Puzzle>('/puzzles/random');
  return res.data;
};

export const getPuzzle = async (id: string): Promise<Puzzle> => {
  const res = await apiClient.get<Puzzle>(`/puzzles/${id}`);
  return res.data;
};

export const submitAttempt = async (id: string, uci: string): Promise<PuzzleAttemptResult> => {
  const res = await apiClient.post<PuzzleAttemptResult>(`/puzzles/${id}/attempt`, { uci });
  return res.data;
};

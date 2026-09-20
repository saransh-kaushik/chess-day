import { apiClient } from './client';
import { ReviewResult } from '../types/analysis';

export const triggerAnalysis = async (gameId: string): Promise<ReviewResult> => {
  const res = await apiClient.post<ReviewResult>(`/analysis/${gameId}`);
  return res.data;
};

export const getReview = async (gameId: string): Promise<ReviewResult> => {
  const res = await apiClient.get<ReviewResult>(`/analysis/${gameId}`);
  return res.data;
};

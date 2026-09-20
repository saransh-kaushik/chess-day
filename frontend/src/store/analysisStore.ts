import { create } from 'zustand';
import { ReviewResult } from '../types/analysis';

interface AnalysisStore {
  review: ReviewResult | null;
  isAnalyzing: boolean;
  analysisProgress: number;  // 0-100
  currentReviewMoveIndex: number;
  setReview: (review: ReviewResult) => void;
  setAnalyzing: (analyzing: boolean, progress?: number) => void;
  setCurrentMoveIndex: (index: number) => void;
  clearReview: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  review: null,
  isAnalyzing: false,
  analysisProgress: 0,
  currentReviewMoveIndex: 0,
  setReview: (review) => set({ review, currentReviewMoveIndex: 0 }),
  setAnalyzing: (isAnalyzing, analysisProgress = 0) => set({ isAnalyzing, analysisProgress }),
  setCurrentMoveIndex: (currentReviewMoveIndex) => set({ currentReviewMoveIndex }),
  clearReview: () => set({ review: null, isAnalyzing: false, analysisProgress: 0, currentReviewMoveIndex: 0 }),
}));

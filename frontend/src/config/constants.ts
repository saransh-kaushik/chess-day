export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';

export const BOT_SKILL_LEVELS = [
  { label: 'Beginner', value: 1, stockfishSkill: 1 },
  { label: 'Easy', value: 3, stockfishSkill: 4 },
  { label: 'Medium', value: 5, stockfishSkill: 8 },
  { label: 'Hard', value: 7, stockfishSkill: 14 },
  { label: 'Expert', value: 9, stockfishSkill: 18 },
  { label: 'Master', value: 10, stockfishSkill: 20 },
];

export const TIME_CONTROLS = [
  { label: 'Bullet 1+0', initial: 60, increment: 0 },
  { label: 'Bullet 2+1', initial: 120, increment: 1 },
  { label: 'Blitz 3+2', initial: 180, increment: 2 },
  { label: 'Blitz 5+0', initial: 300, increment: 0 },
  { label: 'Blitz 5+3', initial: 300, increment: 3 },
  { label: 'Rapid 10+0', initial: 600, increment: 0 },
  { label: 'Rapid 15+10', initial: 900, increment: 10 },
  { label: 'Classical 30+0', initial: 1800, increment: 0 },
  { label: 'Unlimited', initial: 0, increment: 0 },
];

export const ANALYSIS_DEPTH = 18;    // client-side (browser)
export const BOT_DEPTH = 15;         // bot move search depth

export const CLASSIFICATION_COLORS: Record<string, string> = {
  BEST: '#f7c948',
  GOOD: '#5c8a3c',
  INACCURACY: '#e6a817',
  MISTAKE: '#e07000',
  BLUNDER: '#c41e3a',
};

export const CLASSIFICATION_SYMBOLS: Record<string, string> = {
  BEST: '★',
  GOOD: '✓',
  INACCURACY: '?!',
  MISTAKE: '?',
  BLUNDER: '??',
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  BEST: 'Best',
  GOOD: 'Good',
  INACCURACY: 'Inaccuracy',
  MISTAKE: 'Mistake',
  BLUNDER: 'Blunder',
};

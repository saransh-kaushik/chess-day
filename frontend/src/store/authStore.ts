import { create } from 'zustand';
import { User } from '../types/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  setAuth: (user: User, token: string, isGuest: boolean) => void;
  clearAuth: () => void;
}

const getInitialToken = () => localStorage.getItem('token') || null;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: getInitialToken(),
  isGuest: false,
  setAuth: (user, token, isGuest) => {
    localStorage.setItem('token', token);
    set({ user, token, isGuest });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isGuest: false });
  },
}));

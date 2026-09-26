import { create } from 'zustand';

interface SettingsStore {
  muted: boolean;
  toggleMuted: () => void;
}

const getInitialMuted = () => localStorage.getItem('muted') === 'true';

export const useSettingsStore = create<SettingsStore>((set) => ({
  muted: getInitialMuted(),
  toggleMuted: () =>
    set((prev) => {
      const muted = !prev.muted;
      localStorage.setItem('muted', String(muted));
      return { muted };
    }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, type EdgeKey, type FontKey, type ThemeKey } from '../theme';

interface SettingsState {
  theme: ThemeKey;
  font: FontKey;
  edges: EdgeKey;
  setTheme: (t: ThemeKey) => void;
  setFont: (f: FontKey) => void;
  setEdges: (e: EdgeKey) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setEdges: (edges) => set({ edges }),
    }),
    { name: 'atomiser:settings:v1' },
  ),
);

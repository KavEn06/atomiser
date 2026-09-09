import { create } from 'zustand';

interface UiState {
  selectedNodeId: string | null;
  nextOpen: boolean;
  openNode: (id: string) => void;
  closeNode: () => void;
  toggleNext: () => void;
  closeNext: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedNodeId: null,
  nextOpen: false,
  openNode: (id) => set({ selectedNodeId: id }),
  closeNode: () => set({ selectedNodeId: null }),
  toggleNext: () => set((s) => ({ nextOpen: !s.nextOpen })),
  closeNext: () => set({ nextOpen: false }),
}));

import { create } from 'zustand';

interface UiState {
  selectedNodeId: string | null;
  openNode: (id: string) => void;
  closeNode: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedNodeId: null,
  openNode: (id) => set({ selectedNodeId: id }),
  closeNode: () => set({ selectedNodeId: null }),
}));

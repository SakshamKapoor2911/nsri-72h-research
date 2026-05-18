import { create } from "zustand";

interface AgentDrawerStore {
  openAgentId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useAgentDrawerStore = create<AgentDrawerStore>((set) => ({
  openAgentId: null,
  open: (id) => set({ openAgentId: id }),
  close: () => set({ openAgentId: null }),
}));

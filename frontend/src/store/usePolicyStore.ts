import { create } from "zustand";

export type PolicyMode = "baseline" | "predictive";

interface PolicyStore {
  mode: PolicyMode;
  setMode: (m: PolicyMode) => void;
}

export const usePolicyStore = create<PolicyStore>((set) => ({
  mode: "predictive",
  setMode: (mode) => set({ mode }),
}));

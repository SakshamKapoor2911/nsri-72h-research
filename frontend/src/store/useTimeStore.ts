import { create } from "zustand";

interface TimeStore {
  currentTimeTick: number; // day index, 1..7
  setCurrentTimeTick: (tick: number) => void;
}

export const useTimeStore = create<TimeStore>((set) => ({
  currentTimeTick: 1,
  setCurrentTimeTick: (tick) => set({ currentTimeTick: tick }),
}));

import { create } from "zustand";

interface TimeStore {
  currentTimeTick: number; // day index or float progress
  setCurrentTimeTick: (tick: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const useTimeStore = create<TimeStore>((set) => ({
  currentTimeTick: 1.0,
  setCurrentTimeTick: (tick) => set({ currentTimeTick: tick }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));

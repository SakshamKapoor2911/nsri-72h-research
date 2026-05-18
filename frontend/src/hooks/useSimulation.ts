import { useCallback, useEffect, useState } from "react";
import type { SimulationData } from "@/types/api";
import { useTimeStore } from "@/store/useTimeStore";

const API_BASE = "http://localhost:8000";

export function useSimulation() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const setTick = useTimeStore((s) => s.setCurrentTimeTick);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/simulation`);
      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
          return;
        }
        throw new Error("Backend unavailable");
      }
      const result = await response.json();
      setData(result);
      if (result.timeRange) {
        setTick(result.timeRange.startDay);
      }
    } catch (e) {
      console.error("API Error:", e);
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [setTick]);

  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/simulation/run`, { method: "POST" });
      // Poll for data until it's ready
      const poll = setInterval(async () => {
        const response = await fetch(`${API_BASE}/api/simulation`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
          setIsLoading(false);
          clearInterval(poll);
        }
      }, 2000);
      
      // Safety timeout for polling
      setTimeout(() => clearInterval(poll), 60000);
      
    } catch (e) {
      console.error("Failed to trigger simulation:", e);
      setIsLoading(false);
    }
  }, []);

  // Check if data is already available on backend (but don't trigger a run)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, runSimulation };
}

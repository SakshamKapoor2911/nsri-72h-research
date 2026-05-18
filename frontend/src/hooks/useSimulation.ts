import { useCallback, useEffect, useState } from "react";
import { mockSimulation } from "@/lib/mock-data";
import type { SimulationData } from "@/types/api";

const API_BASE = "http://localhost:8000";

export function useSimulation() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/simulation`);
      if (!response.ok) throw new Error("Backend unavailable");
      const result = await response.json();
      setData(result);
    } catch (e) {
      console.warn("API Error, falling back to mock data:", e);
      setData(mockSimulation);
      // We don't set error here so the UI still works with mock data
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/simulation/run`, { method: "POST" });
      // Wait a bit for the background task to start/finish
      setTimeout(fetchData, 2000);
    } catch (e) {
      console.error("Failed to trigger simulation:", e);
      setIsLoading(false);
    }
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, runSimulation };
}

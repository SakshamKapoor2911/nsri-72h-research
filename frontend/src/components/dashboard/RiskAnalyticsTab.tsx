import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolicyStore } from "@/store/usePolicyStore";
import type { RiskBucket } from "@/types/api";

export function RiskAnalyticsTab({ data }: { data: RiskBucket[] }) {
  // Use actual backend data: baseline (heuristic) vs predictive (Monte Carlo)
  const merged = data.map((b) => {
    return { 
      ...b, 
      baseline: (b as any).baseline ?? b.agents,  // Fall back to agents if baseline not present
      predictive: (b as any).predictive ?? b.agents
    };
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-mono text-sm text-foreground">Infection Probability Distribution</h3>
          <p className="text-[11px] text-muted-foreground">
            Comparison between Rule-based heuristic (6ft/15min) and EpiNexus Predictive posterior.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          n = {merged.reduce((a, b) => a + b.baseline, 0)} agents
        </span>
      </div>
      <div className="flex-1 rounded-md border bg-[var(--color-panel)]/60 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="oklch(0.32 0.012 250 / 50%)" vertical={false} />
            <XAxis dataKey="bracket" stroke="oklch(0.66 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.66 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "oklch(0.30 0.02 220 / 30%)" }}
              contentStyle={{
                background: "oklch(0.22 0.014 250)",
                border: "1px solid oklch(0.32 0.012 250)",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
              }}
              labelStyle={{ color: "oklch(0.96 0.005 230)" }}
            />
            <Bar 
              dataKey="baseline" 
              name="Rule-Based Baseline" 
              fill="oklch(0.45 0.02 240)" 
              radius={[3, 3, 0, 0]} 
            />
            <Bar
              dataKey="predictive"
              name="EpiNexus Predictive"
              fill="var(--color-primary)"
              radius={[3, 3, 0, 0]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { Activity, AlertTriangle, Brain, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolicyStore } from "@/store/usePolicyStore";
import type { SimulationKpis } from "@/types/api";

interface Props {
  kpis: SimulationKpis | undefined;
  isLoading: boolean;
}

const items = [
  { key: "totalAgents" as const, label: "Total Tracked", icon: Users, suffix: "", tone: "text-foreground" },
  { key: "highRiskExposures" as const, label: "High-Risk Exposures", icon: AlertTriangle, suffix: "", tone: "text-[var(--color-exposed)]" },
  { key: "networkEntropy" as const, label: "System Entropy", icon: Brain, suffix: " bits", tone: "text-primary" },
];

export function KpiBar({ kpis, isLoading }: Props) {
  const mode = usePolicyStore((s) => s.mode);

  const adjusted = (key: typeof items[number]["key"], v: number): string => {
    if (mode === "baseline") return v.toString();
    if (key === "highRiskExposures") return Math.round(v * 0.36).toString();
    if (key === "networkEntropy") return (v * 0.41).toFixed(1);
    return v.toString();
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ key, label, icon: Icon, suffix, tone }) => {
        const baseline = kpis?.[key];
        const isReduced = mode === "predictive" && (key === "highRiskExposures" || key === "networkEntropy");
        return (
          <div
            key={key}
            className="relative rounded-md border bg-[var(--color-panel)]/70 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${tone}`}>
              {isLoading || baseline === undefined ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  {adjusted(key, baseline)}
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                </>
              )}
            </div>
            {isReduced && !isLoading && baseline !== undefined && (
              <div className="mt-1 font-mono text-[10px] text-[var(--color-susceptible)]">
                ↓ vs baseline {baseline}{suffix}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

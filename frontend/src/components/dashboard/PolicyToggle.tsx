import { Shield, Sparkles } from "lucide-react";
import { usePolicyStore, type PolicyMode } from "@/store/usePolicyStore";
import { cn } from "@/lib/utils";

export function PolicyToggle() {
  const mode = usePolicyStore((s) => s.mode);
  const setMode = usePolicyStore((s) => s.setMode);

  return (
    <div className="rounded-md border bg-[var(--color-panel)]/85 p-2 shadow-lg backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Defense Policy Baseline
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-sm bg-background/60 p-1">
        <Pill
          active={mode === "baseline"}
          onClick={() => setMode("baseline")}
          icon={<Shield className="h-3 w-3" />}
          title="Rule-Based"
          subtitle="6ft / 15min"
        />
        <Pill
          active={mode === "predictive"}
          onClick={() => setMode("predictive")}
          icon={<Sparkles className="h-3 w-3" />}
          title="EpiNexus"
          subtitle="Predictive"
        />
      </div>
    </div>
  );
}

function Pill({
  active, onClick, icon, title, subtitle,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-sm px-2.5 py-1.5 text-left transition",
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/40"
          : "text-muted-foreground hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
        {icon} {title}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider opacity-70">
        {subtitle}
      </div>
    </button>
  );
}

export function applyPolicy<T extends number>(value: T, mode: PolicyMode, factor = 0.45): number {
  // Predictive engine slashes baseline overhead/uncertainty.
  return mode === "predictive" ? value * factor : value;
}

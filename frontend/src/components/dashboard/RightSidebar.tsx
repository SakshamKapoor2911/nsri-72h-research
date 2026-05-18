import { AlertOctagon, Beaker, FlaskConical, Radar, Send, Sparkles, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentDrawerStore } from "@/store/useAgentDrawerStore";
import type { EnvironmentalAlert, VoIRecommendation } from "@/types/api";

interface Props {
  recommendations: VoIRecommendation[] | undefined;
  alerts: EnvironmentalAlert[] | undefined;
  isLoading: boolean;
}

export function RightSidebar({ recommendations, alerts, isLoading }: Props) {
  return (
    <TooltipProvider>
      <aside className="flex h-full flex-col gap-5 overflow-y-auto border-l bg-[var(--color-panel)]/60 p-5">
        <header>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" /> Executive Insights
          </div>
          <h2 className="mt-1 font-mono text-sm font-medium text-foreground">
            Layman's Summary
          </h2>
        </header>

        <section className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
          {isLoading ? (
            <Skeleton className="h-16 w-full opacity-40" />
          ) : (
            <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                The <span className="text-foreground font-medium">Monte Carlo engine</span> has processed 800+ trajectories. 
                Currently, we're seeing <span className="text-[var(--color-exposed)] font-semibold">elevated risk concentrations</span> in enclosed areas with low airflow.
              </p>
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-3 w-3" /> 
                <span>Priority: Triage the top 5 agents below to stabilize the network.</span>
              </div>
            </div>
          )}
        </section>

        <header className="mt-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Radar className="h-3 w-3" /> Optimal Resource Allocation
            </div>
            <TermTooltip text="Active Learning identifies people whose test results would most reduce our total uncertainty (Entropy).">
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </TermTooltip>
          </div>
          <h2 className="mt-1 font-mono text-sm font-medium text-foreground">
            Testing Candidates
          </h2>
          <p className="text-[11px] text-muted-foreground italic">"Who should we test next to learn the most?"</p>
        </header>

        <section className="space-y-3">
          {isLoading || !recommendations
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            : recommendations.map((r) => <TestingCard key={r.id} rec={r} />)}
        </section>

        <header className="mt-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <AlertOctagon className="h-3 w-3 text-[var(--color-exposed)]" /> Environmental Alerts
            </div>
            <TermTooltip text="Places where infectious agents spent significant time. These locations may require sanitation.">
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </TermTooltip>
          </div>
        </header>

        <section className="space-y-2">
          {isLoading || !alerts
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            : alerts.map((a) => <AlertCard key={a.locationId} alert={a} />)}
        </section>
      </aside>
    </TooltipProvider>
  );
}

function TermTooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="cursor-help transition-opacity hover:opacity-70 focus:outline-none">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[180px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function TestingCard({ rec }: { rec: VoIRecommendation }) {
  const pct = Math.round(rec.riskScore * 100);
  const openAgent = useAgentDrawerStore((s) => s.open);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openAgent(rec.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openAgent(rec.id)}
      className="cursor-pointer space-y-3 rounded-md border bg-background/40 p-3 transition hover:border-primary/60 hover:bg-background/60"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            {rec.id}
          </span>
        </div>
        <span className="rounded-sm bg-[var(--color-infected)]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-infected)]">
          Priority
        </span>
      </div>

      <div className="space-y-2">
        <Row label="Risk Score" value={`${pct}%`} accent />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-exposed)] to-[var(--color-infected)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Row label="Entropy Reduction" value={`${rec.entropyReduction.toFixed(1)}%`} />
      </div>

      <Button size="sm" className="h-8 w-full text-xs" onClick={(e) => { e.stopPropagation(); openAgent(rec.id); }}>
        <Send className="mr-1.5 h-3 w-3" /> Deploy Testing Protocol
      </Button>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${accent ? "text-[var(--color-infected)]" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function AlertCard({ alert }: { alert: EnvironmentalAlert }) {
  const pct = Math.round(alert.viralLoad * 100);
  return (
    <div className="rounded-md border border-[var(--color-exposed)]/30 bg-[var(--color-exposed)]/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Beaker className="h-3 w-3 text-[var(--color-exposed)]" />
          <span className="font-mono text-xs font-medium text-foreground">{alert.locationName}</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-[var(--color-exposed)]">
          {pct}% load
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        High Ghost Virus load detected — <span className="text-foreground">Deploy bleach crews</span>.
      </p>
    </div>
  );
}

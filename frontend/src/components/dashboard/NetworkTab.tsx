import { Network } from "lucide-react";
import { useAgentDrawerStore } from "@/store/useAgentDrawerStore";
import type { AgentNode } from "@/types/api";
import { useMemo } from "react";

interface Props {
  agents: AgentNode[];
}

export function NetworkTab({ agents }: Props) {
  const openAgent = useAgentDrawerStore((s) => s.open);

  const nodes = useMemo(() => {
    return agents.map((agent, i) => {
      // Deterministic pseudo-random positions for layout since we aren't using a real force engine yet
      const angle = (i / agents.length) * Math.PI * 2;
      const radius = 15 + (1 - agent.meanRisk) * 30; // High risk closer to center
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      
      let color = "var(--color-susceptible)";
      if (agent.status === "infected") color = "var(--color-infected)";
      else if (agent.status === "exposed") color = "var(--color-exposed)";

      return {
        ...agent,
        x: `${x}%`,
        y: `${y}%`,
        color,
        r: agent.isPatientZero ? 8 : 3 + agent.meanRisk * 5
      };
    });
  }, [agents]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-md border border-dashed bg-[var(--color-panel)]/40">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(244,114,182,0.08),transparent_50%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* connections from P0 */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.filter(n => n.meanRisk > 0.4 && !n.isPatientZero).map((n) => {
            const p0 = nodes.find(node => node.isPatientZero);
            if (!p0) return null;
            return (
              <line
                key={n.id}
                x1={parseFloat(p0.x)} y1={parseFloat(p0.y)}
                x2={parseFloat(n.x)} y2={parseFloat(n.y)}
                stroke="oklch(0.66 0.02 240)" strokeWidth="0.05" opacity="0.3"
              />
            );
          })}
        </svg>

        {nodes.map((n) => (
          <button
            key={n.id}
            onClick={() => openAgent(n.id)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: n.x, top: n.y }}
            title={`${n.id} (${(n.meanRisk * 100).toFixed(1)}%)`}
          >
            <span
              className="block rounded-full ring-1 ring-offset-1 ring-offset-[var(--color-panel)] transition group-hover:scale-150"
              style={{
                width: n.r * 2,
                height: n.r * 2,
                backgroundColor: n.color,
                boxShadow: `0 0 12px ${n.color}60`,
              }}
            />
          </button>
        ))}

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur">
          <Network className="h-3 w-3 text-primary" /> Bayesian Inference Network
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
          {agents.length} agents · color coded by risk
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-[var(--color-panel)]/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <LegendDot color="var(--color-infected)" label="Infected" />
          <LegendDot color="var(--color-exposed)" label="Exposed / High Risk" />
          <LegendDot color="var(--color-susceptible)" label="Susceptible" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Nodes clustered by infection probability
        </p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-[var(--color-panel)]"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
      />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}


import { Network, MapPin } from "lucide-react";
import { useAgentDrawerStore } from "@/store/useAgentDrawerStore";
import type { AgentNode, NetworkLink } from "@/types/api";
import { useMemo } from "react";

interface Props {
  agents: AgentNode[];
  links: NetworkLink[];
}

interface EdgeData {
  id: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  weight: number;
}

export function NetworkTab({ agents, links }: Props) {
  const openAgent = useAgentDrawerStore((s) => s.open);

  const { nodes, locations, edges } = useMemo(() => {
    // 1. Identify unique locations and assign them a fixed center
    const uniqueLocs = Array.from(new Set(agents.map(a => a.primaryLocation).filter(Boolean))) as string[];
    const locCenters: Record<string, { x: number, y: number }> = {};
    
    uniqueLocs.forEach((loc, i) => {
      const angle = (i / uniqueLocs.length) * Math.PI * 2;
      const radius = 32; // Distance from center of canvas
      locCenters[loc] = {
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius
      };
    });

    // 2. Position nodes
    const nodeData = agents.map((agent, i) => {
      const center = agent.primaryLocation ? locCenters[agent.primaryLocation] : { x: 50, y: 50 };
      
      // Add slight jitter around the location center
      const jitterAngle = (i * 137.5) * (Math.PI / 180); 
      const jitterRadius = agent.primaryLocation ? 4 + (i % 8) : 10 + (i % 20);
      
      const x = center.x + Math.cos(jitterAngle) * jitterRadius;
      const y = center.y + Math.sin(jitterAngle) * jitterRadius;

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

    // 3. Map edges
    const nodeMap = new Map(nodeData.map(n => [n.id, n]));
    const edgeData: EdgeData[] = links.map(l => {
      const s = nodeMap.get(l.source);
      const t = nodeMap.get(l.target);
      if (!s || !t) return null;
      return {
        id: `${l.source}-${l.target}`,
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y,
        weight: l.weight
      };
    }).filter((e): e is EdgeData => e !== null);

    return { nodes: nodeData, locations: locCenters, edges: edgeData };
  }, [agents, links]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-md border border-dashed bg-[var(--color-panel)]/40">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.08),transparent_70%)]" />
        
        {/* Location Spheres (Background) */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.entries(locations).map(([name, center]) => (
            <div 
              key={name}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${center.x}%`, top: `${center.y}%` }}
            >
              <div className="h-32 w-32 rounded-full border border-primary/20 bg-primary/10 blur-2xl" />
              <div className="absolute inset-0 h-40 w-40 -translate-x-4 -translate-y-4 rounded-full border border-dashed border-primary/10" />
              <div className="mt-[-16px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/60 border border-primary/20 backdrop-blur-md shadow-lg z-20">
                 <MapPin className="h-2 w-2 text-primary" />
                 <span className="font-mono text-[8px] uppercase tracking-tighter text-foreground/90 font-bold">{name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* connections */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map((e: any) => (
            <line
              key={e.id}
              x1={parseFloat(e.x1)} y1={parseFloat(e.y1)}
              x2={parseFloat(e.x2)} y2={parseFloat(e.y2)}
              stroke="oklch(0.66 0.02 240)" 
              strokeWidth={0.03 + e.weight * 0.05} 
              opacity={0.15 + e.weight * 0.3}
              strokeDasharray="0.1, 0.2"
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((n) => (
          <button
            key={n.id}
            onClick={() => openAgent(n.id)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: n.x, top: n.y }}
            title={`${n.id} (${(n.meanRisk * 100).toFixed(1)}%) @ ${n.primaryLocation || 'Unknown'}`}
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
            {n.isPatientZero && (
              <span className="absolute inset-0 -m-1 rounded-full bg-red-500/50 animate-ping" style={{ width: (n.r * 2) + 8, height: (n.r * 2) + 8 }} />
            )}
          </button>
        ))}

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur">
          <Network className="h-3 w-3 text-primary" /> Spatial Contact Topology
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
          {agents.length} agents · Clustered by Primary Location
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-[var(--color-panel)]/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <LegendDot color="var(--color-infected)" label="Infected" />
          <LegendDot color="var(--color-exposed)" label="Exposed" />
          <LegendDot color="var(--color-susceptible)" label="Susceptible" />
          <div className="flex items-center gap-2 ml-2 border-l pl-5 border-muted-foreground/30">
            <div className="h-[1px] w-6 bg-muted-foreground/50 border-t border-dashed" />
            <span className="text-muted-foreground">Likely Transmission Path</span>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Physics-informed proximity clustering
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

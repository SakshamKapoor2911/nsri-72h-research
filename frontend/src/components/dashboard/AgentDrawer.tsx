import { useEffect, useState } from "react";
import { Loader2, MapPin, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentDrawerStore } from "@/store/useAgentDrawerStore";
import type { AgentNode } from "@/types/api";

interface Props {
  agents: AgentNode[] | undefined;
}

export function AgentDrawer({ agents }: Props) {
  const openAgentId = useAgentDrawerStore((s) => s.openAgentId);
  const close = useAgentDrawerStore((s) => s.close);
  const [draft, setDraft] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeCount, setRecomputeCount] = useState(0);

  const agent = agents?.find((a) => a.id === openAgentId) ?? null;

  useEffect(() => {
    if (!openAgentId) {
      setDraft("");
      setRecomputing(false);
    }
  }, [openAgentId]);

  const handleAnalyze = async () => {
    if (!draft.trim() || recomputing || !openAgentId) return;
    setRecomputing(true);
    try {
      const resp = await fetch(`http://localhost:8000/simulation/recompute?agent_id=${openAgentId}&intel=${encodeURIComponent(draft)}`, {
        method: "POST"
      });
      if (resp.ok) {
        setRecomputeCount((c) => c + 1);
        setDraft("");
      }
    } catch (e) {
      console.error("Failed to recompute:", e);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <Sheet open={!!openAgentId} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="w-[440px] overflow-y-auto border-l bg-[var(--color-panel)]/95 p-0 sm:max-w-[440px]">
        {agent && (
          <div className="relative flex h-full flex-col">
            {recomputing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="font-mono text-xs text-foreground">Recomputing transmission matrix…</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Parsing field intelligence • propagating posterior updates
                </p>
              </div>
            )}

            <SheetHeader className="border-b p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Agent Profile · Clinical Detail
                </span>
                <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                  agent.status === 'infected' ? 'bg-[var(--color-infected)]/15 text-[var(--color-infected)]' :
                  agent.status === 'exposed' ? 'bg-[var(--color-exposed)]/15 text-[var(--color-exposed)]' :
                  agent.status === 'protected' ? 'bg-green-500/15 text-green-500' :
                  'bg-blue-500/15 text-blue-500'
                }`}>
                  {agent.status}
                </span>
              </div>
              <SheetTitle className="font-mono text-xl font-semibold tracking-tight text-foreground">
                {agent.name ?? agent.id}
              </SheetTitle>
              <SheetDescription className="text-xs font-medium text-primary">
                {agent.occupation} · {agent.isPatientZero ? "Index Case" : "Subject of Interest"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 p-5">
              {/* Algorithmic Reasoning Summary */}
              <section className="rounded-md border border-primary/20 bg-primary/5 p-4 text-[11px] leading-relaxed text-muted-foreground">
                <div className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Algorithmic Reasoning
                </div>
                {agent.statusReasoning ?? "Awaiting posterior analysis..."}
              </section>

              {/* Risk metrics */}
              <div className="grid grid-cols-2 gap-4">
                <section className="space-y-3 rounded-md border bg-background/40 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Mean Risk
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--color-infected)]">
                      {(agent.meanRisk * 100).toFixed(1)}%
                    </span>
                  </div>
                </section>
                <section className="space-y-3 rounded-md border bg-background/40 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Protection Level
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold tabular-nums text-green-500">
                      {(agent.protectionLevel * 100).toFixed(0)}%
                    </span>
                  </div>
                </section>
              </div>

              <section className="space-y-3 rounded-md border bg-background/40 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Risk Distribution (95% CI)
                </div>
                <CIBar lower={agent.confidenceInterval.lower} upper={agent.confidenceInterval.upper} mean={agent.meanRisk} />
                <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span>lower · <span className="text-foreground">{(agent.confidenceInterval.lower * 100).toFixed(1)}%</span></span>
                  <span>upper · <span className="text-foreground">{(agent.confidenceInterval.upper * 100).toFixed(1)}%</span></span>
                </div>
              </section>

              {/* Locations */}
              <section className="space-y-2 rounded-md border bg-background/40 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Visited Locations
                </div>
                <ul className="space-y-1.5">
                  {(agent.visitedLocations ?? []).map((loc) => (
                    <li key={loc} className="flex items-center gap-2 font-mono text-xs text-foreground">
                      <MapPin className="h-3 w-3 text-primary" /> {loc}
                    </li>
                  ))}
                </ul>
              </section>

              {/* LLM intervention */}
              <section className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3 w-3" /> Append Unstructured Field Intelligence (Generative AI Parser)
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g., Patient recalled spending 30 minutes in the unventilated dorm lounge with ID-117 on Monday afternoon without a mask."
                  className="min-h-[110px] resize-none border-primary/20 bg-background/60 font-mono text-xs leading-relaxed"
                  disabled={recomputing}
                />
                <Button
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={handleAnalyze}
                  disabled={!draft.trim() || recomputing}
                >
                  {recomputing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3" />}
                  Analyze & Recompute Matrix
                </Button>
                {recomputeCount > 0 && !recomputing && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {recomputeCount} recompute{recomputeCount > 1 ? "s" : ""} merged · downstream posterior refreshed
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CIBar({ lower, upper, mean }: { lower: number; upper: number; mean: number }) {
  const l = lower * 100;
  const u = upper * 100;
  const m = mean * 100;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="absolute top-0 h-full bg-gradient-to-r from-[var(--color-exposed)] to-[var(--color-infected)] opacity-60"
        style={{ left: `${l}%`, width: `${u - l}%` }}
      />
      <div
        className="absolute top-0 h-full w-[2px] bg-foreground"
        style={{ left: `${m}%` }}
      />
    </div>
  );
}

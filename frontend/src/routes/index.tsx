import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { CenterCanvas } from "@/components/dashboard/CenterCanvas";
import { KpiBar } from "@/components/dashboard/KpiBar";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { PolicyToggle } from "@/components/dashboard/PolicyToggle";
import { AgentDrawer } from "@/components/dashboard/AgentDrawer";
import { useSimulation } from "@/hooks/useSimulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EpiNexus — Epidemiological Command Center" },
      { name: "description", content: "Decision-support dashboard for localized outbreak modeling with active-learning test allocation." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, runSimulation } = useSimulation();

  return (
    <div className="dark relative h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="grid h-full grid-cols-[280px_1fr_340px]">
        <LeftSidebar isLoading={isLoading} onRun={runSimulation} />

        <main className="flex h-full min-w-0 flex-col gap-4 overflow-hidden p-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-mono text-sm font-semibold tracking-tight text-foreground">
                  EpiNexus
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Outbreak Decision Support · v0.1
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${isLoading ? "bg-[var(--color-exposed)] animate-pulse" : "bg-[var(--color-susceptible)]"}`} />
              {isLoading ? "Inference running" : "Posterior stable"}
            </div>
          </header>

          <KpiBar kpis={data?.kpis} isLoading={isLoading} />

          <section className="min-h-0 flex-1">
            <CenterCanvas data={data} isLoading={isLoading} onRun={runSimulation} />
          </section>
        </main>

        <RightSidebar
          recommendations={data?.recommendations}
          alerts={data?.environmentalAlerts}
          isLoading={isLoading}
        />
      </div>

      <AgentDrawer agents={data?.agents} />
    </div>
  );
}

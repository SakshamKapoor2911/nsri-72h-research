import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { NetworkTab } from "./NetworkTab";
import { SpatioTemporalTab } from "./SpatioTemporalTab";
import { RiskAnalyticsTab } from "./RiskAnalyticsTab";
import { GlobalDataView } from "./GlobalDataView";
import { SimulationControlsTab } from "./SimulationControlsTab";
import type { SimulationData } from "@/types/api";

interface Props {
  data: SimulationData | null;
  isLoading: boolean;
  onRun: () => void;
}

export function CenterCanvas({ data, isLoading, onRun }: Props) {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="network" className="flex h-full flex-col">
        <TabsList className="h-9 w-fit bg-[var(--color-panel)]/60">
          <TabsTrigger value="network" className="font-mono text-xs">Network Topology</TabsTrigger>
          <TabsTrigger value="spatio" className="font-mono text-xs">Spatio-Temporal Map</TabsTrigger>
          <TabsTrigger value="global" className="font-mono text-xs">Global Data View</TabsTrigger>
          <TabsTrigger value="risk" className="font-mono text-xs">Risk Analytics</TabsTrigger>
          <TabsTrigger value="controls" className="font-mono text-xs text-primary">Simulation Controls</TabsTrigger>
        </TabsList>

        <div className="mt-3 flex-1 overflow-hidden">
          {isLoading || !data ? (
            <CanvasSkeleton />
          ) : (
            <>
              <TabsContent value="network" className="h-full"><NetworkTab agents={data.agents} /></TabsContent>
              <TabsContent value="spatio" className="h-full">
                <SpatioTemporalTab startDay={data.timeRange.startDay} endDay={data.timeRange.endDay} arcs={data.spatialArcs} />
              </TabsContent>
              <TabsContent value="global" className="h-full">
                <GlobalDataView agents={data.agents} />
              </TabsContent>
              <TabsContent value="risk" className="h-full"><RiskAnalyticsTab data={data.riskDistribution} /></TabsContent>
              <TabsContent value="controls" className="h-full">
                <SimulationControlsTab isLoading={isLoading} onRun={onRun} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-md border border-dashed bg-[var(--color-panel)]/40">
        <Skeleton className="absolute inset-0 rounded-none opacity-40" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="font-mono text-xs text-muted-foreground">
            Running Monte Carlo inference…
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/70">
            Sampling posterior over 500 agents
          </p>
        </div>
      </div>
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

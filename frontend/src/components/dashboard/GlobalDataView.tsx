import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAgentDrawerStore } from "@/store/useAgentDrawerStore";
import type { AgentNode } from "@/types/api";

interface Props {
  agents: AgentNode[];
}

export function GlobalDataView({ agents }: Props) {
  const openAgent = useAgentDrawerStore((s) => s.open);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border bg-[var(--color-panel)]/60 px-4 py-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Global Agent Registry
        </span>
        <span className="font-mono text-[10px] text-primary">
          {agents.length} records active
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-md border bg-[var(--color-panel)]/40">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead className="w-[120px] font-mono text-[10px] uppercase">Agent ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">Mean Risk</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">95% CI</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">Locations Visited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openAgent(agent.id)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {agent.isPatientZero && <span className="mr-1 text-[var(--color-infected)]">●</span>}
                    {agent.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] uppercase ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {(agent.meanRisk * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    [{agent.confidenceInterval.lower.toFixed(2)}, {agent.confidenceInterval.upper.toFixed(2)}]
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate font-mono text-[10px] text-muted-foreground">
                    {agent.visitedLocations.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "infected": return "border-[var(--color-infected)] text-[var(--color-infected)] bg-[var(--color-infected)]/10";
    case "exposed": return "border-[var(--color-exposed)] text-[var(--color-exposed)] bg-[var(--color-exposed)]/10";
    case "susceptible": return "border-[var(--color-susceptible)] text-[var(--color-susceptible)] bg-[var(--color-susceptible)]/10";
    default: return "";
  }
}

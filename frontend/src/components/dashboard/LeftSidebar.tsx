import { Microscope, Play, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface LeftSidebarProps {
  isLoading?: boolean;
  onRun?: () => void;
}

export function LeftSidebar({ isLoading, onRun }: LeftSidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col gap-6 border-r bg-[var(--color-panel)]/60 p-5">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Microscope className="h-3 w-3" /> System Intelligence
        </div>
        <h2 className="mt-1 font-mono text-base font-medium text-foreground">EpiNexus / Console</h2>
      </div>

      <section className="space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Project Metadata
        </div>
        <div className="space-y-2 rounded-md border bg-background/40 p-3">
          <MetaRow label="Version" value="v1.0.4" />
          <MetaRow label="Engine" value="NumPy/Ghost" />
          <MetaRow label="Region" value="Maryland, USA" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Documentation
        </div>
        <Link to="/methodology">
          <Button variant="outline" className="w-full h-8 justify-start font-mono text-[10px] uppercase tracking-wider border-primary/20 bg-primary/5 hover:bg-primary/10">
            <BookOpen className="mr-2 h-3.5 w-3.5 text-primary" />
            Research Methodology
          </Button>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Execution
        </div>
        <Button 
          className="w-full h-9 font-mono text-[11px] uppercase tracking-wider" 
          disabled={isLoading}
          onClick={onRun}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-2 h-3 w-3" />
          )}
          Run Monte Carlo
        </Button>
      </section>

      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Quick Help
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Navigate the tabs to visualize the transmission network. Use the <span className="text-primary font-medium">Simulation Controls</span> tab to adjust environmental variables and re-run the Monte Carlo inference engine.
        </p>
      </section>

      <div className="mt-auto space-y-2">
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[9px] leading-relaxed text-primary">
            SYSTEM STATUS: OPERATIONAL
            <br />
            LAST INFERENCE: 2m ago
          </p>
        </div>
      </div>
    </aside>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

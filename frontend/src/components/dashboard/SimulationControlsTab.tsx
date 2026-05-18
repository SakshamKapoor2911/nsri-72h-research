import { useState } from "react";
import { Loader2, Play, Wind, ShieldCheck, Microscope, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PathogenId } from "@/types/api";

interface Props {
  isLoading: boolean;
  onRun: () => void;
}

export function SimulationControlsTab({ isLoading, onRun }: Props) {
  const [pathogen, setPathogen] = useState<PathogenId>("andes-hantavirus");
  const [ach, setAch] = useState<number[]>([3.5]);
  const [compliance, setCompliance] = useState<number[]>([68]);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col gap-6 rounded-md border bg-[var(--color-panel)]/60 p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Microscope className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                Inference Configuration
              </h3>
              <p className="text-[11px] text-muted-foreground">Adjust environmental and biological parameters</p>
            </div>
          </div>
          <Button onClick={onRun} disabled={isLoading} size="sm" className="px-6">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sampling Posterior…</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Execute Monte Carlo</>
            )}
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Pathogen Config */}
          <section className="space-y-4 rounded-md border bg-background/40 p-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Pathogen Profile</span>
              <TermTooltip text="The specific virus or bacteria being modeled. Different pathogens have varying infectivity (alpha) and environmental decay rates.">
                <Info className="h-3 w-3 text-muted-foreground" />
              </TermTooltip>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Active Strain</Label>
              <Select value={pathogen} onValueChange={(v) => setPathogen(v as PathogenId)}>
                <SelectTrigger className="h-10 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="andes-hantavirus">Andes Hantavirus (2026 Variant)</SelectItem>
                  <SelectItem value="covid-19">SARS-CoV-2 (Omicron)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Current model uses <span className="text-foreground font-medium">Bayesian state propagation</span> with a baseline infectivity α=0.045.
            </p>
          </section>

          {/* Environmental Overrides */}
          <section className="space-y-6 rounded-md border bg-background/40 p-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Environmental Variables</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs text-foreground">
                  <Wind className="h-3.5 w-3.5 text-primary" /> Classroom ACH
                  <TermTooltip text="Air Changes per Hour (ACH). Higher values indicate better ventilation, which increases the decay rate of the 'Ghost Virus' (aerosol load) in a location.">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TermTooltip>
                </Label>
                <span className="font-mono text-xs tabular-nums text-primary font-bold">
                  {ach[0].toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">/hr</span>
                </span>
              </div>
              <Slider value={ach} onValueChange={setAch} min={0.5} max={12} step={0.1} disabled={isLoading} className="py-2" />
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0.5 (Stagnant)</span><span>12.0 (High Flow)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Mitigation Compliance
                  <TermTooltip text="The percentage of agents following protocols like masking and social distancing. This acts as a multiplier on the total accumulated dosage during contacts.">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TermTooltip>
                </Label>
                <span className="font-mono text-xs tabular-nums text-primary font-bold">{compliance[0]}%</span>
              </div>
              <Slider value={compliance} onValueChange={setCompliance} min={0} max={100} step={1} disabled={isLoading} className="py-2" />
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0% (None)</span><span>100% (Full)</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-auto rounded-md border border-dashed border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-sm text-primary">
              <Info className="h-4 w-4" />
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {isLoading
                ? "Monte Carlo sampler is actively traversing the transmission graph. Using ThreadPoolExecutor to parallelize 10,000 posterior iterations."
                : "Simulation uses stochastic parameter sampling. Each 'Run' updates the global risk distribution across all 500+ agents based on the selected configuration."}
            </p>
          </div>
        </footer>
      </div>
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
      <TooltipContent side="top" className="max-w-[200px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

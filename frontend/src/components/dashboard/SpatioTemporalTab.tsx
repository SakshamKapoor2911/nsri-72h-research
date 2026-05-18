import { Globe2, Play, Pause, RotateCcw, Zap } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useTimeStore } from "@/store/useTimeStore";
import { useEffect, useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SpatialArc, SpatialPoint } from "@/types/api";

interface Props {
  startDay: number;
  endDay: number;
  arcs: SpatialArc[];
  points?: SpatialPoint[];
}

// Risk-based color mapping: cyan (low) → amber (medium) → crimson (high)
function riskColor(risk: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [56, 189, 248]],   // cyan-400 (susceptible)
    [0.33, [34, 197, 94]], // green-500 (exposed mild)
    [0.66, [251, 191, 36]], // amber-400 (exposed moderate)
    [1, [225, 29, 72]],    // rose-600 (infected/high risk)
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (risk <= b) {
      const t = (risk - a) / (b - a);
      const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(225, 29, 72)";
}

export function SpatioTemporalTab({ startDay, endDay, arcs, points }: Props) {
  const tick = useTimeStore((s) => s.currentTimeTick);
  const setTick = useTimeStore((s) => s.setCurrentTimeTick);
  const isPlaying = useTimeStore((s) => s.isPlaying);
  const setIsPlaying = useTimeStore((s) => s.setIsPlaying);
  const timerRef = useRef<number | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<SpatialPoint | null>(null);
  const [hoveredArc, setHoveredArc] = useState<SpatialArc | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const start = performance.now();
      const initialTick = tick;
      
      const frame = (now: number) => {
        const elapsed = now - start;
        // Advance by 1 day every 5 seconds (0.2 days per second)
        const nextTick = initialTick + (elapsed / 5000);
        
        if (nextTick >= endDay) {
          setTick(endDay);
          setIsPlaying(false);
        } else {
          setTick(nextTick);
          timerRef.current = requestAnimationFrame(frame);
        }
      };
      timerRef.current = requestAnimationFrame(frame);
    } else if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, endDay, setIsPlaying, setTick]);

  const activeVectorsCount = useMemo(() => arcs.filter(a => a.tick <= tick).length, [arcs, tick]);
  
  // Filter spatial points within ±0.25 days of current tick for smooth animation
  // Ensure we only show one point per agent at any given time tick
  const visiblePoints = useMemo(() => {
    if (!points) return [];
    const timeWindow = 0.25; // Show points within this range of current tick
    const filtered = points.filter(p => Math.abs(p.tick - tick) <= timeWindow);
    
    // Deduplicate: Map by label (agent name/id) to keep only the closest in time
    const map = new Map<string, SpatialPoint>();
    for (const p of filtered) {
        const existing = map.get(p.label);
        if (!existing || Math.abs(p.tick - tick) < Math.abs(existing.tick - tick)) {
            map.set(p.label, p);
        }
    }
    return Array.from(map.values());
  }, [points, tick]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-md border bg-[radial-gradient(ellipse_at_center,oklch(0.24_0.02_240)_0%,oklch(0.16_0.012_250)_70%)]">
        {/* atmosphere grid (faux geo perspective) */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 60">
          <defs>
            <linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>
          {/* perspective latitude lines */}
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 10 + i * 7;
            return <line key={`lat-${i}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(148,163,184,0.07)" strokeWidth="0.15" />;
          })}
          {/* converging longitude lines */}
          {Array.from({ length: 12 }).map((_, i) => {
            const x = i * (100 / 11);
            return <line key={`lon-${i}`} x1={x} y1="0" x2={50} y2="60" stroke="rgba(148,163,184,0.06)" strokeWidth="0.15" />;
          })}
          <rect x="0" y="0" width="100" height="60" fill="url(#horizon)" />
        </svg>

        {/* arcs canvas */}
        <TooltipProvider delayDuration={100}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
            {/* Historical Paths (Dotted Lines) */}
            {arcs.filter(a => a.tick < Math.floor(tick)).map((a) => {
               const x1 = a.from.x * 100;
               const y1 = a.from.y * 60;
               const x2 = a.to.x * 100;
               const y2 = a.to.y * 60;
               const mx = (x1 + x2) / 2;
               const dist = Math.hypot(x2 - x1, y2 - y1);
               const my = Math.min(y1, y2) - dist * 0.55;
               return (
                 <path
                   key={`path-${a.id}`}
                   d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                   fill="none"
                   stroke="rgba(148,163,184,0.15)"
                   strokeWidth="0.15"
                   strokeDasharray="1,2"
                   opacity={0.4}
                 />
               );
            })}

            {arcs.filter(a => a.tick <= Math.ceil(tick)).map((a) => {
              const x1 = a.from.x * 100;
              const y1 = a.from.y * 60;
              const x2 = a.to.x * 100;
              const y2 = a.to.y * 60;
              const mx = (x1 + x2) / 2;
              const dist = Math.hypot(x2 - x1, y2 - y1);
              const my = Math.min(y1, y2) - dist * 0.55;
              
              // Progressive growth logic:
              // If tick is 1.5 and a.tick is 1, it's 50% through its "appearing" day
              const dayProgress = Math.max(0, Math.min(1, tick - a.tick + 1));
              
              // Faux path length for dash offset
              // Q curve length is approx dist * 1.2
              const pathLen = dist * 12; // multiplied for dash space

              return (
                <g 
                  key={a.id}
                  onMouseEnter={() => setHoveredArc(a)}
                  onMouseLeave={() => setHoveredArc(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                    fill="none"
                    stroke={riskColor(a.riskDensity)}
                    strokeWidth={hoveredArc?.id === a.id ? (0.35 + a.riskDensity * 0.5) * 2 : 0.35 + a.riskDensity * 0.5}
                    strokeLinecap="round"
                    strokeDasharray={pathLen}
                    strokeDashoffset={pathLen * (1 - dayProgress)}
                    opacity={dayProgress * 0.85}
                    style={{ filter: `drop-shadow(0 0 1.2px ${riskColor(a.riskDensity)})` }}
                  />
                  {dayProgress > 0.95 && (
                    <circle cx={x2} cy={y2} r={hoveredArc?.id === a.id ? (0.7 + a.riskDensity * 0.9) * 1.5 : 0.7 + a.riskDensity * 0.9} fill={riskColor(a.riskDensity)} opacity={0.9} />
                  )}
                </g>
              );
            })}

            {/* Spatial Points Layer - 800+ individual agent locations */}
            {showPoints && visiblePoints.map((p) => {
              const x = p.x * 100;
              const y = p.y * 60;
              const color = riskColor(p.risk);
              const size = 0.3 + p.risk * 0.5; // Larger points for higher risk
              const opacity = 0.6 + p.risk * 0.4; // Higher opacity for higher risk
              
              return (
                <g key={p.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <circle
                        cx={x}
                        cy={y}
                        r={hoveredPoint?.id === p.id ? size * 2 : size}
                        fill={color}
                        opacity={opacity}
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="cursor-pointer"
                        style={{
                          filter: `drop-shadow(0 0 ${0.3 + p.risk * 0.3}px ${color})`,
                          transition: 'all 0.3s ease',
                          animation: 'popIn 0.5s ease-out forwards'
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] bg-background/90 border border-primary/20">
                      <p className="font-bold">{p.label}</p>
                      <p>Risk: {(p.risk * 100).toFixed(1)}%</p>
                      <p>Status: {p.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </g>
              );
            })}

            {/* Global animation definitions */}
            <style>{`
              @keyframes popIn {
                0% { transform: scale(0); opacity: 0; }
                100% { transform: scale(1); opacity: ${0.6 + 0.4}; }
              }
            `}</style>

            {/* origin pulse */}
            {arcs.length > 0 && (
              <g>
                <circle cx={arcs[0].from.x * 100} cy={arcs[0].from.y * 60} r="1.6" fill="rgb(225,29,72)" />
                <circle cx={arcs[0].from.x * 100} cy={arcs[0].from.y * 60} r="3" fill="none" stroke="rgb(225,29,72)" strokeWidth="0.2" opacity="0.5">
                  <animate attributeName="r" from="1.6" to="5" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        </TooltipProvider>

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur">
          <Globe2 className="h-3 w-3 text-primary" /> 800+ Spatial Points · Risk Heatmap
        </div>
        <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
          <button
            onClick={() => setShowPoints(!showPoints)}
            className="rounded-sm bg-background/50 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary hover:bg-primary/10 backdrop-blur transition-colors"
            title={showPoints ? "Hide spatial points" : "Show spatial points"}
          >
            <Zap className="h-3 w-3 inline mr-1" />
            {showPoints ? "Hide" : "Show"} Points
          </button>
          <div className="rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] tabular-nums text-primary backdrop-blur">
            {visiblePoints.length} visible · day {tick.toFixed(2)}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <ArcLegend totalPoints={visiblePoints.length} activeCases={Math.floor(tick * 5)} />
          <span>origin: Cruise Terminal A · 36.7°N / -76.0°W</span>
        </div>
      </div>

      <div className="rounded-md border bg-[var(--color-panel)]/60 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Continuous Time Scrub
            </span>
            <div className="flex items-center gap-1 rounded border bg-background/40 p-1">
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:bg-primary/20 hover:text-primary"
                onClick={() => setIsPlaying(!isPlaying)}
               >
                 {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:bg-primary/20 hover:text-primary"
                onClick={() => {
                  setIsPlaying(false);
                  setTick(startDay);
                }}
               >
                 <RotateCcw className="h-3 w-3" />
               </Button>
            </div>
          </div>
          <span className="font-mono text-xs tabular-nums text-primary">
            Day {tick.toFixed(2)} / {endDay}
          </span>
        </div>
        <Slider
          value={[tick]}
          onValueChange={(v) => {
            setIsPlaying(false);
            setTick(v[0]);
          }}
          min={startDay}
          max={endDay}
          step={0.01}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>Day {startDay}</span>
          <span>Day {endDay}</span>
        </div>
      </div>
    </div>
  );
}

function ArcLegend({ totalPoints, activeCases }: { totalPoints: number, activeCases: number }) {
  return (
    <div className="flex items-center gap-4 rounded-sm bg-background/50 px-3 py-2 backdrop-blur text-[9px]">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="uppercase tracking-wider font-semibold">Risk:</span>
          <div className="h-1.5 w-20 rounded-full" style={{ background: "linear-gradient(90deg, rgb(56,189,248) 0%, rgb(34,197,94) 33%, rgb(251,191,36) 66%, rgb(225,29,72) 100%)" }} />
          <span className="uppercase tracking-wider text-muted-foreground">low → high</span>
        </div>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-2 uppercase tracking-wider">
        <span>Points: <span className="text-primary font-mono">{totalPoints}</span></span>
        <span>Cases: <span className="text-rose-500 font-mono">{activeCases}</span></span>
      </div>
    </div>
  );
}

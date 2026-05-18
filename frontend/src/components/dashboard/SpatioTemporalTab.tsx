import { Globe2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useTimeStore } from "@/store/useTimeStore";
import type { SpatialArc } from "@/types/api";

interface Props {
  startDay: number;
  endDay: number;
  arcs: SpatialArc[];
}

// cyan (low risk) → crimson (high)
function arcColor(risk: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [56, 189, 248]],   // cyan-400
    [0.5, [251, 191, 36]], // amber-400
    [1, [225, 29, 72]],    // rose-600
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

export function SpatioTemporalTab({ startDay, endDay, arcs }: Props) {
  const tick = useTimeStore((s) => s.currentTimeTick);
  const setTick = useTimeStore((s) => s.setCurrentTimeTick);

  const visible = arcs.filter((a) => a.tick <= tick);

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
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
          {/* Historical Paths (Dotted Lines) */}
          {arcs.filter(a => a.tick < tick).map((a) => {
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

          {visible.map((a) => {
            const x1 = a.from.x * 100;
            const y1 = a.from.y * 60;
            const x2 = a.to.x * 100;
            const y2 = a.to.y * 60;
            const mx = (x1 + x2) / 2;
            // Lift arc apex by distance to fake 3D height
            const dist = Math.hypot(x2 - x1, y2 - y1);
            const my = Math.min(y1, y2) - dist * 0.55;
            const color = arcColor(a.riskDensity);
            return (
              <g key={a.id}>
                <path
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.35 + a.riskDensity * 0.5}
                  strokeLinecap="round"
                  opacity={0.85}
                  style={{ filter: `drop-shadow(0 0 1.2px ${color})` }}
                />
                <circle cx={x2} cy={y2} r={0.7 + a.riskDensity * 0.9} fill={color} opacity="0.95" />
              </g>
            );
          })}
          {/* origin pulse */}
          {visible[0] && (
            <g>
              <circle cx={visible[0].from.x * 100} cy={visible[0].from.y * 60} r="1.6" fill="rgb(225,29,72)" />
              <circle cx={visible[0].from.x * 100} cy={visible[0].from.y * 60} r="3" fill="none" stroke="rgb(225,29,72)" strokeWidth="0.2" opacity="0.5">
                <animate attributeName="r" from="1.6" to="5" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
        </svg>

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur">
          <Globe2 className="h-3 w-3 text-primary" /> deck.gl ArcLayer · 3D Geo Viewport
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-background/50 px-2 py-1 font-mono text-[10px] tabular-nums text-primary backdrop-blur">
          {visible.length} active vectors · day {tick}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <ArcLegend />
          <span>origin: Cruise Terminal A · 36.7°N / -76.0°W</span>
        </div>
      </div>

      <div className="rounded-md border bg-[var(--color-panel)]/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Time Scrub
          </span>
          <span className="font-mono text-xs tabular-nums text-primary">
            Day {tick} / {endDay}
          </span>
        </div>
        <Slider
          value={[tick]}
          onValueChange={(v) => setTick(v[0])}
          min={startDay}
          max={endDay}
          step={1}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>Day {startDay}</span>
          <span>Day {endDay}</span>
        </div>
      </div>
    </div>
  );
}

function ArcLegend() {
  return (
    <div className="flex items-center gap-2 rounded-sm bg-background/50 px-2 py-1 backdrop-blur">
      <span>Exposure density</span>
      <div className="h-1.5 w-24 rounded-full" style={{ background: "linear-gradient(90deg, rgb(56,189,248), rgb(251,191,36), rgb(225,29,72))" }} />
      <span className="text-[9px] uppercase tracking-wider">low → high</span>
    </div>
  );
}

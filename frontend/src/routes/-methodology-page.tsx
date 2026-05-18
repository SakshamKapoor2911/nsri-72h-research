import { Microscope, Database, Zap, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-8 text-foreground overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-12">
        <header className="space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to Intelligence Dashboard
          </Link>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Microscope className="h-7 w-7" />
              </div>
              <h1 className="font-mono text-3xl font-bold tracking-tighter uppercase">Methodology & Performance Report</h1>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              EpiNexus is a high-fidelity epidemiological decision-support platform. This document outlines the physical and mathematical foundations of the transmission engine, our use of generative AI for persona synthesis, and real-world system benchmarks.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Inference Latency" 
            value="174ms" 
            description="Average time per Monte Carlo iteration for 801 agents."
            icon={<Zap className="h-4 w-4" />}
          />
          <StatCard 
            title="Throughput" 
            value="4,597" 
            description="Agent exposure cycles processed per second."
            icon={<Database className="h-4 w-4" />}
          />
        </section>

        <main className="space-y-12 pb-20">
          <section className="space-y-6">
            <h2 className="font-mono text-xl font-semibold uppercase tracking-wider border-b border-primary/20 pb-2">1. The "Ghost Virus" Engine</h2>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground font-sans">
              <p>
                EpiNexus models transmission as a combination of **Direct Spatial Proximity** and **Indirect Environmental Load**. 
                The "Ghost Virus" effect represents the persistence of viral load in shared indoor spaces even after an infected agent has left.
              </p>
              <div className="rounded-md bg-muted/40 p-4 font-mono text-[11px] text-primary border border-primary/10">
                // Direct Exposure Kernel (Aggressive Decay)<br/>
                intensity = (1.0 / (dist_sq * 1000000 + 1.0)) * dt * effective_alpha
              </div>
              <p>
                We implemented a steep power-law decay to ensure that only sustained close-range contact (within 2-5 meters) contributes to the infection probability. 
                This prevents the "everyone is exposed" bias common in simpler models.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-mono text-xl font-semibold uppercase tracking-wider border-b border-primary/20 pb-2">2. LLM-Enhanced Persona Synthesis</h2>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Using **Groq Llama-3.1**, we synthesize high-fidelity agent personas that replace generic IDs with realistic identities. 
                Each agent has an occupation and a health profile that directly influences their routine:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Staff/Service Personas:</strong> Frequent high-volume utility nodes (Dining Halls, Transit Hubs).</li>
                <li><strong>Academic Personas:</strong> Extended dwell times in low-occupancy nodes (Library, Private Offices).</li>
                <li><strong>Health Profiles:</strong> Protection levels are dynamically calculated as the inverse of vulnerability scores, influencing the final clinical status.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-mono text-xl font-semibold uppercase tracking-wider border-b border-primary/20 pb-2">3. Algorithmic Status Determination</h2>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Unlike basic SIR models, EpiNexus uses four distinct clinical states based on cumulative dosage and physiological resilience:
              </p>
              <div className="grid grid-cols-2 gap-4 font-mono">
                <StatusDetail status="Infected" color="var(--color-infected)" desc="Index cases (Patient Zero) or confirmed positives." />
                <StatusDetail status="Exposed" color="var(--color-exposed)" desc="High cumulative dosage exceeding threshold." />
                <StatusDetail status="Protected" color="rgba(34, 197, 94, 1)" desc="Significant exposure but high physiological resilience." />
                <StatusDetail status="Susceptible" color="var(--color-susceptible)" desc="Low cumulative dosage within the population." />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-mono text-xl font-semibold uppercase tracking-wider border-b border-primary/20 pb-2">4. Performance Benchmarks</h2>
            <div className="rounded-md border border-primary/20 bg-[var(--color-panel)] overflow-hidden">
               <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-primary/5">
                    <tr>
                      <th className="p-3 border-b border-primary/10">Metric</th>
                      <th className="p-3 border-b border-primary/10">Value</th>
                      <th className="p-3 border-b border-primary/10">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    <tr>
                      <td className="p-3 font-bold">Certainty Gain</td>
                      <td className="p-3 text-primary">74.9%</td>
                      <td className="p-3">Reduction in CI width after 50 MC iterations.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">10k Scale Projection</td>
                      <td className="p-3 text-primary">3.00s</td>
                      <td className="p-3">Time for 1 full iteration for 10,000 agents.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">System Capacity</td>
                      <td className="p-3 text-primary">~45,000</td>
                      <td className="p-3">Max agents handled within a 10s window.</td>
                    </tr>
                  </tbody>
               </table>
            </div>
          </section>
        </main>

        <footer className="pt-12 border-t border-primary/10 flex justify-between items-center text-[10px] uppercase font-mono text-muted-foreground tracking-widest pb-12">
           <span>EpiNexus v1.0.4 - Optimizing Outbreak Intelligence</span>
           <span>Built for the 72h Research Sprint</span>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon }: { title: string, value: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-[var(--color-panel)]/40 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
        <div className="text-primary opacity-50">{icon}</div>
      </div>
      <div className="text-2xl font-mono font-bold text-foreground">{value}</div>
      <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
    </div>
  );
}

function StatusDetail({ status, color, desc }: { status: string, color: string, desc: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-primary/10 transition-colors">
      <div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{status}</div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

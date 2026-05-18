import type { AgentNode, AgentStatus, EnvironmentalAlert, RiskBucket, SimulationData, SpatialArc, VoIRecommendation } from "@/types/api";

const LOCATIONS = ["Dining Hall", "Lecture Hall 3B", "Library — West Wing", "Dorm Lounge C", "Gymnasium", "Shuttle Bus 04"];

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function pickLocations(rand: () => number): string[] {
  const n = 2 + Math.floor(rand() * 3);
  const set = new Set<string>();
  while (set.size < n) set.add(LOCATIONS[Math.floor(rand() * LOCATIONS.length)]);
  return [...set];
}

function buildAgents(): AgentNode[] {
  const rand = seeded(42);
  const agents: AgentNode[] = [{
    id: "ID-001", isPatientZero: true, meanRisk: 1,
    confidenceInterval: { lower: 0.98, upper: 1 }, status: "infected",
    visitedLocations: ["Cruise Terminal A", "Shuttle Bus 04", "Dorm Lounge C"],
  }];
  for (let i = 0; i < 14; i++) {
    const mean = 0.6 + rand() * 0.35;
    const spread = 0.04 + rand() * 0.08;
    agents.push({
      id: `ID-${String(i + 2).padStart(3, "0")}`,
      isPatientZero: false, meanRisk: mean,
      confidenceInterval: { lower: Math.max(0, mean - spread), upper: Math.min(1, mean + spread) },
      status: "exposed",
      visitedLocations: pickLocations(rand),
    });
  }
  for (let i = 0; i < 60; i++) {
    const mean = rand() * 0.4;
    const spread = 0.02 + rand() * 0.06;
    const status: AgentStatus = mean > 0.3 ? "exposed" : "susceptible";
    agents.push({
      id: `ID-${String(i + 16).padStart(3, "0")}`,
      isPatientZero: false, meanRisk: mean,
      confidenceInterval: { lower: Math.max(0, mean - spread), upper: Math.min(1, mean + spread) },
      status,
      visitedLocations: pickLocations(rand),
    });
  }
  const patch: Record<string, string[]> = {
    "ID-042": ["Dining Hall", "Lecture Hall 3B", "Dorm Lounge C"],
    "ID-117": ["Dorm Lounge C", "Gymnasium"],
    "ID-208": ["Library — West Wing", "Shuttle Bus 04"],
    "ID-331": ["Lecture Hall 3B", "Dining Hall"],
  };
  for (const [id, locs] of Object.entries(patch)) {
    const found = agents.find((a) => a.id === id);
    if (found) found.visitedLocations = locs;
    else agents.push({
      id, isPatientZero: false, meanRisk: 0.7,
      confidenceInterval: { lower: 0.6, upper: 0.82 },
      status: "exposed", visitedLocations: locs,
    });
  }
  return agents;
}

const PORT = { id: "port-cruise", label: "Cruise Terminal A", x: 0.12, y: 0.72 };
const DESTINATIONS = [
  { id: "d-1", label: "Campus North", x: 0.42, y: 0.28 },
  { id: "d-2", label: "Downtown Hub", x: 0.58, y: 0.55 },
  { id: "d-3", label: "Airport Transit", x: 0.78, y: 0.22 },
  { id: "d-4", label: "Regional Med Ctr", x: 0.86, y: 0.62 },
  { id: "d-5", label: "Suburban East", x: 0.68, y: 0.82 },
  { id: "d-6", label: "Coastal Resort", x: 0.32, y: 0.46 },
];

function buildArcs(): SpatialArc[] {
  const rand = seeded(7);
  const arcs: SpatialArc[] = [];
  for (let tick = 1; tick <= 7; tick++) {
    const count = 1 + Math.floor(rand() * 2) + Math.min(tick, 3);
    for (let i = 0; i < count; i++) {
      const dest = DESTINATIONS[Math.floor(rand() * DESTINATIONS.length)];
      const risk = Math.min(1, 0.15 + tick * 0.11 + rand() * 0.25);
      arcs.push({
        id: `arc-${tick}-${i}`,
        from: PORT,
        to: dest,
        riskDensity: risk,
        tick,
      });
    }
  }
  return arcs;
}

const riskDistribution: RiskBucket[] = [
  { bracket: "0-10%", agents: 312 },
  { bracket: "10-20%", agents: 84 },
  { bracket: "20-30%", agents: 41 },
  { bracket: "30-40%", agents: 22 },
  { bracket: "40-50%", agents: 13 },
  { bracket: "50-60%", agents: 9 },
  { bracket: "60-70%", agents: 7 },
  { bracket: "70-80%", agents: 6 },
  { bracket: "80-90%", agents: 4 },
  { bracket: "90-100%", agents: 2 },
];

const recommendations: VoIRecommendation[] = [
  { id: "ID-042", riskScore: 0.82, entropyReduction: 14.3 },
  { id: "ID-117", riskScore: 0.74, entropyReduction: 11.8 },
  { id: "ID-208", riskScore: 0.69, entropyReduction: 9.6 },
  { id: "ID-331", riskScore: 0.58, entropyReduction: 7.2 },
];

const environmentalAlerts: EnvironmentalAlert[] = [
  { locationId: "loc-dining-hall", locationName: "Dining Hall", viralLoad: 0.87, timestamp: new Date().toISOString() },
  { locationId: "loc-lecture-3b", locationName: "Lecture Hall 3B", viralLoad: 0.62, timestamp: new Date(Date.now() - 1320000).toISOString() },
  { locationId: "loc-library-west", locationName: "Library — West Wing", viralLoad: 0.41, timestamp: new Date(Date.now() - 3300000).toISOString() },
];

export const mockSimulation: SimulationData = {
  kpis: { totalAgents: 500, activeCases: 1, highRiskExposures: 14, networkEntropy: 42.8 },
  agents: buildAgents(),
  recommendations,
  environmentalAlerts,
  riskDistribution,
  spatialArcs: buildArcs(),
  timeRange: { startDay: 1, endDay: 7 },
};

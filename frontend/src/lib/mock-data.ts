import type { AgentNode, AgentStatus, EnvironmentalAlert, RiskBucket, SimulationData, SpatialArc, SpatialPoint, VoIRecommendation } from "@/types/api";

// ============================================================================
// EPIDEMIOLOGICAL RUBRIC FOR DATA GENERATION
// ============================================================================
// 
// This rubric enforces realistic disease modeling based on COVID-19/Hantavirus:
//
// 1. DISEASE PROGRESSION (SEIR Model):
//    - S (Susceptible): Risk 0.0-0.15, high majority
//    - E (Exposed): Risk 0.15-0.45, shorter duration (1-3 days)
//    - I (Infected): Risk 0.45-1.0, longer contagious period (5-10 days)
//    - R (Recovered): Risk 0.0, immune (not modeled in short-term sim)
//
// 2. RISK CALCULATION FACTORS:
//    Risk = Base * Duration_Factor * Proximity_Factor * ACH_Factor * Vulnerability_Factor
//
//    Base: pathogen virulence (0.045 for Andes Hantavirus)
//    Duration_Factor: hours in shared space / incubation_period
//    Proximity_Factor: spatial clustering in enclosed spaces (0.5-1.0)
//    ACH_Factor: 1 / (air_changes_per_hour), min 0.1 (outdoor equiv)
//    Vulnerability_Factor: 0.3-1.5 based on age/occupation/health
//
// 3. OCCUPATION-BASED VULNERABILITY PROFILE:
//    Healthcare Workers: 0.8 (high exposure, training reduces infection)
//    Faculty/Researchers: 0.4 (offices, moderate exposure)
//    Students: 0.5 (shared facilities)
//    Custodial/Dining Staff: 1.0 (high-touch, high-traffic)
//    Security: 0.6 (variable exposure)
//
// 4. LOCATION-BASED CHARACTERISTICS:
//    Outdoor (Parks, Quads): ACH=60, safe baseline
//    Enclosed/Library: ACH=2.5, moderate risk
//    Semi-enclosed (Transit): ACH=15, moderate-low risk
//    Enclosed/Dense (Dining, Dorm): ACH=1-4, high risk
//
// 5. TEMPORAL DYNAMICS:
//    - Risk increases over 7-day window
//    - Secondary exposures branch from primary case
//    - Attack rate ~10-30% for close contacts
//    - Incubation mean 18 days (Hantavirus), but show early symptoms day 3-5
//
// ============================================================================

const seeded = (seed: number) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

// Location-based ACH (Air Changes per Hour) and vulnerability multiplier
const LOCATION_PROFILES = [
  { id: "loc_outdoor_quad", label: "Campus Quad", ach: 60, baseRisk: 0.02, type: "outdoor" },
  { id: "loc_library", label: "McKeldin Library", ach: 2.5, baseRisk: 0.35, type: "enclosed" },
  { id: "loc_classroom_01", label: "Main Lecture Hall", ach: 1.5, baseRisk: 0.42, type: "enclosed_dense" },
  { id: "loc_dining_hall", label: "Student Union Dining", ach: 1.0, baseRisk: 0.65, type: "enclosed_dense" },
  { id: "loc_dorm_lounge", label: "East Wing Lounge", ach: 1.0, baseRisk: 0.58, type: "enclosed_dense" },
  { id: "loc_gym", label: "Eppley Recreation Center", ach: 8.0, baseRisk: 0.25, type: "large_enclosed" },
  { id: "loc_bus_stop", label: "Campus Transit Hub", ach: 15.0, baseRisk: 0.28, type: "semi_enclosed" },
];

// Occupation-based vulnerability and behavior
const OCCUPATION_PROFILES: Record<string, { vuln: number; locations: string[]; hoursPerDay: number; label: string }> = {
  professor: { vuln: 0.4, locations: ["loc_library", "loc_classroom_01"], hoursPerDay: 6, label: "Professor" },
  researcher: { vuln: 0.45, locations: ["loc_library", "loc_classroom_01"], hoursPerDay: 8, label: "Researcher" },
  student: { vuln: 0.5, locations: ["loc_classroom_01", "loc_library", "loc_dining_hall", "loc_dorm_lounge", "loc_outdoor_quad"], hoursPerDay: 6, label: "Undergraduate Student" },
  dining_staff: { vuln: 1.0, locations: ["loc_dining_hall", "loc_bus_stop"], hoursPerDay: 8, label: "Cafeteria Staff" },
  custodial: { vuln: 0.95, locations: ["loc_dorm_lounge", "loc_classroom_01", "loc_library", "loc_bus_stop"], hoursPerDay: 8, label: "Custodial Staff" },
  security: { vuln: 0.6, locations: ["loc_bus_stop", "loc_outdoor_quad", "loc_dining_hall"], hoursPerDay: 8, label: "Campus Security" },
  nurse: { vuln: 0.8, locations: ["loc_library"], hoursPerDay: 8, label: "Health Services Nurse" },
};

/**
 * Calculate risk based on epidemiological factors
 * Formula: Base × Duration × Proximity × ACH_inverse × Vulnerability × Time_progression
 */
function calculateRiskScore(
  daysSinceExposure: number,
  hoursInSharedSpace: number,
  locationACH: number,
  vulnerabilityScore: number,
  isSecondaryContact: boolean,
  dayNumber: number
): number {
  const BASE_VIRULENCE = 0.045; // Andes Hantavirus baseline
  const INCUBATION_MEAN = 18; // Days
  
  // Duration factor: more time = higher risk (logarithmic)
  const durationFactor = Math.log(1 + hoursInSharedSpace / 24) / Math.log(2); // 0-1+ range
  
  // ACH factor: inverse relationship (lower ACH = higher risk)
  const achFactor = 1 / (locationACH + 0.1); // 0.1-1.0 range
  
  // Temporal progression: risk increases as virus spreads
  const progressionFactor = 0.5 + (dayNumber / 7) * 0.5; // 0.5-1.0 over 7 days
  
  // Exposure timeline: risk peaks 3-5 days after initial exposure
  let exposureTimeline = 0;
  if (daysSinceExposure >= 0 && daysSinceExposure < 1) exposureTimeline = 0.3; // Day of exposure
  else if (daysSinceExposure >= 1 && daysSinceExposure < 3) exposureTimeline = 0.7; // Early infection window
  else if (daysSinceExposure >= 3 && daysSinceExposure < 5) exposureTimeline = 1.0; // Peak contagiousness
  else if (daysSinceExposure >= 5 && daysSinceExposure < 10) exposureTimeline = 0.8; // Waning
  else if (daysSinceExposure >= 10) exposureTimeline = 0.3; // Recovery phase
  
  // Secondary contacts have reduced attack rate
  const contactMultiplier = isSecondaryContact ? 0.3 : 1.0;
  
  let risk = BASE_VIRULENCE * durationFactor * achFactor * vulnerabilityScore * progressionFactor * exposureTimeline * contactMultiplier;
  risk = Math.min(1.0, Math.max(0, risk)); // Clamp to [0, 1]
  
  return risk;
}

function buildAgentsWithEpiModel(): AgentNode[] {
  const rand = seeded(42);
  const agents: AgentNode[] = [];
  
  // PATIENT ZERO: index case
  const p0Risk = 1.0;
  agents.push({
    id: "ID-001",
    isPatientZero: true,
    meanRisk: p0Risk,
    confidenceInterval: { lower: 0.95, upper: 1.0 },
    status: "infected",
    visitedLocations: ["Campus Transit Hub", "Main Lecture Hall", "Student Union Dining", "Eppley Recreation Center"],
    primaryLocation: "Campus Transit Hub",
  });
  
  // PRIMARY CONTACTS (high exposure to P0): ~8-12 agents
  const primaryContactCount = 8 + Math.floor(rand() * 5);
  for (let i = 0; i < primaryContactCount; i++) {
    const exposure = 3 + rand() * 8; // 3-11 hours exposure
    const daysSinceExposure = i * 0.5; // Staggered exposures
    const occupations = Object.keys(OCCUPATION_PROFILES);
    const occ = occupations[Math.floor(rand() * occupations.length)];
    const profile = OCCUPATION_PROFILES[occ];
    
    const risk = calculateRiskScore(daysSinceExposure, exposure, 15, profile.vuln, false, 1);
    const spread = Math.min(0.25, risk * 0.3);
    
    agents.push({
      id: `ID-${String(i + 2).padStart(3, "0")}`,
      isPatientZero: false,
      meanRisk: risk,
      confidenceInterval: { lower: Math.max(0, risk - spread), upper: Math.min(1, risk + spread) },
      status: risk > 0.5 ? "infected" : "exposed",
      visitedLocations: [...profile.locations, "Campus Transit Hub"].slice(0, 4),
      primaryLocation: profile.locations[0],
    });
  }
  
  // SECONDARY CONTACTS: broader exposure from primary cases (~60-80 agents)
  const secondaryContactCount = 60 + Math.floor(rand() * 20);
  for (let i = 0; i < secondaryContactCount; i++) {
    const exposure = 1 + rand() * 4; // 1-5 hours (less exposure)
    const daysSinceExposure = 1 + rand() * 3; // Delayed exposure
    const occupations = Object.keys(OCCUPATION_PROFILES);
    const occ = occupations[Math.floor(rand() * occupations.length)];
    const profile = OCCUPATION_PROFILES[occ];
    
    // Higher ACH location (secondary contacts less likely in high-risk areas)
    const achForSecondary = 4 + rand() * 8;
    const risk = calculateRiskScore(daysSinceExposure, exposure, achForSecondary, profile.vuln, true, 2);
    const spread = Math.min(0.2, risk * 0.3);
    
    const status: AgentStatus = risk > 0.6 ? "infected" : risk > 0.3 ? "exposed" : "susceptible";
    
    agents.push({
      id: `ID-${String(i + primaryContactCount + 2).padStart(3, "0")}`,
      isPatientZero: false,
      meanRisk: risk,
      confidenceInterval: { lower: Math.max(0, risk - spread), upper: Math.min(1, risk + spread) },
      status,
      visitedLocations: profile.locations,
      primaryLocation: profile.locations[Math.floor(rand() * profile.locations.length)],
    });
  }
  
  // GENERAL POPULATION: majority susceptible (~740+ agents)
  const generalPopCount = 800 - agents.length;
  for (let i = 0; i < generalPopCount; i++) {
    const occupations = Object.keys(OCCUPATION_PROFILES);
    const occ = occupations[Math.floor(rand() * occupations.length)];
    const profile = OCCUPATION_PROFILES[occ];
    
    // Minimal exposure baseline
    const risk = rand() * 0.15; // 0-15% baseline risk
    const spread = 0.05 + rand() * 0.08;
    
    agents.push({
      id: `ID-${String(i + primaryContactCount + secondaryContactCount + 2).padStart(3, "0")}`,
      isPatientZero: false,
      meanRisk: risk,
      confidenceInterval: { lower: Math.max(0, risk - spread), upper: Math.min(1, risk + spread) },
      status: "susceptible",
      visitedLocations: profile.locations,
      primaryLocation: profile.locations[Math.floor(rand() * profile.locations.length)],
    });
  }
  
  return agents;
}

const PORT = { id: "port-cruise", label: "Campus Transit Hub", x: 0.12, y: 0.72 };
const DESTINATIONS = LOCATION_PROFILES.slice(1).map((loc) => ({
  id: loc.id,
  label: loc.label,
  x: 0.25 + Math.random() * 0.5,
  y: 0.25 + Math.random() * 0.5,
}));

function buildArcs(): SpatialArc[] {
  const rand = seeded(7);
  const arcs: SpatialArc[] = [];
  
  // More realistic arc generation: movements from primary case spreading over time
  // Day 1-2: P0 at origin
  // Day 3-4: P0 + primary contacts moving
  // Day 5-7: Secondary spread
  
  for (let tick = 1; tick <= 7; tick++) {
    // Number of active vectors increases as spread happens
    const baseCount = 1 + Math.min(4, Math.floor(tick / 1.5));
    const count = baseCount + (rand() > 0.5 ? 1 : 0);
    
    for (let i = 0; i < count; i++) {
      const dest = DESTINATIONS[i % DESTINATIONS.length];
      
      // Risk density increases with time (more secondary transmissions)
      const baseDensity = Math.min(1, (tick - 1) / 6 * 0.4 + 0.1); // 0.1 → 0.5
      const jitter = rand() * 0.3;
      const riskDensity = Math.min(1, baseDensity + jitter);
      
      arcs.push({
        id: `arc-${tick}-${i}`,
        from: PORT,
        to: dest,
        riskDensity,
        tick,
      });
    }
  }
  
  return arcs;
}

function buildSpatialPoints(agents: AgentNode[], startDay: number, endDay: number): SpatialPoint[] {
  // Generate detailed spatial point data for all agents over time
  const points: SpatialPoint[] = [];
  const pointRand = seeded(999);
  
  // For each time period (6-hour intervals = 4 per day)
  for (let tick = startDay; tick <= endDay; tick += 0.25) {
    for (const agent of agents) {
      if (!agent.visitedLocations || agent.visitedLocations.length === 0) continue;
      
      // Determine which location agent is at during this time period
      const locIndex = Math.floor(((tick - startDay) * agent.visitedLocations.length) / (endDay - startDay + 1)) % agent.visitedLocations.length;
      const locationName = agent.visitedLocations[locIndex];
      
      // Find matching location from profiles
      let location = LOCATION_PROFILES.find(loc => 
        loc.label.includes(locationName.split(" ")[0]) || 
        locationName.includes(loc.label.split(" ")[0])
      );
      
      if (!location) {
        // Fallback to mapped location
        const destIndex = Math.abs(agent.id.charCodeAt(3) - 48) % DESTINATIONS.length;
        const dest = DESTINATIONS[destIndex];
        location = LOCATION_PROFILES.find(l => l.id === dest.id) || LOCATION_PROFILES[0];
      }
      
      // Add spatial jitter (agent moves within location area)
      const jitterX = (pointRand() - 0.5) * 0.08;
      const jitterY = (pointRand() - 0.5) * 0.08;
      
      const x = Math.max(0.05, Math.min(0.95, (DESTINATIONS.find(d => d.id === location.id)?.x || 0.5) + jitterX));
      const y = Math.max(0.05, Math.min(0.95, (DESTINATIONS.find(d => d.id === location.id)?.y || 0.5) + jitterY));
      
      // Adjust risk for this time period (temporal progression)
      const dayNumber = Math.floor(tick);
      const riskAtTime = Math.min(1, agent.meanRisk * (0.5 + (dayNumber / 7) * 0.5)); // Risk increases over week
      
      const point: SpatialPoint = {
        id: `point-${agent.id}-${tick.toFixed(2)}`,
        locationId: location.id,
        label: location.label,
        x,
        y,
        risk: riskAtTime,
        status: agent.status,
        tick: tick,
      };
      
      points.push(point);
    }
  }
  
  return points;
}

const riskDistribution: RiskBucket[] = [
  { bracket: "0-10%", agents: 620, baseline: 380, predictive: 620 },   // Majority susceptible
  { bracket: "10-20%", agents: 95, baseline: 120, predictive: 95 },    // Secondary contacts
  { bracket: "20-30%", agents: 42, baseline: 150, predictive: 42 },    // Secondary exposed
  { bracket: "30-40%", agents: 18, baseline: 85, predictive: 18 },     // Early secondary infections
  { bracket: "40-50%", agents: 12, baseline: 42, predictive: 12 },     // Primary contacts
  { bracket: "50-60%", agents: 5, baseline: 18, predictive: 5 },
  { bracket: "60-70%", agents: 4, baseline: 12, predictive: 4 },
  { bracket: "70-80%", agents: 2, baseline: 8, predictive: 2 },        // Highly exposed primary contacts
  { bracket: "80-90%", agents: 1, baseline: 4, predictive: 1 },
  { bracket: "90-100%", agents: 1, baseline: 2, predictive: 1 },       // Patient zero
];

const recommendations: VoIRecommendation[] = [
  { id: "ID-001", riskScore: 1.0, entropyReduction: 35.2 },  // Patient zero
  { id: "ID-002", riskScore: 0.78, entropyReduction: 22.1 }, // Primary contact
  { id: "ID-003", riskScore: 0.72, entropyReduction: 19.8 },
  { id: "ID-004", riskScore: 0.68, entropyReduction: 17.5 },
  { id: "ID-005", riskScore: 0.64, entropyReduction: 15.3 },
];

const environmentalAlerts: EnvironmentalAlert[] = [
  { 
    locationId: "loc_dining_hall", 
    locationName: "Student Union Dining", 
    viralLoad: 0.87, 
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  { 
    locationId: "loc_classroom_01", 
    locationName: "Main Lecture Hall", 
    viralLoad: 0.62, 
    timestamp: new Date(Date.now() - 5400000).toISOString() // 1.5 hours ago
  },
  { 
    locationId: "loc_library", 
    locationName: "McKeldin Library", 
    viralLoad: 0.34, 
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
];

const agentsList = buildAgentsWithEpiModel();
const arcsList = buildArcs();

export const mockSimulation: SimulationData = {
  kpis: {
    totalAgents: 800,
    activeCases: agentsList.filter(a => a.status === "infected").length,
    highRiskExposures: agentsList.filter(a => a.meanRisk > 0.5).length,
    networkEntropy: 38.5,
  },
  agents: agentsList,
  links: [],
  recommendations,
  environmentalAlerts,
  riskDistribution,
  spatialArcs: arcsList,
  spatialPoints: buildSpatialPoints(agentsList, 1, 7),
  timeRange: { startDay: 1, endDay: 7 },
};

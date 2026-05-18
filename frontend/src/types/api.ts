// API contract mirroring the FastAPI backend. Mock data and UI components
// must conform to these interfaces. Swap the implementation in
// `src/hooks/useSimulation.ts` to switch from mock data to live fetch.

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export type AgentStatus = "infected" | "exposed" | "susceptible";

export interface AgentNode {
  id: string;
  isPatientZero: boolean;
  meanRisk: number; // 0–1
  confidenceInterval: ConfidenceInterval; // 95% CI on meanRisk
  status: AgentStatus;
  visitedLocations?: string[]; // location ids the agent has been seen at
  primaryLocation?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  weight: number;
}

export interface GeoPoint {
  id: string;
  label: string;
  /** normalized 0..1 viewport coordinates for the mock 3D canvas */
  x: number;
  y: number;
}

export interface SpatialArc {
  id: string;
  from: GeoPoint;
  to: GeoPoint;
  /** 0..1 exposure density — drives the cyan→crimson color spectrum */
  riskDensity: number;
  /** day index this movement event occurred on */
  tick: number;
}

export interface SpatialPoint {
  id: string;
  locationId: string;
  label: string;
  /** normalized 0..1 viewport coordinates */
  x: number;
  y: number;
  /** agent risk at this location during this time period */
  risk: number;
  /** agent status at this location (infected/exposed/susceptible) */
  status: AgentStatus;
  /** time tick when agent was at this location */
  tick: number;
}

export interface VoIRecommendation {
  id: string; // agent id recommended for PCR test
  riskScore: number; // 0–1
  entropyReduction: number; // percentage points of network entropy reduced
}

export interface EnvironmentalAlert {
  locationId: string;
  locationName: string;
  viralLoad: number; // normalized ghost-virus concentration 0–1
  timestamp: string; // ISO 8601
}

export interface SimulationKpis {
  totalAgents: number;
  activeCases: number;
  highRiskExposures: number;
  networkEntropy: number; // bits
}

export interface RiskBucket {
  bracket: string; // e.g. "0-10%"
  agents: number;
}

export interface SimulationData {
  kpis: SimulationKpis;
  agents: AgentNode[];
  links: NetworkLink[];
  recommendations: VoIRecommendation[];
  environmentalAlerts: EnvironmentalAlert[];
  riskDistribution: RiskBucket[];
  spatialArcs: SpatialArc[];
  spatialPoints?: SpatialPoint[];
  timeRange: { startDay: number; endDay: number };
}

export type PathogenId = "andes-hantavirus" | "covid-19";

export interface SimulationConfig {
  pathogen: PathogenId;
  airChangesPerHour: number; // 0.5–12.0
  mitigationCompliance: number; // 0–100
}

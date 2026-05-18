from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ConfidenceInterval(BaseModel):
    lower: float
    upper: float

class AgentNode(BaseModel):
    id: str
    name: Optional[str] = None
    occupation: Optional[str] = None
    isPatientZero: bool
    meanRisk: float
    confidenceInterval: ConfidenceInterval
    status: str # "infected" | "exposed" | "susceptible" | "protected"
    statusReasoning: Optional[str] = None
    protectionLevel: float = 0.0 # 0.0 to 1.0
    visitedLocations: List[str]
    primaryLocation: Optional[str] = None

class NetworkLink(BaseModel):
    source: str
    target: str
    weight: float

class VoIRecommendation(BaseModel):
    id: str
    riskScore: float
    entropyReduction: float

class EnvironmentalAlert(BaseModel):
    locationId: str
    locationName: str
    viralLoad: float
    timestamp: str

class SimulationKpis(BaseModel):
    totalAgents: int
    activeCases: int
    highRiskExposures: int
    networkEntropy: float

class RiskBucket(BaseModel):
    bracket: str
    agents: int
    baseline: Optional[int] = None  # Heuristic-based (6ft/15min rule) distribution
    predictive: Optional[int] = None  # Monte Carlo simulation results

class GeoPoint(BaseModel):
    id: str
    label: str
    x: float
    y: float

class SpatialArc(BaseModel):
    id: str
    from_node: GeoPoint = Field(alias="from")
    to: GeoPoint
    riskDensity: float
    tick: float

    class Config:
        populate_by_name = True

class SimulationData(BaseModel):
    kpis: SimulationKpis
    agents: List[AgentNode]
    links: List[NetworkLink]
    recommendations: List[VoIRecommendation]
    environmentalAlerts: List[EnvironmentalAlert]
    riskDistribution: List[RiskBucket]
    spatialArcs: List[SpatialArc]
    timeRange: Dict[str, int]

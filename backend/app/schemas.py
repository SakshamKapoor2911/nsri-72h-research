from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ConfidenceInterval(BaseModel):
    lower: float
    upper: float

class AgentNode(BaseModel):
    id: str
    isPatientZero: bool
    meanRisk: float
    confidenceInterval: ConfidenceInterval
    status: str # "infected" | "exposed" | "susceptible"
    visitedLocations: List[str]

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
    tick: int

    class Config:
        populate_by_name = True

class SimulationData(BaseModel):
    kpis: SimulationKpis
    agents: List[AgentNode]
    recommendations: List[VoIRecommendation]
    environmentalAlerts: List[EnvironmentalAlert]
    riskDistribution: List[RiskBucket]
    spatialArcs: List[SpatialArc]
    timeRange: Dict[str, int]

# Backend Implementation Plan: EpiNexus (FastAPI & Spatial Optimization)

The backend provides high-performance asynchronous endpoints for exposure modeling, leveraging spatial indexing and physics-informed viral decay.

## 1. Algorithmic Refinements

### A. Spatial Indexing ($O(N \log N)$ Optimization)
To prevent the $O(N^2 \times T)$ bottleneck, the engine uses `scipy.spatial.cKDTree` for each time slice $\Delta t$. Pairwise distances are only computed for agents within a search radius of ~20 meters, with vectorized dosage calculations ensuring high-performance execution.

### B. "Ghost Virus" Environmental Decay
Pathogens linger after an infectious individual leaves. We track the viral load $V_{loc}(t)$ for each location using a differential integration loop:
$$V_{loc}(t) = \left( V_{loc}(t-1) \times e^{-\lambda \Delta t} \right) + \sum_{i \in \text{Infectious}} \text{SheddingRate}(i)$$
- $\lambda$ integrates both physical decay and ACH-based ventilation.
- Susceptible individuals accumulate risk via both direct spatial proximity and environmental exposure.

### C. Active Learning (VoI) & Clinical Triage
- **Value of Information (VoI):** Nodes are ranked by their ability to collapse system-wide Shannon Entropy. Priority is given to individuals with high personal uncertainty who bridge multiple clusters.
- **Hospitalization Risk:** Individual risk scores are weighted by `vulnerability_score` (socio-demographics/comorbidities) to provide an operational triage sheet.

## 2. API Architecture (FastAPI)

### Endpoints
- `POST /simulation/run`: Triggers the full vectorized exposure kernel.
- `GET /simulation/results`: Returns the mean risk scores and 95% CIs.
- `POST /intervention/optimize`: Runs the Active Learning / VoI algorithm to return testing recommendations.
- `GET /spatial/heatmap`: Returns the $V_{loc}(t)$ data for geospatial rendering.

### Class: `SpatialExposureEngine`
- Uses `cKDTree` for neighbor discovery.
- Implements the "Ghost Virus" integration loop.
- Vectorized Monte Carlo ensemble via NumPy.

## 3. Implementation Milestones
- **H+6:** FastAPI project setup and Pydantic schema validation.
- **H+12:** `cKDTree` integration and vectorized dosage calculation.
- **H+24:** Environmental decay (Ghost Virus) logic and DAG verification.
- **H+48:** Monte Carlo ensemble (100+ iterations) and VoI optimizer.
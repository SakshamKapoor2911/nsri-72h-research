# Product Requirements Document (PRD): EpiNexus

## 1. Executive Summary
EpiNexus is a decision-support system for public health officials during localized outbreaks. It transforms raw mobility data into a prioritized operational roadmap for testing, isolation, and environmental remediation by modeling viral load and network entropy.

## 2. Goals & Objectives
- **Scientific Rigor:** Model viral persistence ("Ghost Virus") and DAG-based transmission causality.
- **Computational Efficiency:** Handle $N=1000+$ agents with $O(N \log N)$ spatial indexing.
- **UI Responsiveness:** Use WebGL-accelerated visualization to maintain 60fps during temporal scrubbing.
- **Active Resource Allocation:** Minimize "Value of Information" (VoI) entropy to reduce diagnostic testing waste.

## 3. Functional Requirements
- **F1: Ghost Virus Kernel:** Track environmental viral decay $V_{loc}(t)$ as a function of ACH and pathogen half-life.
- **F2: Spatial Querying:** Implement `cKDTree` for neighbor discovery to prevent $O(N^2)$ bottlenecks.
- **F3: Monte Carlo Ensemble:** Generate risk distributions and 95% CIs via stochastic parameter sampling.
- **F4: VoI Optimizer:** Identify nodes that maximize system-wide entropy reduction when tested.
- **F5: Decoupled Dashboard:**
    - **Topology View:** `react-force-graph` with interactive "Risk Halos."
    - **Temporal Map:** `deck.gl` with $V_{loc}(t)$ heatmap layer.
- **F6: Asynchronous Execution:** FastAPI background tasks for heavy Monte Carlo compute.

## 4. User Stories (Updated)
- **As an Incident Commander**, I want to see which rooms are still hazardous even after an infected person has left ("Ghost Virus"), so I can deploy cleaning crews.
- **As a Researcher**, I want the visualization to handle thousands of historical data points smoothly so I can scrub through a week-long outbreak in seconds.
- **As a Health Officer**, I want a list of individuals to test that is optimized for "Information Gain," not just high risk, to clear the network faster.

## 5. Performance Requirements
- **Latent Exposure Calculation:** < 2s for 1000 agents over a 7-day timeline.
- **Monte Carlo Ensemble (M=100):** < 10s total compute time.
- **Visualization:** Stable 60fps for map and graph interactions.

## 6. Success Metrics
- **Mathematical Accuracy:** High correlation between predicted transmission and ground-truth simulated outbreaks.
- **Information Gain:** Measurable reduction in global network entropy per test recommendation.
- **Visual Clarity:** Ability for a non-expert judge to identify "Patient Zero" and the primary transmission cluster within 15 seconds of viewing the dashboard.

## 7. Future Scope
- Real-time GPS stream integration.
- Automated wastewater surveillance data fusion.
- Integration with clinical EHR systems.

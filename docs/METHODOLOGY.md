# Scientific Methodology: EpiNexus Spatio-Temporal Modeling

## 1. Synthetic Trajectory Generation
To simulate realistic human mobility within a localized environment (e.g., a university campus), EpiNexus utilizes a **Stochastic Routine-Based Mobility Model**.

### 1.1 Agent Classification
Agents are assigned distinct personas that govern their transition probabilities between locations:
- **Studious**: High probability of extended dwell times in `loc_library` and `loc_classroom`.
- **Athlete**: Frequent transitions to `loc_gym` with high mitigation compliance variance.
- **Social**: High degree of multi-node hopping (e.g., `loc_dining_hall` to `loc_outdoor_quad`).
- **Commuter**: Structured morning and evening spikes at `loc_bus_stop`.

### 1.2 Temporal Resolution
Data is generated at **15-minute intervals** over a **7-day period**. This resolution captures both direct contact events and indirect environmental exposure windows.

---

## 2. Transmission Modeling (Ghost Virus Engine)
Transmission is modeled using a physics-informed exposure kernel that accounts for both spatial proximity and environmental persistence.

### 2.1 Direct Spatial Exposure
Calculated using a **Gaussian spatial decay function**. The probability of transmission between an infected agent $i$ and susceptible agent $j$ at time $t$ is:
$$P_{ij}(t) \propto \frac{\alpha \cdot \Delta t}{dist(i,j)^2 + \epsilon}$$
Where:
- $\alpha$: Pathogen-specific infectivity constant.
- $dist(i,j)$: Euclidean distance using `cKDTree` for $O(N \log N)$ indexing.

### 2.2 Indirect (Environmental) Exposure
Known as the **"Ghost Virus"** effect, this models viral load persistence in shared spaces.
- **Shedding**: Infected agents contribute to a location's viral load $V_{loc}$.
- **Decay**: $V_{loc}$ decays exponentially based on Air Changes per Hour (ACH):
$$\lambda_{decay} = \frac{ACH}{3600} + \frac{\ln(2)}{t_{1/2}}$$
- **Exposure**: Susceptible agents in the room accumulate dosage $D \propto V_{loc} \cdot \Delta t$.

---

## 3. Uncertainty Quantification
EpiNexus employs a **Monte Carlo Ensemble** to propagate parameter uncertainty (e.g., noise in ACH, $\alpha$, and GPS accuracy).
- **Ensemble Size**: Dynamic (converges when mean risk standard error < 0.005).
- **Confidence Intervals**: 95% CI is calculated per agent to visualize "Uncertainty Halos" in the dashboard.

---

## 4. Resource Optimization (Active Learning)
Testing priority is determined by the **Value of Information (VoI)**:
$$VoI_i = H(p_i) \cdot R_{hosp,i}$$
Where $H(p_i)$ is the Shannon Entropy of the transmission probability and $R_{hosp,i}$ is the agent's specific vulnerability score. Testing nodes with the highest VoI maximizes the collapse of global system uncertainty.

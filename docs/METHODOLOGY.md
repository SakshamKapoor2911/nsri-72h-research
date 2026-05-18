# Scientific Methodology: EpiNexus Spatio-Temporal Modeling

## 1. Synthetic Trajectory Generation
To simulate realistic human mobility within a localized environment (e.g., a university campus), EpiNexus utilizes a **Persona-Driven Stochastic Mobility Model**.

### 1.1 Agent Classification & Personas
EpiNexus leverages **Generative AI (Groq Llama-3.1)** to synthesize high-fidelity agent personas. Unlike generic mobility models, each agent possesses:
- **Identity**: Full names and realistic occupations (e.g., Graduate Researchers, Janitors, Faculty).
- **Contextual Routines**: Transition probabilities are derived from persona-specific goals (e.g., Staff congregate in high-volume utility nodes, while Professors dwell in low-occupancy office/library nodes).
- **Health Profiles**: Individualized vulnerability scores that model underlying physiological risk factors.

### 1.2 Temporal Resolution
Data is generated at **15-minute intervals** over a **7-day period**. This resolution captures both direct contact events and indirect environmental exposure windows.

---

## 2. Transmission Modeling (Ghost Virus Engine)
Transmission is modeled using a physics-informed exposure kernel that accounts for both spatial proximity and environmental persistence.

### 2.1 Direct Spatial Exposure
Calculated using a **steep power-law spatial decay function**. The probability of transmission between an infected agent $i$ and susceptible agent $j$ at time $t$ is:
$$P_{ij}(t) = 1 - \exp(-\sum \frac{\alpha \cdot \Delta t}{(dist(i,j)^2 \cdot 10^6 + 1)})$$
This aggressive decay ensures that only sustained close-range proximity (within 2-5 meters) contributes significantly to cumulative dosage.

### 2.2 Indirect (Environmental) Exposure
Known as the **"Ghost Virus"** effect, this models viral load persistence in shared spaces.
- **Shedding**: Infected agents contribute to a location's viral load $V_{loc}$.
- **Decay**: $V_{loc}$ decays exponentially based on Air Changes per Hour (ACH):
$$\lambda_{decay} = \frac{ACH}{3600} + \frac{\ln(2)}{t_{1/2}}$$
- **Exposure**: Susceptible agents in the room accumulate dosage $D \propto V_{loc} \cdot \Delta t \cdot \frac{1}{ACH+0.1}$.

---

## 3. Algorithmic Status Determination
Beyond simple probability thresholds, EpiNexus categorizes agents into four distinct clinical states:
1. **Infected**: The primary source (Patient Zero) or confirmed positive cases.
2. **Exposed**: High cumulative dosage exceeding the infection threshold.
3. **Protected**: Individuals with significant exposure but low physiological vulnerability (high resilience).
4. **Susceptible**: Low-exposure individuals within the general population.

---

## 4. Uncertainty Quantification
EpiNexus employs a **Monte Carlo Ensemble** to propagate parameter uncertainty (e.g., noise in ACH, $\alpha$, and GPS accuracy).
- **Ensemble Size**: Dynamic (converges when mean risk standard error < 0.005).
- **Confidence Intervals**: 95% CI is calculated per agent to visualize "Uncertainty Halos" in the dashboard.

---

## 5. Resource Optimization (Active Learning)
Testing priority is determined by the **Value of Information (VoI)**:
$$VoI_i = H(p_i) \cdot R_{hosp,i}$$
Where $H(p_i)$ is the Shannon Entropy of the transmission probability and $R_{hosp,i}$ is the agent's specific vulnerability score. Testing nodes with the highest VoI maximizes the collapse of global system uncertainty.

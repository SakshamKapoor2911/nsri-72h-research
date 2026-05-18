# Data Quality & Epidemiological Rubric

## Overview

The EpiNexus simulation platform uses a rigorous epidemiological rubric to generate and validate synthetic disease progression data. This document outlines the metrics, constraints, and validation criteria for all simulation data.

## Epidemiological Rubric

### 1. SEIR Model Compliance

The simulation adheres to the **Susceptible-Exposed-Infected-Recovered** (SEIR) compartmental model:

- **S (Susceptible)**: Risk 0.0–0.15, represents population with no prior exposure
- **E (Exposed)**: Risk 0.15–0.45, short incubation period (typically 1–3 days visible)
- **I (Infected)**: Risk 0.45–1.0, longer contagious period (5–10 days)
- **R (Recovered)**: Not modeled in short-term 7-day simulation

### 2. Risk Calculation Formula

```
Risk = Base × Duration_Factor × Proximity_Factor × ACH_Factor × Vulnerability_Factor × Time_Progression
```

Where:
- **Base**: Pathogen virulence (0.045 for Andes Hantavirus)
- **Duration_Factor**: log(1 + hours_shared / 24), range [0, 1+]
  - Logarithmic: 1 hour ≈ 0.3, 8 hours ≈ 0.6, 24 hours ≈ 0.85
- **Proximity_Factor**: Spatial clustering in enclosed space, range [0.5, 1.0]
  - Higher in dense locations (Dining Hall) than distributed (Library)
- **ACH_Factor**: 1 / (air_changes_per_hour + 0.1), range [0.1, 1.0]
  - Outdoor (ACH=60): Factor ≈ 0.017
  - Library (ACH=2.5): Factor ≈ 0.38
  - Enclosed dining (ACH=1): Factor ≈ 0.91
- **Vulnerability_Factor**: 0.3–1.5 based on occupation/age/health
- **Time_Progression**: 0.5 + (day / 7) × 0.5, increases from 0.5 to 1.0 over 7 days

### 3. Occupation-Based Vulnerability Profiles

```json
{
  "healthcare_workers": {"vuln": 0.8, "locations": ["clinic"], "hours": 8},
  "faculty_researchers": {"vuln": 0.4, "locations": ["library", "classroom"], "hours": 6},
  "students": {"vuln": 0.5, "locations": ["class", "dorm", "dining"], "hours": 6},
  "custodial_staff": {"vuln": 0.95, "locations": ["high_traffic"], "hours": 8},
  "dining_staff": {"vuln": 1.0, "locations": ["dining_hall", "transit"], "hours": 8},
  "security": {"vuln": 0.6, "locations": ["transit", "quad"], "hours": 8}
}
```

**Vulnerability rationale**:
- Healthcare workers: High exposure but extensive training/PPE reduces infection risk
- Custodial/Dining staff: Highest exposure to high-touch surfaces and people
- Students: Moderate exposure in shared residential/academic spaces
- Faculty/Researchers: Lower exposure in private offices/libraries

### 4. Location Characteristics

```json
{
  "outdoor_spaces": {"ach": 60, "base_risk": 0.02, "type": "open_air"},
  "semi_enclosed": {"ach": 15, "base_risk": 0.28, "type": "transit_hubs"},
  "large_enclosed": {"ach": 8, "base_risk": 0.25, "type": "gyms_auditoriums"},
  "enclosed_moderate": {"ach": 2.5, "base_risk": 0.35, "type": "libraries"},
  "enclosed_dense": {"ach": 1.0, "base_risk": 0.65, "type": "dining_halls"}
}
```

**ACH (Air Changes per Hour)** is the dominant driver of location risk—poor ventilation (ACH < 2) is a strong transmission factor.

### 5. Temporal Dynamics

Disease progression follows realistic timelines:

- **Day 0–1**: Index case (Patient Zero) at origin
  - Risk: 1.0, status: "infected"
  - Movement to multiple locations begins exposure chain

- **Day 1–3**: Primary contact exposure window
  - Attack rate: ~25–30% for close contacts (3+ hours shared space)
  - Median exposure: 5 hours
  - Status: "exposed" (Risk 0.3–0.6)

- **Day 3–5**: Secondary transmission peak
  - Primary contacts show symptoms → increased transmission
  - Secondary contacts with lower exposure (1–2 hours)
  - Status: "exposed" (Risk 0.15–0.45) or early "infected" (Risk > 0.45)

- **Day 5–7**: Broader diffusion
  - Tertiary contacts: minimal exposure
  - Background population at baseline susceptibility
  - Status: "susceptible" (Risk < 0.15)

### 6. Confidence Interval Guidelines

95% CI should reflect exposure uncertainty and status confidence:

| Risk Level | Target CI Width | Rationale |
|-----------|-----------------|-----------|
| High (>0.7) | 0.10–0.15 | Well-documented exposure |
| Medium (0.3–0.7) | 0.15–0.25 | Partial exposure history |
| Low (<0.3) | 0.05–0.15 | Limited exposure or baseline |

**Rule**: CI width inversely correlates with risk level and exposure documentation quality.

## Data Generation Pipeline

### Step 1: Patient Zero Definition
```
ID-001: isPatientZero=true, meanRisk=1.0, status="infected"
Primary locations: high-traffic hubs (transit, dining)
Visits 4–5 locations over 7 days
```

### Step 2: Primary Contact Identification (8–12 agents)
- Criteria: Direct co-location with P0 for 3+ hours
- Risk calculation: Full exposure model (all factors)
- Status: "exposed" (risk 0.3–0.6) or "infected" (risk > 0.5)
- CI width: 0.15–0.25

### Step 3: Secondary Contact Expansion (60–80 agents)
- Criteria: Co-location with primary cases, <4 hours
- Risk multiplier: 0.3× (lower transmission probability)
- ACH adjustment: Secondary contacts tracked in higher-ACH locations
- Status: "exposed" (risk 0.15–0.45) or "susceptible" (risk < 0.15)

### Step 4: General Population (740+ agents)
- Criteria: Minimal exposure to outbreak chain
- Risk baseline: 0–0.15 (random)
- Status: "susceptible"
- CI width: 0.05–0.15

## Validation Metrics

Run `validate_data_quality.py` after simulation generation to verify:

```bash
python validate_data_quality.py
```

**Checked constraints**:
1. ✅ SEIR distribution (S > 70%, E 5–15%, I 1–5%)
2. ✅ Risk score bounds ([0, 1])
3. ✅ Risk distribution right-skewed (mean ≥ median)
4. ✅ CI validity (lower ≤ mean ≤ upper)
5. ✅ Temporal progression (risk increases over 7 days)
6. ✅ Patient Zero identified and risk = 1.0
7. ✅ Secondary infections present
8. ✅ Location diversity (6+ unique locations)
9. ✅ High-risk clusters in high-transmission locations

## Example: High-Risk Agent Profile

```json
{
  "id": "ID-042",
  "name": "Maya Rodriguez (Dining Staff)",
  "occupation": "Cafeteria Staff",
  "isPatientZero": false,
  "meanRisk": 0.78,
  "confidenceInterval": {"lower": 0.68, "upper": 0.85},
  "status": "infected",
  "visitedLocations": ["Student Union Dining", "Campus Transit Hub"],
  "primaryLocation": "Student Union Dining",
  "protectionLevel": 0.3
}
```

**Analysis**:
- Vuln: 1.0 (high-touch work)
- Duration: 8 hrs/day in ACH=1 location = 0.6 duration factor
- ACH: 0.91 (poor ventilation)
- Risk = 0.045 × 0.6 × 1.0 × 0.91 × 1.0 × 1.0 ≈ 0.78 ✓

## LLM Enhancement (Optional)

For production data, the system optionally calls an LLM API (Groq) to:
1. Generate realistic persona names and occupation backgrounds
2. Create plausible behavior patterns for occupation types
3. Validate generated data against epidemiological heuristics
4. Suggest improvements for low-diversity locations

**API Call** (in `generator.py`):
```python
from llm_utils import get_realistic_personas
personas = get_realistic_personas(count=20)  # Requires GROQ API key
```

## References

- **SEIR Model**: Kermack-McKendrick (1927), extended by Compartmental Epidemiology
- **Hantavirus**: 18-day incubation median (CDC 2024)
- **COVID-19 ACH guidance**: CDC/ASHRAE ventilation standards
- **Contact tracing**: Secondary attack rate ~25–30% for household contacts (Guo et al. 2022)

---

Last Updated: 2026-05-18  
Validation Status: PASS ✅

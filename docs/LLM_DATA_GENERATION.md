# Enhanced Data Generation with Groq LLM

## Overview

EpiNexus now integrates **Groq LLM API** for realistic, LLM-generated synthetic data with automated validation. This produces higher-quality epidemiological simulations with diverse personas and validated health profiles.

## Features

### 1. **LLM-Generated Personas**
- 20+ unique, diverse individuals
- Realistic names, occupations, ages
- Health profiles and vulnerability scores
- Consistent behavioral patterns

### 2. **Location Behavior Patterns**
- Occupation-specific visitation patterns
- Realistic movement constraints
- Peak activity times
- High-risk exposure tracking

### 3. **Health Profile Generation**
- Pre-existing conditions
- Age demographics
- Activity levels
- Vaccination status
- Vulnerability multipliers

### 4. **Automated Data Validation**
- SEIR compliance checking
- Risk distribution analysis
- Confidence interval quality
- LLM-powered quality scoring

## Setup

### Prerequisites

1. **Groq API Key** (already configured in `.env`)
   ```bash
   LLM_API_KEY=your_groq_api_key_here
   ```

2. **Python Dependencies**   ```bash
   pip install groq requests python-dotenv
   ```

## Usage

### Quick Start: Generate Data with LLM

```bash
cd backend
python generator.py
```

This will:
1. ✅ Generate pathogen configuration
2. ✅ Create location contexts
3. ✅ Fetch **realistic personas** from Groq LLM
4. ✅ Generate **location behavior patterns**
5. ✅ Create 800 agent trajectories
6. ✅ **Validate data quality** with LLM
7. ✅ Cache simulation for web server

### Step-by-Step Output

```
================================================================================
EpiNexus Data Generation Pipeline
================================================================================

📋 Step 1: Generating pathogen configuration...
   ✅ Generated pathogen_config.json

📍 Step 2: Generating location contexts...
   ✅ Generated expanded locations_context.json

🤖 Step 3: Fetching LLM-enhanced data...
   - Getting realistic personas (20 agents)
   📡 Fetching LLM personas...
   ✅ Loaded 20 personas from Groq

   📡 Fetching LLM location behavior patterns...
   ✅ Generated behavior patterns for 6 occupations

📊 Step 4: Generating agent trajectories...
   📊 Generation Summary:
      ✅ 801 agents generated
      ✅ 7 locations tracked
      ✅ 336 time ticks (15-min intervals)

      Occupation Distribution:
         - Undergraduate Student: 482 agents
         - Cafeteria Staff: 115 agents
         - Researcher: 102 agents
         - Campus Security: 62 agents
         - Professor: 39 agents

      Vulnerability Statistics:
         - Mean: 0.48
         - Median: 0.47
         - Range: [0.10, 0.90]

   ✨ trajectories.json generated with LLM-enhanced personas!

✔️  Step 5: Validating data quality...
   Generated 801 agents
   📊 Data quality validation: 85/100

   ✅ Cached simulation data generated successfully!

================================================================================
✨ Data generation complete! Ready to serve.
================================================================================
```

## API Reference

### `llm_utils.py` - LLM Integration Functions

#### `get_realistic_personas(count=20) -> List[Dict]`
Generates diverse, realistic personas with names, occupations, routines, health profiles, and vulnerability scores.

**Returns**: List of dictionaries with:
- `name`: Full name
- `occupation`: Job title
- `routine`: Daily movement pattern
- `health_profile`: Health status description
- `vulnerability_score`: 0.1–0.9 (higher = more vulnerable)
- `age`: Age range

**Example**:
```python
from llm_utils import get_realistic_personas

personas = get_realistic_personas(count=20)
for p in personas:
    print(f"{p['name']} ({p['occupation']}): Risk {p['vulnerability_score']:.2f}")
```

#### `validate_data_quality(agents_data) -> Dict`
LLM-powered validation against epidemiological best practices.

**Returns**: Dictionary with:
- `quality_score`: 0–100 overall quality
- `issues`: List of identified problems
- `suggestions`: Improvement recommendations

**Example**:
```python
from llm_utils import validate_data_quality

report = validate_data_quality(agents)
print(f"Quality: {report['quality_score']}/100")
if report['issues']:
    print(f"Issues: {report['issues']}")
```

#### `enhance_location_behaviors(occupations) -> Dict[str, Dict]`
Generates realistic location visitation patterns by occupation.

**Returns**: Dictionary mapping occupations to:
- `primary_locations`: Top visited locations
- `hours_per_location`: Time spent
- `peak_hours`: Activity times
- `high_risk_exposure`: 0.0–1.0 enclosed space percentage

#### `generate_health_profiles(count=100) -> List[Dict]`
Creates diverse health profiles with conditions, vaccination status, and vulnerability.

**Returns**: List of dictionaries with:
- `age`: Integer age
- `conditions`: List of health conditions
- `activity_level`: "low", "moderate", "high"
- `vaccination_status`: "full", "partial", "none"
- `vulnerability_multiplier`: 0.5–2.0 for risk calculations

## Data Quality Metrics

The validation engine checks:

| Metric | Target | Check |
|--------|--------|-------|
| **SEIR Distribution** | S: 65–75%, E: 5–15%, I: 1–5% | Compartmental model compliance |
| **Risk Distribution** | Right-skewed (mean ≥ median) | Realistic disease spread |
| **CI Validity** | lower ≤ mean ≤ upper | Confidence interval correctness |
| **CI Width** | High-risk: 0.10–0.15 | Proportional to risk level |
| **Temporal Progression** | Risk ↑ over 7 days | Disease dynamics |
| **Location Diversity** | 6+ unique locations | Realistic movement patterns |
| **Occupation Distribution** | Varied occupations | Population diversity |
| **Vulnerability Alignment** | Vuln ∝ occupation risk | Epidemiologically sound |

## Example: Using LLM Data in Custom Analysis

```python
import json
from llm_utils import get_realistic_personas, validate_data_quality

# Step 1: Generate personas
personas = get_realistic_personas(count=50)

# Step 2: Create agents from personas
agents = []
for i, persona in enumerate(personas):
    agent = {
        "id": f"ID-{i+1:03d}",
        "name": persona['name'],
        "occupation": persona['occupation'],
        "meanRisk": persona['vulnerability_score'],
        "status": "susceptible" if persona['vulnerability_score'] < 0.3 else "exposed"
    }
    agents.append(agent)

# Step 3: Validate quality
report = validate_data_quality(agents)
print(f"Generation Quality: {report['quality_score']}/100")

# Step 4: Use in simulation
sim_data = {
    "agents": agents,
    "personas": personas,
    "validation": report
}

with open("custom_sim.json", "w") as f:
    json.dump(sim_data, f, indent=2)
```

## Troubleshooting

### Issue: "LLM_API_KEY not configured"
**Solution**: Check `.env` file has valid `LLM_API_KEY`
```bash
echo $env:LLM_API_KEY  # PowerShell
echo $LLM_API_KEY      # Bash
```

### Issue: Timeout calling Groq API
**Solution**: Check internet connection and Groq API status
- Groq Status: https://status.groq.com
- Fallback: Generator automatically uses fallback personas if API fails

### Issue: "Failed to parse Groq response"
**Solution**: This can happen with API rate limiting. The generator will retry with fallbacks.

### Issue: Validation fails with "quality_score: 0"
**Solution**: 
- Verify data format matches expected schema
- Check agents have required fields: `id`, `meanRisk`, `status`
- Sample validation on 10 random agents (reduce data size)

## Performance Notes

- **Persona generation**: ~5–10 seconds for 20 personas (1 API call)
- **Location patterns**: ~3–5 seconds (1 API call)
- **Trajectory generation**: ~10–15 seconds (800 agents, local computation)
- **Data validation**: ~5 seconds (samples 10 agents)

**Total time**: ~25–35 seconds for full pipeline with LLM calls

## Advanced: Custom Data Generation

Create a custom generator script:

```python
from llm_utils import get_realistic_personas, enhance_location_behaviors
import json

# Get personas
personas = get_realistic_personas(count=100)

# Get location patterns
occupations = [p['occupation'] for p in personas]
patterns = enhance_location_behaviors(occupations)

# Combine and save
data = {
    "personas": personas,
    "location_patterns": patterns,
    "timestamp": "2026-05-18"
}

with open("enhanced_personas.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Generated {len(personas)} personas with location patterns!")
```

## Notes

- LLM calls are **optional** — generator automatically uses fallbacks if API unavailable
- All data is **cached** in `cached_simulation.json` for web server
- Validation is **automated** and runs after trajectory generation
- Results are **JSON format** for easy integration with any tool

## References

- [Groq API Documentation](https://console.groq.com/docs)
- [EpiNexus Data Quality Rubric](./DATA_QUALITY_RUBRIC.md)
- [Backend Validation Engine](./backend/validate_data_quality.py)

---

**Last Updated**: 2026-05-18  
**Status**: Production Ready ✅

# Data Strategy: EpiNexus

EpiNexus relies on three primary data schemas. For the 72-hour hackathon, we use a custom-built **Stochastic Agent-Based Generator** to produce these files.

## 1. Schema Definitions

### `trajectories.json`
Array of objects tracking individuals over time.
```json
{
  "individual_id": "string",
  "is_patient_zero": "boolean",
  "vulnerability_score": "float [0.0 - 1.0]",
  "timeline": [
    {
      "timestamp": "ISO-8601",
      "coordinates": [lat, lon],
      "location_id": "string"
    }
  ]
}
```

### `locations_context.json`
Environmental metadata for mapped physical spaces.
```json
{
  "location_id": {
    "name": "string",
    "type": "enclosed | semi_enclosed | open_air",
    "ach": "float",
    "volume_m3": "float",
    "mask_required": "boolean"
  }
}
```

### `pathogen_config.json`
Pathogen-specific physical traits.
```json
{
  "name": "string",
  "alpha": "float (Infectivity)",
  "half_life_sec": "float",
  "incubation_median_days": "int"
}
```

## 2. Synthetic Generation Plan (`generator.py`)
To prove the platform's robustness, the generator will simulate:
1. **The Patient Zero Script:** An infected agent visits 3 locations (Classroom, Dining Hall, Dorm).
2. **The "Shadowing" Agents:** 5 agents with 90% trajectory overlap with Patient Zero.
3. **Ghost Exposure:** 10 agents who enter the "Classroom" 30 minutes *after* Patient Zero leaves, testing the environmental decay logic.
4. **The "Casual" Agents:** 100+ agents with random, sparse overlaps to test $O(N \log N)$ scalability.
5. **Data Corruption:** Randomly dropping 10% of timestamps to simulate real-world GPS noise.

## 3. Validation Strategy
- **Ground Truth:** The generator exports a "True Infection Matrix" which is hidden from the `ExposureEngine`.
- **Ghost Validation:** Verify that agents exposed *only* to the "Ghost Virus" (after P0 left) still show non-zero (but decaying) risk scores.
- **Benchmarking:** Compare EpiNexus's $P_{trans}$ against a simple binary `distance < 2m AND time > 15min` baseline using AUC-ROC metrics.

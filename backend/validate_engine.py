import json
from app.engine import SpatialExposureEngine

# Load generated data
with open("trajectories.json", "r") as f:
    trajectories = json.load(f)
with open("locations_context.json", "r") as f:
    locations = json.load(f)
with open("pathogen_config.json", "r") as f:
    pathogen = json.load(f)

# Initialize engine
engine = SpatialExposureEngine(trajectories, locations, pathogen)

# Run a single simulation
print("Running single simulation...")
probs, heatmap = engine.run_single_simulation()

# Check some results
p0_risk = probs.get("ind_patient_zero", "N/A")
shadow_risk = probs.get("ind_shadow_0", "N/A")
ghost_risk = probs.get("ind_ghost_0", "N/A")

print(f"Patient Zero Risk: {p0_risk}")
print(f"Shadow Agent 0 Risk: {shadow_risk}")
print(f"Ghost Agent 0 Risk: {ghost_risk}")

# Run quick Monte Carlo
print("\nRunning quick Monte Carlo (5 iterations)...")
summary = engine.run_monte_carlo(iterations=5)
voi_summary = engine.calculate_voi(summary)

print("\nTop 5 Resource Allocation Recommendations (VoI):")
for s in voi_summary[:5]:
    print(f"- {s['individual_id']}: Mean Risk={s['mean_risk']:.2f}, Entropy={s['entropy']:.2f}, VoI Score={s['voi_score']:.2f}")

print("\nValidation Complete.")
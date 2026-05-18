import json
import os
from app.engine import SpatialExposureEngine

def generate_cache():
    print("Generating initial simulation cache...")
    with open("trajectories.json", "r") as f:
        trajectories = json.load(f)
    with open("locations_context.json", "r") as f:
        locations = json.load(f)
    with open("pathogen_config.json", "r") as f:
        pathogen = json.load(f)

    engine = SpatialExposureEngine(trajectories, locations, pathogen)
    data = engine.get_full_simulation_data(iterations=20)
    
    with open("cached_simulation.json", "w") as f:
        json.dump(data, f)
    print("Cache generated successfully.")

if __name__ == "__main__":
    generate_cache()

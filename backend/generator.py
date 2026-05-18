import json
import random
import numpy as np
from datetime import datetime, timedelta

def generate_pathogen_config():
    config = {
        "name": "Andes_Hantavirus_2026_Variant",
        "alpha": 0.045,  # Baseline infectivity
        "half_life_sec": 2700, # 45 minutes
        "incubation_median_days": 18
    }
    with open("pathogen_config.json", "w") as f:
        json.dump(config, f, indent=2)
    print("Generated pathogen_config.json")

def generate_locations_context():
    locations = {
        "loc_classroom_01": {"name": "Main Lecture Hall", "type": "enclosed", "ach": 1.5, "volume_m3": 500, "coords": [38.9869, -76.9426]},
        "loc_dining_hall": {"name": "Student Union Dining", "type": "semi_enclosed", "ach": 4.0, "volume_m3": 1200, "coords": [38.9812, -76.9375]},
        "loc_dorm_lounge": {"name": "East Wing Lounge", "type": "enclosed", "ach": 1.0, "volume_m3": 150, "coords": [38.9850, -76.9440]},
        "loc_outdoor_quad": {"name": "Campus Mall", "type": "open_air", "ach": 60.0, "volume_m3": 100000, "coords": [38.9875, -76.9401]},
        "loc_library": {"name": "McKeldin Library", "type": "enclosed", "ach": 2.5, "volume_m3": 3000, "coords": [38.9859, -76.9421]},
        "loc_gym": {"name": "Eppley Recreation Center", "type": "enclosed", "ach": 8.0, "volume_m3": 5000, "coords": [38.9935, -76.9450]},
        "loc_bus_stop": {"name": "Campus Transit Hub", "type": "semi_enclosed", "ach": 15.0, "volume_m3": 100, "coords": [38.9880, -76.9400]}
    }
    with open("locations_context.json", "w") as f:
        json.dump(locations, f, indent=2)
    print("Generated expanded locations_context.json")

def generate_trajectories(num_casual=800):
    start_time = datetime(2026, 5, 18, 8, 0, 0)
    ticks = [start_time + timedelta(minutes=5 * i) for i in range(144)]
    
    with open("locations_context.json", "r") as f:
        locations_meta = json.load(f)
    
    loc_ids = list(locations_meta.keys())
    loc_coords = {k: v["coords"] for k, v in locations_meta.items()}

    trajectories = []

    # 1. Patient Zero (The Super-Spreader)
    p0_timeline = []
    for i, t in enumerate(ticks):
        if i < 36: loc = "loc_bus_stop" # Commute
        elif i < 72: loc = "loc_classroom_01" # Class
        elif i < 96: loc = "loc_dining_hall" # Lunch
        elif i < 120: loc = "loc_gym" # Workout
        else: loc = "loc_dorm_lounge" # Evening
        
        coord = [loc_coords[loc][0] + random.uniform(-0.0001, 0.0001), 
                 loc_coords[loc][1] + random.uniform(-0.0001, 0.0001)]
        p0_timeline.append({"timestamp": t.isoformat() + "Z", "coordinates": coord, "location_id": loc})
    
    trajectories.append({"individual_id": "ind_patient_zero", "is_patient_zero": True, "vulnerability_score": 0.45, "timeline": p0_timeline})

    # 2. Add Routines for Casual Agents
    for a in range(num_casual):
        timeline = []
        # Assign a "type" of student
        routine_type = random.choice(["studious", "athlete", "social", "commuter"])
        
        current_loc = random.choice(loc_ids)
        for i, t in enumerate(ticks):
            # Routine logic
            if routine_type == "studious" and 36 < i < 100: current_loc = "loc_library"
            elif routine_type == "athlete" and 100 < i < 130: current_loc = "loc_gym"
            elif i % 24 == 0: current_loc = random.choice(loc_ids) # Change loc every 2 hours
            
            coord = [loc_coords[current_loc][0] + random.uniform(-0.0005, 0.0005), 
                     loc_coords[current_loc][1] + random.uniform(-0.0005, 0.0005)]
            
            if random.random() > 0.05: # 5% packet loss
                timeline.append({"timestamp": t.isoformat() + "Z", "coordinates": coord, "location_id": current_loc})
        
        trajectories.append({
            "individual_id": f"ind_agent_{a}",
            "is_patient_zero": False,
            "vulnerability_score": random.uniform(0.1, 0.9),
            "timeline": timeline
        })

    with open("trajectories.json", "w") as f:
        json.dump(trajectories, f, indent=2)
    print(f"Generated trajectories.json with {len(trajectories)} agents.")

if __name__ == "__main__":
    generate_pathogen_config()
    generate_locations_context()
    generate_trajectories()

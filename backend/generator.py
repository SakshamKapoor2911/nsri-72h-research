import json
import random
import numpy as np
from datetime import datetime, timedelta
from llm_utils import get_realistic_personas

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
    start_date = datetime(2026, 5, 18, 8, 0, 0)
    days = 7
    ticks = []
    for d in range(days):
        day_start = start_date + timedelta(days=d)
        for i in range(48):
            ticks.append(day_start + timedelta(minutes=15 * i))
    
    with open("locations_context.json", "r") as f:
        locations_meta = json.load(f)
    
    loc_ids = list(locations_meta.keys())
    loc_coords = {k: v["coords"] for k, v in locations_meta.items()}

    # Fetch LLM Personas
    print("Fetching realistic personas from Groq...")
    personas = get_realistic_personas(count=20)
    if not personas:
        personas = [
            {"name": "Dr. Aris Thorne", "occupation": "Epidemiology Professor", "routine": "Library and Classroom", "vulnerability_score": 0.3},
            {"name": "Marcus Chen", "occupation": "Graduate Researcher", "routine": "Library and Lab", "vulnerability_score": 0.4},
            {"name": "Sarah Jenkins", "occupation": "Undergraduate Student", "routine": "Gym and Quad", "vulnerability_score": 0.2},
            {"name": "Robert Miller", "occupation": "Campus Security", "routine": "Bus Stop and Quad", "vulnerability_score": 0.5},
            {"name": "Elena Rodriguez", "occupation": "Cafeteria Staff", "routine": "Dining Hall", "vulnerability_score": 0.6}
        ]

    trajectories = []

    # 1. Patient Zero (The Super-Spreader)
    p0_persona = random.choice(personas)
    p0_timeline = []
    for i, t in enumerate(ticks):
        day_tick = i % 48
        if day_tick < 12: loc = "loc_bus_stop" 
        elif day_tick < 24: loc = "loc_classroom_01"
        elif day_tick < 32: loc = "loc_dining_hall"
        elif day_tick < 40: loc = "loc_gym"
        else: loc = "loc_dorm_lounge"
        
        coord = [loc_coords[loc][0] + random.uniform(-0.0001, 0.0001), 
                 loc_coords[loc][1] + random.uniform(-0.0001, 0.0001)]
        p0_timeline.append({"timestamp": t.isoformat() + "Z", "coordinates": coord, "location_id": loc})
    
    trajectories.append({
        "individual_id": "ind_patient_zero", 
        "name": p0_persona['name'] + " (P0)",
        "occupation": p0_persona['occupation'],
        "is_patient_zero": True, 
        "vulnerability_score": p0_persona['vulnerability_score'], 
        "timeline": p0_timeline
    })

    # 2. Add Routines for Casual Agents
    for a in range(num_casual):
        persona = random.choice(personas)
        timeline = []
        
        current_loc = random.choice(loc_ids)
        for i, t in enumerate(ticks):
            day_tick = i % 48
            
            # More varied routine logic based on persona
            if "Professor" in persona['occupation'] or "Researcher" in persona['occupation']:
                if 12 < day_tick < 36: current_loc = "loc_library" if random.random() > 0.3 else "loc_classroom_01"
            elif "Staff" in persona['occupation']:
                if 12 < day_tick < 40: current_loc = "loc_dining_hall"
            elif "Security" in persona['occupation']:
                current_loc = random.choice(["loc_bus_stop", "loc_outdoor_quad"])
            else: # Student
                if 12 < day_tick < 24: current_loc = "loc_classroom_01"
                elif 32 < day_tick < 40: current_loc = "loc_gym"
                elif day_tick % 12 == 0: current_loc = random.choice(loc_ids) 
            
            coord = [loc_coords[current_loc][0] + random.uniform(-0.0005, 0.0005), 
                     loc_coords[current_loc][1] + random.uniform(-0.0005, 0.0005)]
            
            if random.random() > 0.05: 
                timeline.append({"timestamp": t.isoformat() + "Z", "coordinates": coord, "location_id": current_loc})
        
        trajectories.append({
            "individual_id": f"ind_agent_{a}",
            "name": f"{persona['name']} {a}", # Make names unique-ish
            "occupation": persona['occupation'],
            "is_patient_zero": False,
            "vulnerability_score": max(0.1, min(0.9, persona['vulnerability_score'] + random.uniform(-0.1, 0.1))),
            "timeline": timeline
        })

    with open("trajectories.json", "w") as f:
        json.dump(trajectories, f, indent=2)
    print(f"Generated trajectories.json with {len(trajectories)} agents and LLM-enhanced personas.")

if __name__ == "__main__":
    generate_pathogen_config()
    generate_locations_context()
    generate_trajectories()

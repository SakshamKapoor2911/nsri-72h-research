import json
import random
import numpy as np
from datetime import datetime, timedelta
from llm_utils import get_realistic_personas, validate_data_quality, enhance_location_behaviors, generate_health_profiles

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
    print("   📡 Fetching LLM personas...")
    personas = get_realistic_personas(count=20)
    if not personas:
        print("   ⚠️  Groq API unavailable, using fallback personas")
        personas = [
            {"name": "Dr. Aris Thorne", "occupation": "Epidemiology Professor", "routine": "Library and Classroom", "vulnerability_score": 0.3},
            {"name": "Marcus Chen", "occupation": "Graduate Researcher", "routine": "Library and Lab", "vulnerability_score": 0.4},
            {"name": "Sarah Jenkins", "occupation": "Undergraduate Student", "routine": "Gym and Quad", "vulnerability_score": 0.2},
            {"name": "Robert Miller", "occupation": "Campus Security", "routine": "Bus Stop and Quad", "vulnerability_score": 0.5},
            {"name": "Elena Rodriguez", "occupation": "Cafeteria Staff", "routine": "Dining Hall", "vulnerability_score": 0.6}
        ]
    else:
        print(f"   ✅ Loaded {len(personas)} personas from Groq")
    
    # Optionally fetch location behavior patterns (can enhance location assignment logic)
    print("   📡 Fetching LLM location behavior patterns...")
    occupations = list(set([p.get("occupation", "Student") for p in personas]))
    location_patterns = enhance_location_behaviors(occupations)
    if location_patterns:
        print(f"   ✅ Generated behavior patterns for {len(location_patterns)} occupations")
    else:
        print(f"   ℹ️  Using default location assignments")

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
            
            # Increase density: keep timeline points frequent
            timeline.append({"timestamp": t.isoformat() + "Z", "coordinates": coord, "location_id": current_loc})
        
        # Wider risk distribution: Gaussian centered on 0.5 (±0.25 range)
        base_risk = np.clip(np.random.normal(0.5, 0.15), 0.1, 0.9)
        trajectories.append({
            "individual_id": f"ind_agent_{a}",
            "name": f"{persona['name']} {a}",
            "occupation": persona['occupation'],
            "is_patient_zero": False,
            "vulnerability_score": base_risk,
            "timeline": timeline
        })

    with open("trajectories.json", "w") as f:
        json.dump(trajectories, f, indent=2)
    
    # Generate summary report
    print(f"\n📊 Generation Summary:")
    print(f"   ✅ {len(trajectories)} agents generated")
    print(f"   ✅ {len(loc_ids)} locations tracked")
    print(f"   ✅ {len(ticks)} time ticks (15-min intervals)")
    
    # Count occupations
    occupation_counts = {}
    for traj in trajectories:
        occ = traj.get("occupation", "Unknown")
        occupation_counts[occ] = occupation_counts.get(occ, 0) + 1
    
    print(f"\n   Occupation Distribution:")
    for occ, count in sorted(occupation_counts.items(), key=lambda x: -x[1])[:5]:
        print(f"      - {occ}: {count} agents")
    
    # Vulnerability statistics
    vuln_scores = [t.get("vulnerability_score", 0.5) for t in trajectories]
    print(f"\n   Vulnerability Statistics:")
    print(f"      - Mean: {np.mean(vuln_scores):.2f}")
    print(f"      - Median: {np.median(vuln_scores):.2f}")
    print(f"      - Range: [{min(vuln_scores):.2f}, {max(vuln_scores):.2f}]")
    
    print(f"\n✨ trajectories.json generated with LLM-enhanced personas!")

if __name__ == "__main__":
    print("\n" + "="*80)
    print("EpiNexus Data Generation Pipeline")
    print("="*80)
    
    # Step 1: Generate base configuration
    print("\n📋 Step 1: Generating pathogen configuration...")
    generate_pathogen_config()
    
    print("📍 Step 2: Generating location contexts...")
    generate_locations_context()
    
    # Step 2: Fetch LLM-enhanced personas and patterns
    print("\n🤖 Step 3: Fetching LLM-enhanced data...")
    print("   - Getting realistic personas (20 agents)")
    print("   - Generating location behavior patterns")
    print("   - Creating health profiles")
    
    # Step 3: Generate trajectories
    print("\n📊 Step 4: Generating agent trajectories...")
    generate_trajectories()
    
    # Step 4: Validate generated data
    print("\n✔️  Step 5: Validating data quality...")
    try:
        from app.engine import SpatialExposureEngine
        import os
        
        if os.path.exists("trajectories.json") and os.path.exists("locations_context.json") and os.path.exists("pathogen_config.json"):
            with open("trajectories.json", "r") as f:
                trajectories = json.load(f)
            with open("locations_context.json", "r") as f:
                locations = json.load(f)
            with open("pathogen_config.json", "r") as f:
                pathogen = json.load(f)
            
            # Run simulation to generate agent data
            engine = SpatialExposureEngine(trajectories, locations, pathogen)
            sim_data = engine.get_full_simulation_data(iterations=10)
            
            # Validate data quality using LLM
            print(f"\n   Generated {len(sim_data['agents'])} agents")
            validation_report = validate_data_quality(sim_data['agents'])
            
            print(f"\n   Quality Score: {validation_report.get('quality_score', 0)}/100")
            if validation_report.get('issues'):
                print(f"   Issues: {validation_report['issues']}")
            if validation_report.get('suggestions'):
                print(f"   Suggestions: {validation_report['suggestions'][:2]}")
            
            # Cache the simulation
            with open("cached_simulation.json", "w") as f:
                json.dump(sim_data, f)
            print("\n✅ Cached simulation data generated successfully!")
        else:
            print("⚠️  Configuration files not found. Run full generation first.")
    except Exception as e:
        print(f"⚠️  Data validation skipped: {e}")
    
    print("\n" + "="*80)
    print("✨ Data generation complete! Ready to serve.")
    print("="*80 + "\n")

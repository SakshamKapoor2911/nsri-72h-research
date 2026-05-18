from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
import json
import os
from .schemas import SimulationData
from .engine import SpatialExposureEngine
from typing import List
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="EpiNexus Backend", default_response_class=ORJSONResponse)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
DATA_STORE = {
    "trajectories": [],
    "locations": {},
    "pathogen": {},
    "full_data": None
}

# Resolve the backend directory path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "backend")
print(f"Data directory: {DATA_DIR}")

@app.on_event("startup")
async def startup_event():
    traj_path = os.path.join(DATA_DIR, "trajectories.json")
    loc_path = os.path.join(DATA_DIR, "locations_context.json")
    patho_path = os.path.join(DATA_DIR, "pathogen_config.json")
    cache_path = os.path.join(DATA_DIR, "cached_simulation.json")

    if os.path.exists(traj_path):
        with open(traj_path, "r") as f:
            DATA_STORE["trajectories"] = json.load(f)
    if os.path.exists(loc_path):
        with open(loc_path, "r") as f:
            DATA_STORE["locations"] = json.load(f)
    if os.path.exists(patho_path):
        with open(patho_path, "r") as f:
            DATA_STORE["pathogen"] = json.load(f)
    
    # Load cached simulation if available
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                DATA_STORE["full_data"] = json.load(f)
            print("Loaded cached simulation data.")
        except Exception as e:
            print(f"Error loading cache: {e}")
            
    print("Data loaded into EpiNexus Backend.")

@app.post("/simulation/run")
async def run_simulation(background_tasks: BackgroundTasks):
    engine = SpatialExposureEngine(
        DATA_STORE["trajectories"], 
        DATA_STORE["locations"], 
        DATA_STORE["pathogen"]
    )
    
    def run_full_task():
        data = engine.get_full_simulation_data(iterations=20) 
        DATA_STORE["full_data"] = data
        # Cache the results
        try:
            with open(os.path.join(DATA_DIR, "cached_simulation.json"), "w") as f:
                json.dump(data, f)
            print("Simulation results cached.")
        except Exception as e:
            print(f"Error caching results: {e}")
    
    background_tasks.add_task(run_full_task)
    return {"status": "Simulation started"}

@app.post("/simulation/recompute")
async def recompute_with_intel(agent_id: str, intel: str, background_tasks: BackgroundTasks):
    # Mock LLM logic - in a real app, this would use OpenAI/Anthropic/Gemini
    # to parse "intel" and adjust DATA_STORE["trajectories"]
    print(f"LLM Parsing Intel for {agent_id}: {intel}")
    
    # Heuristic: if "unventilated" or "no mask" or "longer" is mentioned, increase vulnerability or add contact events
    found_agent = False
    for agent in DATA_STORE["trajectories"]:
        if agent["individual_id"] == agent_id:
            agent["vulnerability_score"] = min(1.0, agent["vulnerability_score"] * 1.3)
            found_agent = True
            break
    
    if not found_agent:
        return {"status": "error", "message": "Agent not found"}

    engine = SpatialExposureEngine(
        DATA_STORE["trajectories"], 
        DATA_STORE["locations"], 
        DATA_STORE["pathogen"]
    )
    
    def run_full_task():
        data = engine.get_full_simulation_data(iterations=20)
        DATA_STORE["full_data"] = data
        try:
            with open(os.path.join(DATA_DIR, "cached_simulation.json"), "w") as f:
                json.dump(data, f)
            print("Recomputed results cached.")
        except Exception as e:
            print(f"Error caching results: {e}")
    
    background_tasks.add_task(run_full_task)
    return {"status": "Recomputation triggered with field intel"}

@app.get("/api/simulation", response_model=SimulationData)
async def get_simulation_data():
    if DATA_STORE["full_data"] is None:
        raise HTTPException(status_code=404, detail="Simulation data not yet computed. Please run the simulation first.")
    
    return DATA_STORE["full_data"]

@app.get("/health")
async def health_check():
    return {"status": "ok", "data_loaded": len(DATA_STORE["trajectories"]) > 0}

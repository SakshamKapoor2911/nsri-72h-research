from fastapi import FastAPI, BackgroundTasks
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

@app.on_event("startup")
async def startup_event():
    if os.path.exists("trajectories.json"):
        with open("trajectories.json", "r") as f:
            DATA_STORE["trajectories"] = json.load(f)
    if os.path.exists("locations_context.json"):
        with open("locations_context.json", "r") as f:
            DATA_STORE["locations"] = json.load(f)
    if os.path.exists("pathogen_config.json"):
        with open("pathogen_config.json", "r") as f:
            DATA_STORE["pathogen"] = json.load(f)
    print("Data loaded into EpiNexus Backend.")

@app.post("/simulation/run")
async def run_simulation(background_tasks: BackgroundTasks):
    engine = SpatialExposureEngine(
        DATA_STORE["trajectories"], 
        DATA_STORE["locations"], 
        DATA_STORE["pathogen"]
    )
    
    def run_full_task():
        data = engine.get_full_simulation_data(iterations=20) # Lower for performance
        DATA_STORE["full_data"] = data
    
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
    
    background_tasks.add_task(run_full_task)
    return {"status": "Recomputation triggered with field intel"}

@app.get("/api/simulation", response_model=SimulationData)
async def get_simulation_data():
    if DATA_STORE["full_data"] is None:
        # Initial run if no data exists
        engine = SpatialExposureEngine(
            DATA_STORE["trajectories"], 
            DATA_STORE["locations"], 
            DATA_STORE["pathogen"]
        )
        DATA_STORE["full_data"] = engine.get_full_simulation_data(iterations=10)
    
    return DATA_STORE["full_data"]

@app.get("/health")
async def health_check():
    return {"status": "ok", "data_loaded": len(DATA_STORE["trajectories"]) > 0}

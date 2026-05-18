import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    # Ensure data exists
    if not os.path.exists("trajectories.json"):
        print("Warning: trajectories.json not found. Run generator.py first.")
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting EpiNexus Backend on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

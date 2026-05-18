import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def analyze_simulation_data(file_path='backend/cached_simulation.json'):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # Spatial Arcs Analysis
    arcs = pd.DataFrame(data.get('spatialArcs', []))
    if not arcs.empty:
        print("--- Spatial Arcs Analysis ---")
        print(f"Total Arcs: {len(arcs)}")
        print(f"Risk Density Summary:\n{arcs['riskDensity'].describe()}\n")
        print(f"Tick Distribution:\n{arcs['tick'].value_counts().sort_index()}\n")
    
    # Spatial Points Analysis
    points = pd.DataFrame(data.get('spatialPoints', []))
    if not points.empty:
        print("--- Spatial Points Analysis ---")
        print(f"Total Points: {len(points)}")
        print(f"Risk Summary:\n{points['risk'].describe()}\n")
        print(f"Status Distribution:\n{points['status'].value_counts()}\n")

    # Environmental Alerts
    alerts = pd.DataFrame(data.get('environmentalAlerts', []))
    if not alerts.empty:
        print("--- Environmental Alerts ---")
        print(f"Total Alerts: {len(alerts)}\n")

if __name__ == "__main__":
    analyze_simulation_data()
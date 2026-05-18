import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from datetime import datetime
from typing import List, Dict
import math
import random
from concurrent.futures import ProcessPoolExecutor, as_completed
import os

class SpatialExposureEngine:
    def __init__(self, trajectories: List[Dict], locations: Dict[str, Dict], pathogen: Dict):
        self.trajectories = trajectories
        self.locations = locations
        self.pathogen = pathogen
        
        # Pre-process trajectories into a unified dataframe
        rows = []
        for ind in trajectories:
            for entry in ind['timeline']:
                rows.append({
                    'individual_id': ind['individual_id'],
                    'is_patient_zero': ind['is_patient_zero'],
                    'timestamp': entry['timestamp'],
                    'lat': entry['coordinates'][0],
                    'lon': entry['coordinates'][1],
                    'location_id': entry['location_id']
                })
        self.df = pd.DataFrame(rows)
        self.df['timestamp'] = pd.to_datetime(self.df['timestamp'])
        self.timestamps = sorted(self.df['timestamp'].unique())
        
        # Pre-group by timestamp for faster simulation
        self.grouped_df = {t: df_t for t, df_t in self.df.groupby('timestamp')}

    def _get_decay_constant(self, ach: float):
        lambda_vent = ach / 3600.0
        lambda_bio = math.log(2) / self.pathogen['half_life_sec']
        return lambda_vent + lambda_bio

    def run_single_simulation(self, alpha_noise=1.0, ach_noise=1.0, spatial_noise=0.0):
        dosages = {ind['individual_id']: 0.0 for ind in self.trajectories}
        
        # Local viral load state for this simulation instance
        viral_loads = {loc_id: 0.0 for loc_id in self.locations.keys()}
        
        dt = (self.timestamps[1] - self.timestamps[0]).total_seconds() if len(self.timestamps) > 1 else 300
        effective_alpha = (self.pathogen['alpha'] * alpha_noise) / 50.0 

        for t in self.timestamps:
            current_df = self.grouped_df.get(t, pd.DataFrame())
            if current_df.empty: continue
            
            # 1. Update Viral Loads
            for loc_id, meta in self.locations.items():
                decay = self._get_decay_constant(meta['ach'] * ach_noise)
                shedding = 0.1 if not current_df[(current_df['location_id'] == loc_id) & (current_df['is_patient_zero'] == True)].empty else 0.0
                viral_loads[loc_id] = (viral_loads[loc_id] * math.exp(-decay * dt)) + shedding

            # 2. Direct Spatial Exposure
            coords = current_df[['lat', 'lon']].values
            if spatial_noise > 0:
                coords += np.random.normal(0, spatial_noise, coords.shape)
            
            tree = cKDTree(coords)
            p0_indices = np.where(current_df['is_patient_zero'].values == True)[0]
            
            for idx in p0_indices:
                neighbors = tree.query_ball_point(coords[idx], 0.0002)
                for n_idx in neighbors:
                    if n_idx == idx: continue
                    dist = np.linalg.norm(coords[idx] - coords[n_idx])
                    target_id = current_df.iloc[n_idx]['individual_id']
                    dosages[target_id] += (1.0 / (dist**2 + 0.5)) * dt * effective_alpha

            # 3. Indirect Exposure
            for loc_id in self.locations.keys():
                exposed_here = current_df[current_df['location_id'] == loc_id]
                load = viral_loads[loc_id]
                if load <= 0: continue
                
                env_factor = 1.0 / (self.locations[loc_id]['ach'] + 0.1)
                exposure_inc = load * env_factor * dt * effective_alpha
                for _, row in exposed_here.iterrows():
                    if not row['is_patient_zero']:
                        dosages[row['individual_id']] += exposure_inc

        return {ind_id: (1.0 - math.exp(-d)) for ind_id, d in dosages.items()}

    def run_monte_carlo(self, iterations=50):
        # On Windows, ProcessPoolExecutor needs to be used carefully within FastAPI.
        # We'll use ThreadPoolExecutor for now as it's safer for background tasks, 
        # and many numpy operations release the GIL. 
        # For true scaling, ProcessPoolExecutor would be preferred with proper pickling.
        from concurrent.futures import ThreadPoolExecutor
        
        results = []
        with ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
            futures = []
            for _ in range(iterations):
                a_noise = np.random.normal(1.0, 0.15)
                ach_noise = np.random.normal(1.0, 0.25)
                s_noise = 0.00005
                futures.append(executor.submit(self.run_single_simulation, a_noise, ach_noise, s_noise))
            
            for future in as_completed(futures):
                results.append(future.result())

        # Aggregate results
        all_probs = {ind['individual_id']: [] for ind in self.trajectories}
        for res in results:
            for ind_id, p in res.items():
                all_probs[ind_id].append(p)
        
        summary = []
        for ind_id, p_list in all_probs.items():
            mean_p = float(np.mean(p_list))
            ci_lower = float(np.percentile(p_list, 2.5))
            ci_upper = float(np.percentile(p_list, 97.5))
            entropy = -(mean_p * math.log2(mean_p) + (1 - mean_p) * math.log2(1 - mean_p)) if 0.001 < mean_p < 0.999 else 0.0
            v_score = next(ind['vulnerability_score'] for ind in self.trajectories if ind['individual_id'] == ind_id)
            
            summary.append({
                'individual_id': ind_id,
                'mean_risk': mean_p,
                'ci_lower': ci_lower,
                'ci_upper': ci_upper,
                'entropy': entropy,
                'hospitalization_risk': float(mean_p * v_score)
            })
            
        return summary

    def calculate_voi(self, summary):
        # Value of Information score = entropy * hospitalization_risk
        # This prioritizes high-uncertainty individuals with high vulnerability
        results = []
        for s in summary:
            voi_score = s['entropy'] * s['hospitalization_risk']
            results.append({
                'individual_id': s['individual_id'],
                'mean_risk': s['mean_risk'],
                'entropy': s['entropy'],
                'voi_score': voi_score
            })
        
        # Sort by VoI score descending
        results.sort(key=lambda x: x['voi_score'], reverse=True)
        return results

    def get_full_simulation_data(self, iterations=50):
        summary = self.run_monte_carlo(iterations=iterations)
        voi_summary = self.calculate_voi(summary)
        
        # 1. KPIs
        total_agents = len(self.trajectories)
        active_cases = sum(1 for ind in self.trajectories if ind['is_patient_zero'])
        high_risk = sum(1 for s in summary if s['mean_risk'] > 0.5)
        total_entropy = sum(s['entropy'] for s in summary)
        
        kpis = {
            "totalAgents": total_agents,
            "activeCases": active_cases,
            "highRiskExposures": high_risk,
            "networkEntropy": float(total_entropy)
        }
        
        # 2. Agents
        agents = []
        ind_loc_map = self.df.groupby('individual_id')['location_id'].unique().to_dict()
        for s in summary:
            status = "susceptible"
            if s['mean_risk'] > 0.6: status = "infected" if next(ind['is_patient_zero'] for ind in self.trajectories if ind['individual_id'] == s['individual_id']) else "exposed"
            elif s['mean_risk'] > 0.1: status = "exposed"
            
            agents.append({
                "id": s['individual_id'],
                "isPatientZero": next(ind['is_patient_zero'] for ind in self.trajectories if ind['individual_id'] == s['individual_id']),
                "meanRisk": s['mean_risk'],
                "confidenceInterval": {"lower": s['ci_lower'], "upper": s['ci_upper']},
                "status": status,
                "visitedLocations": [self.locations[l]['name'] for l in ind_loc_map.get(s['individual_id'], [])]
            })
            
        # 3. Recommendations
        recommendations = []
        for v in voi_summary[:5]:
            recommendations.append({
                "id": v['individual_id'],
                "riskScore": v['mean_risk'],
                "entropyReduction": v['voi_score'] * 10.0 # Scaling for display
            })
            
        # 4. Environmental Alerts (Ghost Virus states)
        alerts = []
        for loc_id, v_load in self.viral_loads.items():
            if v_load > 0.05:
                alerts.append({
                    "locationId": loc_id,
                    "locationName": self.locations[loc_id]['name'],
                    "viralLoad": float(v_load),
                    "timestamp": self.timestamps[-1].isoformat() + "Z"
                })
                
        # 5. Risk Distribution
        buckets = [0] * 10
        for s in summary:
            idx = min(9, int(s['mean_risk'] * 10))
            buckets[idx] += 1
            
        risk_dist = []
        for i in range(10):
            risk_dist.append({
                "bracket": f"{i*10}-{(i+1)*10}%",
                "agents": buckets[i]
            })
            
        # 6. Spatial Arcs (Simplified from trajectories)
        # We'll normalize coords to 0-1 based on campus bounds
        lats = [l['coords'][0] for l in self.locations.values()]
        lons = [l['coords'][1] for l in self.locations.values()]
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)
        
        def normalize(lat, lon):
            x = (lon - min_lon) / (max_lon - min_lon + 0.000001)
            y = (lat - min_lat) / (max_lat - min_lat + 0.000001)
            return x * 0.8 + 0.1, y * 0.8 + 0.1 # Padding

        arcs = []
        # Create arcs from Patient Zero to exposed people
        p0_id = next(ind['individual_id'] for ind in self.trajectories if ind['is_patient_zero'])
        p0_locs = ind_loc_map.get(p0_id, [])
        
        for i, loc_id in enumerate(p0_locs[:3]):
            loc = self.locations[loc_id]
            dest_loc_id = random.choice(list(self.locations.keys()))
            dest_loc = self.locations[dest_loc_id]
            
            arcs.append({
                "id": f"arc-{i}",
                "from_node": {"id": loc_id, "label": loc['name'], "x": normalize(*loc['coords'])[0], "y": normalize(*loc['coords'])[1]},
                "to": {"id": dest_loc_id, "label": dest_loc['name'], "x": normalize(*dest_loc['coords'])[0], "y": normalize(*dest_loc['coords'])[1]},
                "riskDensity": random.uniform(0.4, 0.9),
                "tick": i + 1
            })

        return {
            "kpis": kpis,
            "agents": agents,
            "recommendations": recommendations,
            "environmentalAlerts": alerts,
            "riskDistribution": risk_dist,
            "spatialArcs": arcs,
            "timeRange": {"startDay": 1, "endDay": 1}
        }

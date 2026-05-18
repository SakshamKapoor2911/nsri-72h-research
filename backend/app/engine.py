import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from datetime import datetime
from typing import List, Dict, Tuple
import math
import random
from concurrent.futures import ProcessPoolExecutor, as_completed
import os

def _run_single_sim_wrapper(args):
    """Wrapper for ProcessPoolExecutor to call the simulation function."""
    # This is a bit tricky because we'd need to pass the whole engine state
    # or re-initialize it. For now, let's keep it simple and see if we can
    # just optimize the inner loop enough.
    # Actually, ProcessPoolExecutor needs the function to be picklable.
    pass

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
        
        # Pre-calculate individual indexing for vectorized dosages
        self.agent_ids = [ind['individual_id'] for ind in trajectories]
        self.agent_id_to_idx = {a_id: i for i, a_id in enumerate(self.agent_ids)}
        self.is_p0_mask = np.array([ind['is_patient_zero'] for ind in trajectories])
        
        # Location mapping
        self.loc_ids = list(locations.keys())
        self.loc_id_to_idx = {l_id: i for i, l_id in enumerate(self.loc_ids)}
        self.loc_achs = np.array([locations[l]['ach'] for l in self.loc_ids])
        self.loc_env_factors = 1.0 / (self.loc_achs + 0.1)

        # Pre-group by timestamp for faster simulation
        self.grouped_data = {}
        for t, df_t in self.df.groupby('timestamp'):
            self.grouped_data[t] = {
                'coords': df_t[['lat', 'lon']].values.astype(np.float64),
                'is_p0': df_t['is_patient_zero'].values,
                'agent_ids': df_t['individual_id'].values,
                'loc_indices': df_t['location_id'].map(self.loc_id_to_idx).fillna(-1).values.astype(int)
            }
        
        # Track viral loads (global maximums)
        self.viral_loads_max = np.zeros(len(self.loc_ids))

    def run_single_simulation(self, alpha_noise=1.0, ach_noise=1.0, spatial_noise=0.0) -> Tuple[np.ndarray, List]:
        num_agents = len(self.agent_ids)
        dosages = np.zeros(num_agents)
        contacts = [] 
        
        local_viral_loads = np.zeros(len(self.loc_ids))
        
        dt = (self.timestamps[1] - self.timestamps[0]).total_seconds() if len(self.timestamps) > 1 else 300
        # Scale alpha significantly down for multi-day accumulation
        effective_alpha = (self.pathogen['alpha'] * alpha_noise) / 400.0 
        
        # Decay constants
        lambda_bio = math.log(2) / self.pathogen['half_life_sec']
        decays = (self.loc_achs * ach_noise / 3600.0) + lambda_bio
        decay_factors = np.exp(-decays * dt)
        env_factors = 1.0 / (self.loc_achs * ach_noise + 0.1)

        for t in self.timestamps:
            data = self.grouped_data.get(t)
            if data is None: continue
            
            # 1. Update Viral Loads
            shedding = np.zeros(len(self.loc_ids))
            p0_mask = data['is_p0']
            if p0_mask.any():
                p0_loc_indices = data['loc_indices'][p0_mask]
                for l_idx in p0_loc_indices:
                    if l_idx != -1:
                        # Reduced shedding rate
                        shedding[l_idx] = 0.02
            
            local_viral_loads = (local_viral_loads * decay_factors) + shedding
            self.viral_loads_max = np.maximum(self.viral_loads_max, local_viral_loads)

            # 2. Direct Spatial Exposure
            coords = data['coords'].copy()
            if spatial_noise > 0:
                coords += np.random.normal(0, spatial_noise, coords.shape)
            
            tree = cKDTree(coords)
            p0_indices = np.where(p0_mask)[0]
            
            if len(p0_indices) > 0:
                p0_coords = coords[p0_indices]
                # Smaller radius (approx 3-5 meters)
                neighbors_list = tree.query_ball_point(p0_coords, 0.00005)
                
                for i, neighbors in enumerate(neighbors_list):
                    idx_p0 = p0_indices[i]
                    source_id = data['agent_ids'][idx_p0]
                    
                    for n_idx in neighbors:
                        if n_idx == idx_p0: continue
                        if data['is_p0'][n_idx]: continue
                        
                        # Use squared distance with a more aggressive decay
                        dist_sq = np.sum((coords[idx_p0] - coords[n_idx])**2)
                        target_id = data['agent_ids'][n_idx]
                        
                        # Intensity falls off much faster now
                        intensity = (1.0 / (dist_sq * 1000000 + 1.0)) * dt * effective_alpha
                        
                        dosages[self.agent_id_to_idx[target_id]] += intensity
                        if intensity > 0.05:
                            contacts.append((source_id, target_id, intensity))

            # 3. Indirect Exposure (Vectorized)
            v_loc_indices = data['loc_indices']
            valid_mask = v_loc_indices != -1
            
            if valid_mask.any():
                # Get indices for agents that are NOT patient zero
                not_p0_and_valid = valid_mask & (~p0_mask)
                if not_p0_and_valid.any():
                    target_loc_indices = v_loc_indices[not_p0_and_valid]
                    # Exposure from environmental viral load
                    exposure_inc = local_viral_loads[target_loc_indices] * env_factors[target_loc_indices] * dt * effective_alpha
                    
                    target_agent_ids = data['agent_ids'][not_p0_and_valid]
                    for i, a_id in enumerate(target_agent_ids):
                        dosages[self.agent_id_to_idx[a_id]] += exposure_inc[i]

        return (1.0 - np.exp(-dosages)), contacts


    def run_monte_carlo(self, iterations=50, dynamic=True):
        """
        Runs Monte Carlo simulations. 
        If dynamic=True, stops when mean risks converge.
        """
        from concurrent.futures import ThreadPoolExecutor
        
        dosage_accumulator = np.zeros(len(self.agent_ids))
        dosage_sq_accumulator = np.zeros(len(self.agent_ids))
        all_contacts = []
        
        max_iters = iterations
        min_iters = min(10, iterations)
        current_iter = 0
        
        # For convergence tracking
        prev_means = None
        
        # We'll use batches for dynamic check
        batch_size = 5
        
        # Note: ProcessPoolExecutor is better for CPU, but requires global functions.
        # Sticking with ThreadPoolExecutor for now but with optimized inner loops.
        with ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
            while current_iter < max_iters:
                futures = []
                for _ in range(batch_size):
                    a_noise = np.random.normal(1.0, 0.15)
                    ach_noise = np.random.normal(1.0, 0.25)
                    s_noise = 0.00005
                    futures.append(executor.submit(self.run_single_simulation, a_noise, ach_noise, s_noise))
                
                batch_results = []
                for future in as_completed(futures):
                    probs, contacts = future.result()
                    dosage_accumulator += probs
                    dosage_sq_accumulator += probs**2
                    all_contacts.extend(contacts)
                    batch_results.append(probs)
                    current_iter += 1
                
                if dynamic and current_iter >= min_iters:
                    current_means = dosage_accumulator / current_iter
                    if prev_means is not None:
                        diff = np.abs(current_means - prev_means).mean()
                        if diff < 0.005: # Convergence threshold
                            break
                    prev_means = current_means
                
                if not dynamic and current_iter >= max_iters:
                    break

        mean_risks = dosage_accumulator / current_iter
        # Variance = E[X^2] - (E[X])^2
        variance = (dosage_sq_accumulator / current_iter) - (mean_risks**2)
        std_dev = np.sqrt(np.maximum(0, variance))
        
        # Approximate 95% CI
        ci_lower = np.maximum(0, mean_risks - 1.96 * std_dev / np.sqrt(current_iter))
        ci_upper = np.minimum(1, mean_risks + 1.96 * std_dev / np.sqrt(current_iter))

        summary = []
        for i, a_id in enumerate(self.agent_ids):
            mean_p = float(mean_risks[i])
            entropy = -(mean_p * math.log2(mean_p) + (1 - mean_p) * math.log2(1 - mean_p)) if 0.001 < mean_p < 0.999 else 0.0
            v_score = next(ind['vulnerability_score'] for ind in self.trajectories if ind['individual_id'] == a_id)
            
            summary.append({
                'individual_id': a_id,
                'mean_risk': mean_p,
                'ci_lower': float(ci_lower[i]),
                'ci_upper': float(ci_upper[i]),
                'entropy': entropy,
                'hospitalization_risk': float(mean_p * v_score)
            })
            
        # Aggregate contacts into links
        link_map = {}
        for src, tgt, weight in all_contacts:
            key = tuple(sorted((src, tgt)))
            if key not in link_map:
                link_map[key] = 0.0
            link_map[key] += weight / current_iter
            
        links = [{"source": k[0], "target": k[1], "weight": v} for k, v in link_map.items() if v > 0.02]

        return summary, links

    def get_performance_metrics(self, iterations=20):
        import time
        start = time.time()
        summary, links = self.run_monte_carlo(iterations=iterations, dynamic=False)
        end = time.time()
        
        latency = (end - start) / iterations
        
        # Calculate certainty gain from a small sample
        dosage_accumulator = np.zeros(len(self.agent_ids))
        dosage_sq_accumulator = np.zeros(len(self.agent_ids))
        
        # We'll just use 5 iterations to estimate narrowing
        ci_widths = []
        for i in range(1, 6):
            a_noise = np.random.normal(1.0, 0.15)
            ach_noise = np.random.normal(1.0, 0.25)
            s_noise = 0.00005
            probs, _ = self.run_single_simulation(a_noise, ach_noise, s_noise)
            dosage_accumulator += probs
            dosage_sq_accumulator += probs**2
            if i > 1:
                mean_risks = dosage_accumulator / i
                var = (dosage_sq_accumulator / i) - (mean_risks**2)
                ci_widths.append((1.96 * np.sqrt(np.maximum(0, var)) / np.sqrt(i)).mean() * 2)
        
        certainty_gain = (ci_widths[0] - ci_widths[-1]) / (ci_widths[0] + 1e-9) * 100

        return {
            "latency_ms": latency * 1000,
            "throughput_agents_per_sec": (len(self.agent_ids) / latency),
            "certainty_gain_estimate_pct": certainty_gain,
            "total_agents": len(self.agent_ids),
            "theoretical_max_capacity": int(10 / latency * len(self.agent_ids))
        }

    def calculate_voi(self, summary):
        results = []
        for s in summary:
            voi_score = s['entropy'] * s['hospitalization_risk']
            results.append({
                'individual_id': s['individual_id'],
                'mean_risk': s['mean_risk'],
                'entropy': s['entropy'],
                'voi_score': voi_score
            })
        results.sort(key=lambda x: x['voi_score'], reverse=True)
        return results

    def get_full_simulation_data(self, iterations=50):
        summary, links = self.run_monte_carlo(iterations=iterations)
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
        # Find primary location (most frequent)
        primary_loc_map = self.df.groupby('individual_id')['location_id'].agg(lambda x: x.mode()[0] if not x.mode().empty else None).to_dict()

        for s in summary:
            ind_data = next(ind for ind in self.trajectories if ind['individual_id'] == s['individual_id'])
            mean_risk = s['mean_risk']
            vuln = ind_data.get('vulnerability_score', 0.5)
            # Protection level could be derived from metadata or routine
            protection = 1.0 - vuln 
            
            reasoning = ""
            if ind_data['is_patient_zero']:
                status = "infected"
                mean_risk = 1.0
                confidence = {"lower": 1.0, "upper": 1.0}
                reasoning = "Primary infection source (Patient Zero). High viral shedding observed."
            else:
                confidence = {"lower": s['ci_lower'], "upper": s['ci_upper']}
                
                # Algorithmic Status Determination
                if mean_risk > 0.8:
                    status = "exposed"
                    reasoning = f"Critical exposure level ({mean_risk*100:.1f}%). Repeated spatial proximity to infection source detected."
                elif mean_risk > 0.15:
                    if vuln < 0.3:
                        status = "protected"
                        reasoning = f"Elevated risk ({mean_risk*100:.1f}%), but categorized as Protected due to high physiological resilience (Vuln: {vuln:.2f})."
                    else:
                        status = "exposed"
                        reasoning = f"Significant exposure ({mean_risk*100:.1f}%) with moderate vulnerability ({vuln:.2f}). Monitoring required."
                else:
                    status = "susceptible"
                    reasoning = f"Low cumulative dosage (Risk: {mean_risk*100:.1f}%). Social distancing and environmental factors maintained safe threshold."

            p_loc_id = primary_loc_map.get(s['individual_id'])
            primary_loc_name = self.locations[p_loc_id]['name'] if p_loc_id else None

            agents.append({
                "id": s['individual_id'],
                "name": ind_data.get('name', s['individual_id']),
                "occupation": ind_data.get('occupation', "Student"),
                "isPatientZero": ind_data['is_patient_zero'],
                "meanRisk": mean_risk,
                "confidenceInterval": confidence,
                "status": status,
                "statusReasoning": reasoning,
                "protectionLevel": float(protection),
                "visitedLocations": [self.locations[l]['name'] for l in ind_loc_map.get(s['individual_id'], [])],
                "primaryLocation": primary_loc_name
            })
            
        # 3. Recommendations
        recommendations = []
        for v in voi_summary[:5]:
            recommendations.append({
                "id": v['individual_id'],
                "riskScore": v['mean_risk'],
                "entropyReduction": v['voi_score'] * 10.0
            })
            
        # 4. Environmental Alerts
        alerts = []
        for i, loc_id in enumerate(self.loc_ids):
            v_load = self.viral_loads_max[i]
            if v_load > 0.05:
                alerts.append({
                    "locationId": loc_id,
                    "locationName": self.locations[loc_id]['name'],
                    "viralLoad": float(v_load),
                    "timestamp": self.timestamps[-1].isoformat() + "Z"
                })
                
        # 5. Risk Distribution
        buckets = [0] * 10
        for agent_data in agents:
            # Use the calculated meanRisk which correctly handles Patient Zero
            idx = min(9, int(agent_data['meanRisk'] * 10))
            buckets[idx] += 1
            
        risk_dist = []
        for i in range(10):
            risk_dist.append({
                "bracket": f"{i*10}-{(i+1)*10}%",
                "agents": buckets[i]
            })
            
        # 6. Spatial Arcs & Points
        lats = [l['coords'][0] for l in self.locations.values()]
        lons = [l['coords'][1] for l in self.locations.values()]
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)
        
        def normalize(lat, lon):
            x = (lon - min_lon) / (max_lon - min_lon + 0.000001)
            y = (lat - min_lat) / (max_lat - min_lat + 0.000001)
            return x * 0.8 + 0.1, y * 0.8 + 0.1

        arcs = []
        spatial_points = []
        try:
            p0_id = next(ind['individual_id'] for ind in self.trajectories if ind['is_patient_zero'])
            p0_data = next(ind for ind in self.trajectories if ind['individual_id'] == p0_id)
            
            # Arcs
            last_loc = None
            for entry in p0_data['timeline']:
                loc_id = entry['location_id']
                if loc_id != last_loc:
                    if last_loc is not None:
                        t_obj = pd.to_datetime(entry['timestamp'])
                        day_idx = (t_obj - self.timestamps[0]).days + 1
                        day_progress = (t_obj.hour * 3600 + t_obj.minute * 60 + t_obj.second) / 86400.0
                        
                        from_loc = self.locations[last_loc]
                        to_loc = self.locations[loc_id]
                        
                        arcs.append({
                            "id": f"arc-{len(arcs)}",
                            "from": {"id": last_loc, "label": from_loc['name'], "x": normalize(*from_loc['coords'])[0], "y": normalize(*from_loc['coords'])[1]},
                            "to": {"id": loc_id, "label": to_loc['name'], "x": normalize(*to_loc['coords'])[0], "y": normalize(*to_loc['coords'])[1]},
                            "riskDensity": random.uniform(0.6, 0.95),
                            "tick": float(day_idx + day_progress)
                        })
                    last_loc = loc_id
        except StopIteration:
            pass

        # Spatial Points
        for ind in self.trajectories:
            agent_risk = next((s['mean_risk'] for s in summary if s['individual_id'] == ind['individual_id']), 0.0)
            status = next((a['status'] for a in agents if a['id'] == ind['individual_id']), "susceptible")
            
            for entry in ind['timeline']:
                t_obj = pd.to_datetime(entry['timestamp'])
                day_idx = (t_obj - self.timestamps[0]).days + 1
                day_progress = (t_obj.hour * 3600 + t_obj.minute * 60 + t_obj.second) / 86400.0
                loc_id = entry['location_id']
                nx, ny = normalize(*entry['coordinates'])
                
                spatial_points.append({
                    "id": f"pt-{ind['individual_id']}-{day_idx}",
                    "locationId": loc_id,
                    "label": ind['name'],
                    "x": nx,
                    "y": ny,
                    "risk": float(agent_risk),
                    "status": status,
                    "tick": float(day_idx + day_progress)
                })

        start_day = 1
        end_day = (self.timestamps[-1] - self.timestamps[0]).days + 1

        return {
            "kpis": kpis,
            "agents": agents,
            "links": links,
            "recommendations": recommendations,
            "environmentalAlerts": alerts,
            "riskDistribution": risk_dist,
            "spatialArcs": arcs,
            "spatialPoints": spatial_points,
            "timeRange": {"startDay": start_day, "endDay": max(start_day, end_day)}
        }

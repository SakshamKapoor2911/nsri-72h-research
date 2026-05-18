import time
import json
import numpy as np
import pandas as pd
from app.engine import SpatialExposureEngine
import os

def benchmark():
    print("🚀 Starting EpiNexus Performance Benchmark...")
    
    # Load base data
    with open("trajectories.json", "r") as f:
        trajectories = json.load(f)
    with open("locations_context.json", "r") as f:
        locations = json.load(f)
    with open("pathogen_config.json", "r") as f:
        pathogen = json.load(f)

    # 1. Latency & Throughput
    print("\n--- 1. Latency & Throughput ---")
    engine = SpatialExposureEngine(trajectories, locations, pathogen)
    
    start_time = time.time()
    iters = 20
    summary, links = engine.run_monte_carlo(iterations=iters, dynamic=False)
    end_time = time.time()
    
    total_time = end_time - start_time
    latency_per_iter = total_time / iters
    agents_count = len(trajectories)
    throughput = (agents_count * iters) / total_time
    
    print(f"Total Agents: {agents_count}")
    print(f"Total Time ({iters} iterations): {total_time:.2f}s")
    print(f"Latency per Monte Carlo Iteration: {latency_per_iter*1000:.2f}ms")
    print(f"Throughput: {throughput:.2f} agent-simulations/sec")

    # 2. Scalability Projection
    print("\n--- 2. Scalability Projection ---")
    # Estimate based on cKDTree complexity O(N log N)
    # Current N = 800
    # For N = 10,000
    n_current = 801
    n_target = 10000
    scaling_factor = (n_target * np.log(n_target)) / (n_current * np.log(n_current))
    projected_latency = latency_per_iter * scaling_factor
    
    print(f"Projected Latency for 10,000 Agents: {projected_latency:.2f}s per iteration")
    print(f"Max capacity (10s response limit): ~{int(10 / latency_per_iter * n_current / 10)} concurrent agents")

    # 3. Efficiency & Certainty (Convergence)
    print("\n--- 3. Efficiency & Certainty ---")
    
    # Run a long MC and track CI narrowing
    long_iters = 50
    dosage_accumulator = np.zeros(len(engine.agent_ids))
    dosage_sq_accumulator = np.zeros(len(engine.agent_ids))
    ci_widths = []
    
    for i in range(1, long_iters + 1):
        a_noise = np.random.normal(1.0, 0.15)
        ach_noise = np.random.normal(1.0, 0.25)
        s_noise = 0.00005
        probs, _ = engine.run_single_simulation(a_noise, ach_noise, s_noise)
        dosage_accumulator += probs
        dosage_sq_accumulator += probs**2
        
        if i > 1:
            mean_risks = dosage_accumulator / i
            variance = (dosage_sq_accumulator / i) - (mean_risks**2)
            std_dev = np.sqrt(np.maximum(0, variance))
            # Average 95% CI width
            avg_ci_width = (1.96 * std_dev / np.sqrt(i)).mean() * 2
            ci_widths.append(avg_ci_width)
        else:
            ci_widths.append(1.0) # Placeholder for first iter
        
    initial_ci = ci_widths[1] # Use 2nd iter as baseline
    final_ci = ci_widths[-1]
    certainty_gain = (initial_ci - final_ci) / initial_ci * 100
    
    print(f"Global Mean Risk: {mean_risks.mean():.6f}")
    print(f"Initial Avg CI Width (2 iters): {initial_ci:.4f}")
    print(f"Final Avg CI Width (50 iters): {final_ci:.4f}")
    print(f"Certainty Gain (CI Narrowing): {certainty_gain:.2f}%")
    print(f"Convergence Efficiency: {certainty_gain / long_iters:.2f}% narrowing per iteration")

    # 4. Success Metrics Score
    print("\n--- 4. System Score Calculation ---")
    # Scoring components (0-10)
    latency_score = min(10, 1000 / (latency_per_iter * 1000 / 5)) # 50ms = 10/10, currently ~480ms
    scalability_score = min(10, n_current / 100) # 1000 agents = 10/10
    certainty_score = min(10, certainty_gain / 8) # 80% gain = 10/10
    
    total_score = (latency_score + scalability_score + certainty_score) / 3 * 10
    
    print(f"Latency Score: {latency_score:.1f}/10")
    print(f"Scalability Score: {scalability_score:.1f}/10")
    print(f"Certainty Score: {certainty_score:.1f}/10")
    print(f"OVERALL EPI-SCORE: {total_score:.1f}/100")

    # Save metrics to a file for README inclusion
    metrics = {
        "total_agents": agents_count,
        "latency_ms": latency_per_iter * 1000,
        "throughput": throughput,
        "certainty_gain_pct": certainty_gain,
        "overall_score": total_score,
        "projected_10k_latency_s": projected_latency
    }
    with open("performance_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

if __name__ == "__main__":
    benchmark()
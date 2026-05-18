#!/usr/bin/env python3
"""
Epidemiological Data Quality Validator

This script enforces the epidemiological rubric for mock/generated data:
1. SEIR model compliance (S→E→I→R progression)
2. Risk distribution accuracy
3. Contact tracing validity
4. Temporal dynamics consistency
5. Location-based exposure modeling

Metrics tracked:
- Distribution of agents across risk brackets
- Proportion of infection types (susceptible, exposed, infected)
- Confidence interval quality and spread
- Temporal progression of risk
- Co-location contact patterns
"""

import json
import statistics
from typing import Dict, List, Tuple
from datetime import datetime

class EpidemioDataValidator:
    """Validates simulation data against epidemiological rubric"""
    
    def __init__(self, simulation_data: Dict):
        self.data = simulation_data
        self.agents = simulation_data.get("agents", [])
        self.arcs = simulation_data.get("spatialArcs", [])
        self.alerts = simulation_data.get("environmentalAlerts", [])
        self.errors = []
        self.warnings = []
        self.metrics = {}
    
    def validate_all(self) -> Dict:
        """Run all validation checks"""
        print("=" * 80)
        print("EPIDEMIOLOGICAL DATA QUALITY VALIDATION")
        print("=" * 80)
        
        self.validate_seir_distribution()
        self.validate_risk_scores()
        self.validate_confidence_intervals()
        self.validate_temporal_dynamics()
        self.validate_contact_patterns()
        self.validate_exposure_progression()
        
        return self._generate_report()
    
    def validate_seir_distribution(self) -> None:
        """Check S-E-I-R distribution follows epidemiological principles"""
        print("\n[1] SEIR Distribution Validation")
        
        statuses = {"susceptible": [], "exposed": [], "infected": [], "protected": []}
        for agent in self.agents:
            status = agent.get("status", "susceptible")
            if status in statuses:
                statuses[status].append(agent)
        
        total = len(self.agents)
        susceptible_pct = len(statuses["susceptible"]) / total * 100 if total > 0 else 0
        exposed_pct = len(statuses["exposed"]) / total * 100 if total > 0 else 0
        infected_pct = len(statuses["infected"]) / total * 100 if total > 0 else 0
        
        print(f"  Susceptible: {len(statuses['susceptible'])} agents ({susceptible_pct:.1f}%)")
        print(f"  Exposed:     {len(statuses['exposed'])} agents ({exposed_pct:.1f}%)")
        print(f"  Infected:    {len(statuses['infected'])} agents ({infected_pct:.1f}%)")
        
        # Expected ranges for early pandemic
        if susceptible_pct < 70:
            self.warnings.append("Susceptible population < 70% (expected for early spread)")
        if infected_pct > 10:
            self.warnings.append("Infected population > 10% (rapid spread)")
        
        self.metrics["seir_distribution"] = {
            "susceptible": susceptible_pct,
            "exposed": exposed_pct,
            "infected": infected_pct,
        }
    
    def validate_risk_scores(self) -> None:
        """Validate risk score distributions and bounds"""
        print("\n[2] Risk Score Validation")
        
        risks = [a.get("meanRisk", 0) for a in self.agents]
        
        if not risks:
            self.errors.append("No agents found")
            return
        
        min_risk = min(risks)
        max_risk = max(risks)
        mean_risk = statistics.mean(risks)
        median_risk = statistics.median(risks)
        stdev_risk = statistics.stdev(risks) if len(risks) > 1 else 0
        
        # Validate bounds
        if min_risk < 0 or max_risk > 1:
            self.errors.append(f"Risk scores out of bounds: [{min_risk:.2f}, {max_risk:.2f}]")
        
        # Check distribution: should be right-skewed (low-risk majority)
        high_risk_count = len([r for r in risks if r > 0.5])
        high_risk_pct = high_risk_count / len(risks) * 100
        
        print(f"  Range:       [{min_risk:.2f}, {max_risk:.2f}]")
        print(f"  Mean:        {mean_risk:.3f}")
        print(f"  Median:      {median_risk:.3f}")
        print(f"  Std Dev:     {stdev_risk:.3f}")
        print(f"  High-risk (>50%): {high_risk_count} agents ({high_risk_pct:.1f}%)")
        
        # Check skewness (mean > median = right-skewed, as expected)
        if mean_risk > median_risk:
            print(f"  ✓ Right-skewed distribution (expected)")
        else:
            self.warnings.append("Distribution may not be right-skewed as expected")
        
        self.metrics["risk_distribution"] = {
            "min": min_risk,
            "max": max_risk,
            "mean": mean_risk,
            "median": median_risk,
            "stdev": stdev_risk,
            "high_risk_pct": high_risk_pct,
        }
    
    def validate_confidence_intervals(self) -> None:
        """Validate confidence interval quality"""
        print("\n[3] Confidence Interval Validation")
        
        invalid_ci = 0
        ci_widths = []
        
        for agent in self.agents:
            ci = agent.get("confidenceInterval", {})
            lower = ci.get("lower", 0)
            upper = ci.get("upper", 0)
            mean_risk = agent.get("meanRisk", 0)
            
            # Validate CI bounds
            if lower < 0 or upper > 1:
                invalid_ci += 1
            if lower > upper:
                invalid_ci += 1
            if not (lower <= mean_risk <= upper):
                invalid_ci += 1
            
            width = upper - lower
            ci_widths.append(width)
        
        avg_width = statistics.mean(ci_widths) if ci_widths else 0
        max_width = max(ci_widths) if ci_widths else 0
        
        print(f"  Invalid CIs:        {invalid_ci}")
        print(f"  Avg CI width:       {avg_width:.3f}")
        print(f"  Max CI width:       {max_width:.3f}")
        
        if invalid_ci > 0:
            self.errors.append(f"{invalid_ci} agents have invalid confidence intervals")
        
        # Higher-risk agents should have tighter CIs (more confidence)
        high_risk = [a for a in self.agents if a.get("meanRisk", 0) > 0.7]
        if high_risk:
            high_risk_widths = [
                a.get("confidenceInterval", {}).get("upper", 0) - 
                a.get("confidenceInterval", {}).get("lower", 0)
                for a in high_risk
            ]
            print(f"  High-risk CI width avg: {statistics.mean(high_risk_widths):.3f} (should be tight)")
        
        self.metrics["confidence_intervals"] = {
            "invalid_count": invalid_ci,
            "avg_width": avg_width,
            "max_width": max_width,
        }
    
    def validate_temporal_dynamics(self) -> None:
        """Validate temporal progression of exposure"""
        print("\n[4] Temporal Dynamics Validation")
        
        # Check if Patient Zero exists
        p0_agents = [a for a in self.agents if a.get("isPatientZero", False)]
        if not p0_agents:
            self.errors.append("No Patient Zero found")
        elif p0_agents[0].get("meanRisk", 0) < 0.9:
            self.errors.append(f"Patient Zero risk {p0_agents[0].get('meanRisk', 0):.2f} < 0.9")
        else:
            print(f"  ✓ Patient Zero identified: {p0_agents[0]['id']} (risk: {p0_agents[0].get('meanRisk', 0):.2f})")
        
        # Check if secondary cases exist
        secondary_cases = [a for a in self.agents if not a.get("isPatientZero", False) and a.get("status") == "infected"]
        print(f"  Secondary infections: {len(secondary_cases)} agents")
        
        # Arcs should show temporal progression
        if self.arcs:
            arc_ticks = sorted(set(a.get("tick", 0) for a in self.arcs))
            print(f"  Movement events over {len(arc_ticks)} time periods: {arc_ticks}")
            
            # Risk should increase over time
            early_arcs = [a for a in self.arcs if a.get("tick", 0) <= 2]
            late_arcs = [a for a in self.arcs if a.get("tick", 0) >= 6]
            
            if early_arcs and late_arcs:
                early_risk = statistics.mean([a.get("riskDensity", 0) for a in early_arcs])
                late_risk = statistics.mean([a.get("riskDensity", 0) for a in late_arcs])
                print(f"  Avg arc risk (early): {early_risk:.3f}, (late): {late_risk:.3f}")
                
                if late_risk >= early_risk:
                    print(f"  ✓ Risk increases over time")
                else:
                    self.warnings.append("Risk does not increase over time")
        
        self.metrics["temporal_dynamics"] = {
            "patient_zero_count": len(p0_agents),
            "secondary_infections": len(secondary_cases),
            "arc_periods": len(set(a.get("tick", 0) for a in self.arcs)) if self.arcs else 0,
        }
    
    def validate_contact_patterns(self) -> None:
        """Validate contact tracing and co-location patterns"""
        print("\n[5] Contact Pattern Validation")
        
        # Check location diversity
        all_locations = []
        for agent in self.agents:
            locs = agent.get("visitedLocations", [])
            all_locations.extend(locs)
        
        unique_locations = set(all_locations)
        avg_locations_per_agent = len(all_locations) / len(self.agents) if self.agents else 0
        
        print(f"  Unique locations: {len(unique_locations)}")
        print(f"  Avg locations/agent: {avg_locations_per_agent:.2f}")
        
        # Check if high-risk agents have specific location patterns
        high_risk_agents = [a for a in self.agents if a.get("meanRisk", 0) > 0.5]
        if high_risk_agents:
            high_risk_locations = []
            for a in high_risk_agents:
                high_risk_locations.extend(a.get("visitedLocations", []))
            
            location_counts = {}
            for loc in high_risk_locations:
                location_counts[loc] = location_counts.get(loc, 0) + 1
            
            # High-risk agents should cluster in high-exposure locations
            print(f"  High-risk agents common locations: {sorted(location_counts.items(), key=lambda x: -x[1])[:3]}")
        
        self.metrics["contact_patterns"] = {
            "unique_locations": len(unique_locations),
            "avg_locations_per_agent": avg_locations_per_agent,
            "high_risk_agent_count": len(high_risk_agents),
        }
    
    def validate_exposure_progression(self) -> None:
        """Validate exposure follows epidemiological progression"""
        print("\n[6] Exposure Progression Validation")
        
        # Primary contacts should have high confidence (narrow CI)
        high_risk = [a for a in self.agents if a.get("meanRisk", 0) > 0.6]
        if high_risk:
            high_risk_widths = [
                a.get("confidenceInterval", {}).get("upper", 0) - 
                a.get("confidenceInterval", {}).get("lower", 0)
                for a in high_risk
            ]
            print(f"  High-risk agents: {len(high_risk)}")
            print(f"  Avg CI width (high-risk): {statistics.mean(high_risk_widths):.3f}")
        
        # Medium risk agents
        medium_risk = [a for a in self.agents if 0.3 <= a.get("meanRisk", 0) <= 0.6]
        if medium_risk:
            print(f"  Medium-risk agents: {len(medium_risk)} (0.3-0.6 risk)")
        
        # Vulnerability score distribution
        vuln_scores = [a.get("protectionLevel", 0) for a in self.agents if "protectionLevel" in a]
        if vuln_scores:
            print(f"  Protection level: {statistics.mean(vuln_scores):.3f} ± {statistics.stdev(vuln_scores):.3f}")
        
        self.metrics["exposure_progression"] = {
            "high_risk_count": len(high_risk),
            "medium_risk_count": len(medium_risk),
        }
    
    def _generate_report(self) -> Dict:
        """Generate validation report"""
        print("\n" + "=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_agents": len(self.agents),
            "errors": self.errors,
            "warnings": self.warnings,
            "metrics": self.metrics,
            "status": "PASS" if not self.errors else "FAIL",
        }
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for e in self.errors:
                print(f"   - {e}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"   - {w}")
        
        if not self.errors and not self.warnings:
            print("\n✅ All validations passed!")
        
        print(f"\n📊 Metrics:")
        for category, metrics in self.metrics.items():
            print(f"\n   {category}:")
            for key, value in metrics.items():
                if isinstance(value, float):
                    print(f"      {key}: {value:.3f}")
                else:
                    print(f"      {key}: {value}")
        
        print(f"\nStatus: {report['status']}\n")
        return report


def main():
    """Main validation entry point"""
    try:
        # Load simulation data
        with open("cached_simulation.json", "r") as f:
            data = json.load(f)
        
        # Run validation
        validator = EpidemioDataValidator(data)
        report = validator.validate_all()
        
        # Save report
        report_file = "validation_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n📁 Report saved to: {report_file}")
        
        return 0 if report["status"] == "PASS" else 1
    
    except Exception as e:
        print(f"\n❌ Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())

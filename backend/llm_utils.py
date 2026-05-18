import os
import requests
import json
import re
from dotenv import load_dotenv
from typing import List, Dict, Optional

load_dotenv()

GROQ_API_KEY = os.getenv("LLM_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Better for complex reasoning

def _call_groq_api(prompt: str, temperature: float = 0.7) -> Optional[str]:
    """
    Generic Groq API caller with retry logic and error handling.
    """
    if not GROQ_API_KEY:
        print("⚠️  LLM_API_KEY not configured. Using fallback data.")
        return None
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": 2048
    }
    
    try:
        print(f"📡 Calling Groq API ({GROQ_MODEL})...")
        response = requests.post(GROQ_URL, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            content = response.json()['choices'][0]['message']['content']
            print("✅ Groq API response received")
            return content
        else:
            print(f"❌ Groq API Error {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return None

def get_realistic_personas(count: int = 20) -> Optional[List[Dict]]:
    """
    Fetches realistic agent personas from Groq LLM.
    Covers diverse occupations, health profiles, and vulnerability scores.
    
    Returns: List of dictionaries with name, occupation, routine, health_profile, vulnerability_score
    """
    prompt = f"""Generate {count} unique, realistic personas for a university campus during a disease outbreak.
    
    Diversity requirements:
    - Include various occupations: students, faculty, staff, security, healthcare workers
    - Mix ages and backgrounds
    - Include various health conditions and vulnerabilities
    - Include both high-risk and low-risk individuals
    
    For each persona, provide:
    - name: realistic full name
    - occupation: job title/role
    - routine: brief daily movement pattern (2-3 sentences)
    - health_profile: brief health status (e.g., "Healthy", "Asthmatic", "Immunocompromised")
    - vulnerability_score: float 0.1-0.9 (higher = more vulnerable)
    - age: approximate age range
    
    Return ONLY valid JSON array with no additional text."""
    
    response = _call_groq_api(prompt, temperature=0.8)
    if not response:
        return None
    
    try:
        # Extract JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            personas = json.loads(json_match.group(0))
            if isinstance(personas, list) and len(personas) > 0:
                print(f"✨ Generated {len(personas)} personas via Groq")
                return personas
    except (json.JSONDecodeError, AttributeError) as e:
        print(f"⚠️  Failed to parse Groq response: {e}")
    
    return None

def validate_data_quality(agents_data: List[Dict]) -> Dict:
    """
    Uses LLM to validate generated agent data against epidemiological heuristics.
    
    Returns: validation report with quality metrics and suggestions
    """
    # Sample 10 agents for validation prompt (to keep token count reasonable)
    sample_size = min(10, len(agents_data))
    sample_agents = agents_data[:sample_size]
    
    agents_json = json.dumps(sample_agents, indent=2)
    
    prompt = f"""Analyze these simulated epidemic agents and validate against epidemiological best practices.
    
    Agents:
    {agents_json}
    
    Check for:
    1. Realistic risk score distribution (should be right-skewed: most low-risk, few high-risk)
    2. Confidence intervals are proportionate to risk (high-risk should have tight CI)
    3. Status matches risk level (infected status correlates with high risk)
    4. Reasonable location diversity and visit patterns
    5. Vulnerability scores align with occupation
    
    Provide:
    - quality_score: 0-100
    - issues: list of problems found
    - suggestions: list of improvement recommendations
    
    Return ONLY valid JSON with these fields."""
    
    response = _call_groq_api(prompt, temperature=0.5)
    if not response:
        return {"quality_score": 0, "issues": ["LLM validation unavailable"], "suggestions": []}
    
    try:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            report = json.loads(json_match.group(0))
            print(f"📊 Data quality validation: {report.get('quality_score', 0)}/100")
            return report
    except (json.JSONDecodeError, AttributeError):
        pass
    
    return {"quality_score": 0, "issues": ["Failed to parse validation"], "suggestions": []}

def enhance_location_behaviors(occupations: List[str]) -> Dict[str, Dict]:
    """
    Uses LLM to generate realistic location visitation patterns by occupation.
    
    Returns: Dictionary mapping occupation → {locations, hours, risk_factor}
    """
    occs_str = ", ".join(occupations)
    
    prompt = f"""For a university campus disease simulation, specify realistic location visitation patterns.
    
    Occupations: {occs_str}
    
    For each occupation, provide:
    - primary_locations: top 3 locations visited (ranked by frequency)
    - hours_per_location: typical hours spent
    - peak_hours: when they're most active (morning/afternoon/evening)
    - high_risk_exposure: 0.0-1.0 (how much time in high-risk enclosed spaces)
    
    Include realistic constraints (e.g., faculty don't spend much time in dorms, students avoid admin buildings).
    
    Return ONLY valid JSON mapping each occupation to location patterns."""
    
    response = _call_groq_api(prompt, temperature=0.6)
    if not response:
        return {}
    
    try:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            patterns = json.loads(json_match.group(0))
            print(f"🏢 Generated location behavior patterns for {len(patterns)} occupations")
            return patterns
    except (json.JSONDecodeError, AttributeError):
        pass
    
    return {}

def generate_health_profiles(count: int = 100) -> List[Dict]:
    """
    Generate diverse health profiles for the population.
    Includes pre-existing conditions, ages, risk factors.
    """
    prompt = f"""Generate {count} diverse health profiles for a university campus population.
    
    Include variety in:
    - Age: students (18-25), faculty (30-60), staff (25-55), visitors (any age)
    - Health conditions: none, asthma, diabetes, obesity, immunocompromised, smoker, etc.
    - Activity level: sedentary, moderate, athletic
    - Vaccinations: fully vaccinated, partially, unvaccinated
    
    For each profile provide:
    - age: integer
    - conditions: list of health conditions (empty if none)
    - activity_level: "low", "moderate", "high"
    - vaccination_status: "full", "partial", "none"
    - vulnerability_multiplier: 0.5-2.0 for risk calculation
    
    Return ONLY valid JSON array."""
    
    response = _call_groq_api(prompt, temperature=0.8)
    if not response:
        return []
    
    try:
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            profiles = json.loads(json_match.group(0))
            print(f"🏥 Generated {len(profiles)} health profiles")
            return profiles
    except (json.JSONDecodeError, AttributeError):
        pass
    
    return []

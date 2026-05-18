import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("LLM_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def get_realistic_personas(count=5):
    """
    Fetches realistic agent personas from Groq LLM.
    Returns a list of dictionaries with name, occupation, routine_description, and health_profile.
    """
    if not GROQ_API_KEY:
        print("Warning: LLM_API_KEY not found. Using fallback personas.")
        return None

    prompt = f"""
    Generate {count} unique and diverse realistic personas for a university campus simulation during an outbreak.
    Each persona should have:
    - name: Full name
    - occupation: (e.g., Undergraduate Student, Graduate Researcher, Professor, Janitor, Cafeteria Staff, Campus Security)
    - routine: A short description of their daily movement (e.g., "Spends mornings in library, afternoons in gym, evenings in dorm")
    - health_profile: A short description of their vulnerability (e.g., "Immunocompromised", "Healthy athlete", "Chronic smoker")
    - vulnerability_score: A float between 0.1 and 0.9 based on health_profile (lower is healthier).
    
    Return ONLY a JSON list of objects.
    """

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=data, timeout=30)
        if response.status_code != 200:
            print(f"Groq API Error {response.status_code}: {response.text}")
            return None
        
        content = response.json()['choices'][0]['message']['content']
        # Extract JSON using regex
        import re
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        else:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
        
        res_json = json.loads(content)
        if isinstance(res_json, dict) and 'personas' in res_json:
            return res_json['personas']
        if isinstance(res_json, list):
            return res_json
        return list(res_json.values())[0] if isinstance(res_json, dict) else None
    except Exception as e:
        print(f"LLM Error: {e}")
        return None

import requests
import os

USE_LOCAL_LLM = True  # 🔁 TURN OFF DURING DEPLOYMENT
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"


import subprocess

def generate_question(role: str, topic: str, difficulty: str):
    prompt = f"""
You are a professional technical interviewer.

Generate ONE interview question for a {role} role.

Topic: {topic}
Difficulty: {difficulty}

Rules:
- Be concise
- No multiple questions
- No explanations
- Just the question
"""

    result = subprocess.run(
        ["ollama", "run", "llama3"],
        input=prompt,
        text=True,
        capture_output=True
    )

    return result.stdout.strip()



def evaluate_answer(question: str, answer: str):
    if not USE_LOCAL_LLM:
        return {
            "scores": {
                "relevance": 6,
                "clarity": 6,
                "depth": 5
            },
            "feedback": "Try to structure your answer with a clear example and measurable impact."
        }

    prompt = f"""
You are an interview coach.

Question:
{question}

Candidate Answer:
{answer}

Evaluate the answer on:
- Relevance (0–10)
- Clarity (0–10)
- Depth (0–10)

Return STRICT JSON like:
{{
  "scores": {{
    "relevance": 0,
    "clarity": 0,
    "depth": 0
  }},
  "feedback": "short advice"
}}
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        },
        timeout=90
    )

    return response.json()["response"]

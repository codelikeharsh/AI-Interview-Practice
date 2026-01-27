import subprocess
import json
import re

def evaluate_answer(question: str, answer: str):
    prompt = f"""
You are a strict technical interviewer.

Question:
{question}

Candidate Answer:
{answer}

Return ONLY valid JSON in this format:
{{
  "scores": {{
    "relevance": 0-10,
    "clarity": 0-10,
    "depth": 0-10,
    "confidence": 0-10
  }},
  "feedback": "short, honest feedback"
}}

Rules:
- If the answer is nonsense or irrelevant, give low scores.
- Do not add explanations.
"""

    result = subprocess.run(
        ["ollama", "run", "llama3"],
        input=prompt,
        text=True,
        capture_output=True,
    )

    raw = result.stdout.strip()

    # 🔍 Extract JSON block safely
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return {
            "scores": {
                "relevance": 2,
                "clarity": 2,
                "depth": 1,
                "confidence": 2,
            },
            "feedback": "Answer was unclear or did not address the question."
        }

    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {
            "scores": {
                "relevance": 2,
                "clarity": 2,
                "depth": 1,
                "confidence": 2,
            },
            "feedback": "Answer was unclear or not well structured."
        }

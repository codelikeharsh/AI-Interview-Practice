import os
import json
import re
from google import genai

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = None

def _get_client():
    """
    Gemini client. Reads GEMINI_API_KEY from environment automatically.
    """
    global _client
    if _client is None:
        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your environment or .env file.")
        _client = genai.Client()
    return _client


def _fallback_feedback():
    return {
        "scores": {
            "relevance": 2,
            "clarity": 2,
            "depth": 1,
            "confidence": 2,
        },
        "feedback": "Answer was unclear or did not address the question."
    }


def evaluate_answer(question: str, answer: str):
    prompt = f"""
You are a strict technical interviewer.

Question:
{question}

Candidate Answer:
{answer}

Return ONLY valid JSON in this exact format:
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
- Do not add markdown.
- Do not add explanations outside JSON.
"""

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        raw = (response.text or "").strip()
    except Exception as e:
        print("❌ Gemini evaluation exception:", e)
        return _fallback_feedback()

    # Extract JSON block safely
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return _fallback_feedback()

    try:
        data = json.loads(match.group())
        scores = data.get("scores", {})

        # Safety-normalize expected fields
        for key in ["relevance", "clarity", "depth", "confidence"]:
            value = scores.get(key, 0)
            scores[key] = max(0, min(10, float(value)))

        return {
            "scores": scores,
            "feedback": str(data.get("feedback", "No feedback generated."))
        }
    except Exception:
        return _fallback_feedback()

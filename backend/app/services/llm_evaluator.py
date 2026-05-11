import json
import re
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"
client = genai.Client(api_key=API_KEY) if API_KEY else None


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
    "relevance": 0,
    "clarity": 0,
    "depth": 0,
    "confidence": 0
  }},
  "feedback": "short honest feedback"
}}

Rules:
- JSON only
- No markdown
- No explanation outside JSON
- Score from 0 to 10
- Low score for irrelevant answers
"""

    try:
        if not client:
            print("❌ GEMINI_API_KEY not configured")
            return {
                "scores": {
                    "relevance": 2,
                    "clarity": 2,
                    "depth": 1,
                    "confidence": 2,
                },
                "feedback": "Evaluation failed."
            }

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        raw = response.text.strip()

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

        return json.loads(match.group())

    except Exception as e:
        print("❌ Gemini evaluation error:", e)

        return {
            "scores": {
                "relevance": 2,
                "clarity": 2,
                "depth": 1,
                "confidence": 2,
            },
            "feedback": "Evaluation failed."
        }
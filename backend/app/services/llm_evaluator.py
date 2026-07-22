import json
import logging
import re
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"
client = Groq(api_key=API_KEY) if API_KEY else None


def _errored(reason: str):
    """
    Returned when we genuinely couldn't score an answer (no API key,
    API failure, unparsable response). Callers must NOT fold this into
    a score average - it should be excluded and surfaced as
    "could not be scored", not counted as a real (terrible) answer.
    """
    return {
        "errored": True,
        "scores": None,
        "feedback": reason,
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

    if not client:
        logger.warning("GROQ_API_KEY not configured; answer could not be scored")
        return _errored("Evaluation unavailable (no API key configured).")

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = (response.choices[0].message.content or "").strip()
        match = re.search(r"\{[\s\S]*\}", raw)

        if not match:
            logger.error("Groq evaluation response had no parsable JSON")
            return _errored("Evaluation service returned an unparsable response.")

        parsed = json.loads(match.group())
        parsed["errored"] = False
        return parsed

    except Exception as e:
        logger.error("Groq evaluation error: %s", e)
        return _errored("Evaluation service is temporarily unavailable.")

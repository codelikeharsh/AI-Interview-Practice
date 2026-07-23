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


LEVEL_CONTEXT = {
    "fresher": "The candidate is a fresher / entry-level candidate - calibrate expectations accordingly and don't penalize them for lacking senior-level depth.",
    "intermediate": "The candidate has a few years of professional experience - expect solid fundamentals and some real-world exposure.",
    "experienced": "The candidate is a senior/experienced professional - hold them to a high bar on depth, trade-offs, and precision.",
}


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
        "strengths": [],
        "improvements": [],
    }


def evaluate_answer(question: str, answer: str, role: str = "", difficulty: str = "", level: str = ""):
    level_note = LEVEL_CONTEXT.get(level, "")

    prompt = f"""
You are an expert, honest technical interviewer evaluating a candidate's
spoken answer in a real {role or "software"} interview. This question was
asked at {difficulty or "medium"} difficulty. {level_note}

Question asked:
{question}

Candidate's answer (transcribed from speech - forgive minor
transcription/grammar artifacts and evaluate the substance, not the
transcription quality):
{answer}

Score the answer from 0-10 on each dimension, calibrated to what's
reasonable for this candidate's level and this question's difficulty:
- relevance: does it actually answer what was asked
- clarity: is it well-structured and easy to follow
- depth: technical substance, correctness, and specificity - not just
  confident-sounding
- confidence: how sure and fluent the delivery reads, independent of
  whether the content is correct

Return ONLY valid JSON in this exact format, no markdown, no text outside
the JSON:
{{
  "scores": {{
    "relevance": 0,
    "clarity": 0,
    "depth": 0,
    "confidence": 0
  }},
  "strengths": ["short specific point about this answer"],
  "improvements": ["short specific, actionable point about this answer"],
  "feedback": "one or two sentence honest summary"
}}

Rules:
- JSON only, no explanation outside it
- Score from 0 to 10
- 1 to 3 bullet points each for strengths/improvements - specific to THIS
  answer, not generic interview advice
- If the answer is empty, off-topic, or nonsense, all scores should be low
  and improvements should say so plainly - strengths can be an empty list
- Be honest and direct, not falsely encouraging
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
        parsed.setdefault("strengths", [])
        parsed.setdefault("improvements", [])
        return parsed

    except Exception as e:
        logger.error("Groq evaluation error: %s", e)
        return _errored("Evaluation service is temporarily unavailable.")

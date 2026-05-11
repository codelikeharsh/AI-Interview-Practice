import os
import re
from google import genai

# Fast model for live demo. You can change this later if needed.
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = None

def _get_client():
    """
    Creates Gemini client lazily so app startup does not crash before env vars load.
    The Google GenAI SDK automatically reads GEMINI_API_KEY from environment.
    """
    global _client
    if _client is None:
        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your environment or .env file.")
        _client = genai.Client()
    return _client


def _run_llm(prompt: str) -> str:
    try:
        client = _get_client()
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return (response.text or "").strip()

    except Exception as e:
        print("❌ Gemini LLM exception:", e)
        return ""


def _clean_question(text: str) -> str:
    """
    Aggressively clean LLM output to keep ONLY the question.
    """
    if not text:
        return ""

    # Remove common narration phrases
    patterns = [
        r"^here is.*?:",
        r"^this is.*?:",
        r"^thank you.*",
        r"^i will.*",
        r"^note.*",
        r"^let me.*",
    ]

    t = text.strip()
    lowered = t.lower()

    for p in patterns:
        lowered = re.sub(p, "", lowered).strip()

    # Take only the first sentence ending with ?
    match = re.search(r"(.+?\?)", lowered)
    if match:
        return match.group(1).capitalize()

    # Fallback: first line only
    return t.split("\n")[0].strip()


def generate_question(role, topic, difficulty, history=""):
    """
    Generates ONE clean interview question.
    Output MUST be ONLY the question text.
    """

    prompt = f"""
You are an interview question generator.

STRICT RULES:
- Output ONLY ONE interview question
- Output ONLY the question text
- DO NOT add explanations, greetings, or commentary
- DO NOT number the question
- DO NOT mention "interview", "candidate", or "response"
- DO NOT include anything except the question

Role: {role}
Difficulty: {difficulty}
Topic: {topic}

Previous questions (for context, do not repeat):
{history}

Question:
"""

    raw = _run_llm(prompt)
    return _clean_question(raw)

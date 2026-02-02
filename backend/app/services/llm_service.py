import subprocess
import re

MODEL_NAME = "llama3"

def _run_llm(prompt: str) -> str:
    try:
        result = subprocess.run(
            ["ollama", "run", MODEL_NAME, prompt],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            print("❌ LLM error:", result.stderr)
            return ""

        return result.stdout.strip()

    except Exception as e:
        print("❌ LLM exception:", e)
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

    t = text.strip().lower()

    for p in patterns:
        t = re.sub(p, "", t).strip()

    # Take only the first sentence ending with ?
    match = re.search(r"(.+?\?)", t)
    if match:
        return match.group(1).capitalize()

    # Fallback: first line only
    return text.split("\n")[0].strip()


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

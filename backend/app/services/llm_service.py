import re
import os
import random
from google import genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"
client = genai.Client(api_key=API_KEY) if API_KEY else None

def _run_llm(prompt: str) -> str:
    try:
        if not client:
            print("❌ GEMINI_API_KEY not configured")
            return ""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return (response.text or "").strip()

    except Exception as e:
        print("❌ Gemini question generation error:", e)
        return ""


def _clean_question(text: str) -> str:
    """
    Aggressively clean LLM output to keep ONLY the question.
    """
    if not text:
        return ""

    t = text.strip()
    t = t.replace("```", "").strip()
    t = re.sub(r"^\s*(question\s*:)\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"^\s*\d+[\).\s-]+", "", t)

    # Take only the first sentence ending with '?'
    match = re.search(r"(.+?\?)", t, flags=re.DOTALL)
    if match:
        q = match.group(1).strip()
        q = re.sub(r"\s+", " ", q)
        return q

    # Fallback: first line only
    line = t.split("\n")[0].strip()
    line = re.sub(r"\s+", " ", line)
    if line and not line.endswith("?"):
        line = f"{line}?"
    return line


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _is_low_quality(question: str, history: str) -> bool:
    q = _normalize(question)
    if not q or len(q.split()) < 8:
        return True
    banned_starts = [
        "explain ",
        "what are the most common mistakes",
        "can you walk me through the fundamentals",
        "how would you explain ",
    ]
    if any(q.startswith(p) for p in banned_starts):
        return True
    if "key concept related to" in q:
        return True
    # reject near-duplicate phrasing by removing topic-ish words and comparing stem shape
    stem = re.sub(r"\b(dsa|oop|oops|react|javascript|python|sql|system design|api|apis|database|dbms|nlp|cnn|transformers)\b", "", q)
    stem = re.sub(r"[^a-z0-9\s]", "", stem)
    hist = _normalize(history)
    return stem and stem in hist


def _topic_templates(topic: str, role: str):
    t = _normalize(topic)
    r = (role or "software engineer").strip()
    if "dsa" in t or "data structure" in t or "algorithm" in t:
        return [
            "You are given 10 million integers with strict memory limits; which data structure would you choose for fast duplicate detection, and why?",
            "How would you optimize a solution that currently runs in O(n^2) for pair-sum queries on large arrays?",
            "In an interview, how would you decide between a heap, balanced BST, and hash map for top-k frequent items?",
        ]
    if "oop" in t or "object oriented" in t:
        return [
            "Design a notification module using OOP principles that supports email, SMS, and push without modifying existing classes.",
            "Where would you apply composition over inheritance in a real codebase, and what bug risk does that prevent?",
            "How would you refactor a God class in production while preserving behavior and minimizing regression risk?",
        ]
    if "react" in t or "frontend" in t or "javascript" in t:
        return [
            "A React page rerenders excessively after API responses; how would you identify the cause and reduce unnecessary renders?",
            "How would you structure state for a complex form wizard so validation stays predictable and performance remains smooth?",
            "When would you prefer server state tools over local component state in a production React app?",
        ]
    if "api" in t or "backend" in t:
        return [
            "How would you design an idempotent payment API endpoint that is safe against retries and network timeouts?",
            "Your API latency spikes after a new release; what metrics and debugging steps would you use first?",
            "How would you version APIs while keeping backward compatibility for existing mobile clients?",
        ]
    if "sql" in t or "database" in t or "dbms" in t:
        return [
            "A query on a 50 million row table is slow; how would you diagnose whether the issue is indexing, query shape, or schema design?",
            "How do you choose between normalization and denormalization for a read-heavy production system?",
            "How would you design transactions for an order workflow to avoid race conditions and double updates?",
        ]
    return [
        f"For a {r} role, describe a production scenario where {topic} is critical and explain the trade-offs in your technical approach.",
        f"When working on {topic}, how do you decide between a quick patch and a scalable long-term design?",
        f"Describe a difficult bug around {topic} and walk through how you would isolate root cause under time pressure.",
    ]


def _fallback_question(role: str, topic: str, difficulty: str, history: str) -> str:
    bank = _topic_templates(topic, role)
    unseen = [q for q in bank if _normalize(q) not in _normalize(history)]
    if unseen:
        return random.choice(unseen)
    # If all were seen, mutate with difficulty focus to avoid same framing.
    suffix = {
        "easy": " Keep your explanation simple and practical.",
        "medium": " Include trade-offs and implementation details.",
        "hard": " Cover scale, failure modes, and performance bottlenecks.",
    }.get(difficulty, "")
    return random.choice(bank) + suffix


def generate_question(role, topic, difficulty, history=""):
    """
    Generates ONE clean interview question.
    Output MUST be ONLY the question text.
    """

    prompt = f"""
You are a senior interviewer running a real technical interview.

STRICT RULES:
- Output ONLY ONE question
- Output ONLY the question text
- DO NOT add explanations, greetings, or commentary
- DO NOT number the question
- Ask a realistic, specific, human-sounding question (not generic textbook phrasing)
- Prefer scenario-based, debugging, design, or trade-off questions
- Keep length between 18 and 35 words
- Avoid starting with: "Explain a key concept related to"
- Avoid repeating intent from previous questions
- Do not use generic templates like "common mistakes beginners make"
- Anchor question to the role and topic with practical technical detail

Role: {role}
Difficulty: {difficulty}
Topic: {topic}

Previous questions (for context, do not repeat):
{history}

Question:
"""
    for _ in range(3):
        raw = _run_llm(prompt)
        cleaned = _clean_question(raw)
        if not _is_low_quality(cleaned, history):
            return cleaned
    return _fallback_question(role, topic, difficulty, history)

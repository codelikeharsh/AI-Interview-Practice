import io
import json
import logging
import os
import re

from docx import Document
from pypdf import PdfReader
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "openai/gpt-oss-120b"
client = Groq(api_key=API_KEY) if API_KEY else None

MAX_RESUME_TEXT_CHARS = 6000

VALID_LEVELS = {"fresher", "intermediate", "experienced"}


def extract_resume_text(filename: str, content: bytes) -> str:
    """
    Extracts plain text from an uploaded resume file. Supports PDF, DOCX,
    and plain text. Raises ValueError for unsupported types or files that
    fail to parse (corrupted/password-protected/etc).
    """
    ext = (filename or "").rsplit(".", 1)[-1].lower()

    try:
        if ext == "pdf":
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
        elif ext == "docx":
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
        elif ext == "txt":
            text = content.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file type: .{ext}")
    except ValueError:
        raise
    except Exception as e:
        logger.error("Resume text extraction failed: %s", e)
        raise ValueError("Could not read that file - it may be corrupted or password-protected.")

    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise ValueError("No readable text found in that file.")

    return text[:MAX_RESUME_TEXT_CHARS]


def _fallback_profile() -> dict:
    return {
        "name": "",
        "role_title": "Software Engineer",
        "estimated_level": "intermediate",
        "skills": [],
        "experience": [],
        "education": [],
    }


def analyze_resume(raw_text: str) -> dict:
    """
    Turns messy, extracted resume text into a structured profile via one
    Groq call. Raises ValueError if the model's response can't be parsed,
    so the caller can surface a clear error instead of silently returning
    an empty/junk profile.
    """
    if not client:
        logger.warning("GROQ_API_KEY not configured; cannot analyze resume")
        raise ValueError("Resume analysis is currently unavailable.")

    prompt = f"""
You are extracting structured data from a candidate's resume text. The text
below was extracted from a PDF/DOCX and may have minor formatting artifacts -
work around that and focus on the content.

Resume text:
{raw_text}

Return ONLY valid JSON in this exact shape, no markdown, no text outside the
JSON:
{{
  "name": "candidate's full name, or empty string if not found",
  "role_title": "their most recent or clearly implied target job title",
  "estimated_level": "one of: fresher, intermediate, experienced",
  "skills": ["list of specific technical skills/technologies actually mentioned"],
  "experience": [
    {{"title": "role title", "company": "company name", "duration": "e.g. 2022-2024", "highlights": "one sentence summary of what they did"}}
  ],
  "education": [
    {{"degree": "degree name", "institution": "school/university name"}}
  ]
}}

Rules:
- JSON only
- estimated_level: "fresher" for students/new grads/no professional experience,
  "intermediate" for roughly 1-4 years, "experienced" for 5+ years or clearly
  senior titles
- skills should be specific (e.g. "React", "PostgreSQL", "Docker") not vague
  ("programming", "software development")
- If a section genuinely isn't present in the resume, use an empty list/string
- Do not invent details that aren't in the resume text
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (response.choices[0].message.content or "").strip()
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError("no JSON in response")

        profile = json.loads(match.group())
    except Exception as e:
        logger.error("Resume analysis error: %s", e)
        raise ValueError("Couldn't analyze that resume - please try again.")

    profile.setdefault("name", "")
    profile.setdefault("role_title", "Software Engineer")
    profile.setdefault("skills", [])
    profile.setdefault("experience", [])
    profile.setdefault("education", [])
    if profile.get("estimated_level") not in VALID_LEVELS:
        profile["estimated_level"] = "intermediate"

    return profile

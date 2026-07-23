import logging
import os

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "whisper-large-v3-turbo"
client = Groq(api_key=API_KEY) if API_KEY else None


def transcribe_audio(audio_bytes: bytes):
    if not client:
        logger.warning("GROQ_API_KEY not configured; cannot transcribe audio")
        return {"text": "", "duration": 0.0}

    try:
        response = client.audio.transcriptions.create(
            file=("audio.wav", audio_bytes),
            model=MODEL_NAME,
            response_format="verbose_json",
        )

        duration = getattr(response, "duration", None)
        if duration is None:
            segments = getattr(response, "segments", None) or []
            duration = segments[-1]["end"] if segments else 0.0

        return {
            "text": response.text or "",
            "duration": float(duration or 0.0),
        }
    except Exception as e:
        logger.error("Groq transcription error: %s", e)
        return {"text": "", "duration": 0.0}

import logging
import os
import re
import uuid

import edge_tts

logger = logging.getLogger(__name__)

AUDIO_DIR = "generated_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Natural neural voice (Microsoft Edge read-aloud) - free, no API key.
# Full voice list: `edge-tts --list-voices`
VOICE = "en-US-AndrewNeural"


def _sanitize_for_speech(text: str) -> str:
    """
    Strips anything the TTS engine can't/shouldn't speak: code fences,
    backticks, control characters, and symbol runs that would otherwise
    be read out character by character or crash synthesis.
    """
    if not text:
        return ""

    t = text.replace("```", " ").replace("`", " ")
    t = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", t)  # control chars
    t = re.sub(r"[{}<>|~^_*#]+", " ", t)                  # code/markdown symbols
    t = re.sub(r"\s+", " ", t).strip()

    MAX_LEN = 500
    if len(t) > MAX_LEN:
        t = t[:MAX_LEN].rsplit(" ", 1)[0].strip()

    return t


async def generate_tts(text: str) -> str | None:
    """
    Generates TTS audio via Edge-TTS and returns a PUBLIC audio URL.
    """
    clean = _sanitize_for_speech(text)
    if not clean:
        return None

    try:
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        communicate = edge_tts.Communicate(clean, voice=VOICE)
        await communicate.save(filepath)
        return f"/tts/{filename}"
    except Exception as e:
        logger.error("Edge-TTS generation failed: %s", e)
        return None

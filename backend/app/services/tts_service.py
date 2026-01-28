from TTS.api import TTS
import os
import uuid

# Load once (already working for you)
tts = TTS("tts_models/en/vctk/vits", progress_bar=False)

AUDIO_DIR = "generated_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

def generate_tts(text: str) -> str:
    """
    Generates TTS audio and returns a PUBLIC audio URL
    """

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)

    tts.tts_to_file(
        text=text,
        file_path=filepath,
        speaker="p230"
    )

    # IMPORTANT: return URL, not file path
    return f"/tts/{filename}"

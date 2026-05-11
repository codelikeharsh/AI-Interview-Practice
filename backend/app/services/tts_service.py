import os
import uuid

from gtts import gTTS

try:
    from TTS.api import TTS
    coqui_tts = TTS("tts_models/en/vctk/vits", progress_bar=False)
    print("✅ Coqui TTS loaded")
except Exception as e:
    # Coqui is optional; fallback to gTTS for Python 3.12 compatibility.
    print(f"⚠️ Coqui TTS unavailable, using gTTS fallback: {e}")
    coqui_tts = None

AUDIO_DIR = "generated_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

def generate_tts(text: str) -> str:
    """
    Generates TTS audio and returns a PUBLIC audio URL
    """
    if not text or not text.strip():
        return None

    # Prefer local Coqui voice when available.
    if coqui_tts:
        try:
            filename = f"{uuid.uuid4().hex}.wav"
            filepath = os.path.join(AUDIO_DIR, filename)
            coqui_tts.tts_to_file(
                text=text,
                file_path=filepath,
                speaker="p230"
            )
            return f"/tts/{filename}"
        except Exception as e:
            print(f"⚠️ Coqui TTS generation failed, falling back to gTTS: {e}")

    # Network fallback: gTTS generates MP3, still served from /tts.
    try:
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        gTTS(text=text, lang="en").save(filepath)
        return f"/tts/{filename}"
    except Exception as e:
        print(f"❌ gTTS generation failed: {e}")
        return None

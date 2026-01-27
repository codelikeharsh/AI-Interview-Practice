import whisper
import tempfile
import os

model = whisper.load_model("base")

def transcribe_audio(audio_bytes: bytes):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp:
        temp.write(audio_bytes)
        temp_path = temp.name

    try:
        result = model.transcribe(temp_path)
        duration = result.get("segments", [])
        total_duration = 0.0
        if duration:
            total_duration = duration[-1]["end"]

        return {
            "text": result["text"],
            "duration": total_duration
        }
    finally:
        os.remove(temp_path)

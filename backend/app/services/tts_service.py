from TTS.api import TTS
import os

tts = TTS("tts_models/en/vctk/vits", progress_bar=False)

AUDIO_DIR = "generated_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

def generate_voice(text: str):
    path = f"{AUDIO_DIR}/latest.wav"
    tts.tts_to_file(text=text, file_path=path, speaker="p230")
    return path

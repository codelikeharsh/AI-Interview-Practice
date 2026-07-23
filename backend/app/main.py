import os

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.logging_config import setup_logging
from app.routers import auth, interview, questions, resume
from app.ws.interview_ws import interview_ws

load_dotenv()
setup_logging()

app = FastAPI(title="AI Interview Coach API")

# ===============================
# CORS
# ===============================
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# STATIC TTS FILES
# ===============================
app.mount("/tts", StaticFiles(directory="generated_audio"), name="tts")

# ===============================
# WEBSOCKET
# ===============================
@app.websocket("/ws/interview")
async def interview_socket(ws: WebSocket):
    await interview_ws(ws)

# ===============================
# REST ROUTERS
# ===============================
app.include_router(auth.router)
app.include_router(interview.router)
app.include_router(resume.router)
app.include_router(questions.router)

# ===============================
# HEALTH CHECK
# ===============================
@app.get("/health")
def health():
    return {"status": "ok"}

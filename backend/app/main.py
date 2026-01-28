from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # ✅ NEW
from app.routers import interview
from app.ws.interview_ws import interview_ws

app = FastAPI(title="AI Interview Coach API")

# 🔴 MUST COME BEFORE ROUTERS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ NEW: expose generated TTS audio safely
app.mount("/tts", StaticFiles(directory="generated_audio"), name="tts")

@app.websocket("/ws/interview")
async def interview_socket(ws: WebSocket):
    print("🔥 WS ROUTE HIT")
    await interview_ws(ws)

app.include_router(interview.router, prefix="/interview")

@app.get("/health")
def health():
    return {"status": "ok"}

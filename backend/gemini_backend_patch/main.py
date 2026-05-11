from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import interview
from app.ws.interview_ws import interview_ws

app = FastAPI(title="AI Interview Coach API")

# ===============================
# CORS
# ===============================
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

# ===============================
# STATIC TTS FILES
# ===============================
app.mount("/tts", StaticFiles(directory="generated_audio"), name="tts")

# ===============================
# WEBSOCKET
# ===============================
@app.websocket("/ws/interview")
async def interview_socket(ws: WebSocket):
    print("🔥 WS ROUTE HIT")
    await interview_ws(ws)

# ===============================
# REST ROUTERS  ✅ FIX HERE
# ===============================
app.include_router(interview.router)  # ❗ NO PREFIX HERE

# ===============================
# HEALTH CHECK
# ===============================
@app.get("/health")
def health():
    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interview

app = FastAPI(title="AI Interview Coach API")

# 🔴 CORS MUST COME FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # MUST include OPTIONS
    allow_headers=["*"],
)

# ✅ Router added AFTER middleware
app.include_router(interview.router, prefix="/interview")

@app.get("/health")
def health():
    return {"status": "ok"}

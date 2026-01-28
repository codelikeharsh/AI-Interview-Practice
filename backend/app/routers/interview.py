from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import Dict
import os

from app.services.session_store import (
    get_session,
    add_evaluation,
    compute_summary,
)

from app.services.llm_evaluator import evaluate_answer
from app.services.speech_to_text import transcribe_audio
from app.services.speech_confidence import analyze_confidence
from app.services.emotion_detector import analyze_emotion

router = APIRouter()


# ======================================================
# 🎧 TRANSCRIBE (USED BY FRONTEND)
# ======================================================
@router.post("/transcribe")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    audio_bytes = await file.read()

    result = transcribe_audio(audio_bytes)

    confidence = analyze_confidence(
        result["text"],
        result["duration"]
    )

    return {
        "text": result["text"],
        "confidence": confidence,
    }


# ======================================================
# 😐 EMOTION DETECTION (OPTIONAL / FUTURE)
# ======================================================
@router.post("/emotion")
async def detect_emotion(file: UploadFile = File(...)):
    return analyze_emotion(await file.read())


# ======================================================
# 🧠 SAVE EVALUATION (CALLED INTERNALLY / FUTURE)
# ======================================================
@router.post("/evaluate")
def save_evaluation(payload: Dict):
    session_id = payload.get("session_id")
    evaluation = payload.get("evaluation")

    if not session_id or not evaluation:
        raise HTTPException(status_code=400, detail="Invalid payload")

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    add_evaluation(session_id, evaluation)

    return {"status": "saved"}


# ======================================================
# 🏁 INTERVIEW RESULT (USED BY RESULT PAGE)
# ======================================================
@router.get("/result/{session_id}")
def get_interview_result(session_id: str):
    session = get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = compute_summary(session)

    if not summary:
        raise HTTPException(
            status_code=400,
            detail="No evaluation data available"
        )

    return {
        "session_id": session_id,
        "summary": summary
    }

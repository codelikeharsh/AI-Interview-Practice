from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict

from app.services.session_store import (
    get_session,
    add_evaluation,
    compute_summary,
)

from app.services.speech_to_text import transcribe_audio
from app.services.speech_confidence import analyze_confidence
from app.services.emotion_detector import analyze_emotion

router = APIRouter(prefix="/interview", tags=["Interview"])


# ======================================================
# 🎧 TRANSCRIBE
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
# 😐 EMOTION DETECTION
# ======================================================
@router.post("/emotion")
async def detect_emotion(file: UploadFile = File(...)):
    return analyze_emotion(await file.read())


# ======================================================
# 🧠 SAVE EVALUATION (FUTURE USE)
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
# 🏁 INTERVIEW RESULT (LEGACY)
# ======================================================
@router.get("/result/{session_id}")
def get_interview_result(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = compute_summary(session) or _empty_summary()
    return {
        "session_id": session_id,
        "summary": summary
    }


# ======================================================
# 🧾 INTERVIEW SUMMARY (USED BY FRONTEND)
# ======================================================
@router.get("/summary/{session_id}")
def get_interview_summary(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ✅ DO NOT FAIL IF NO EVALUATIONS
    summary = compute_summary(session)
    return summary if summary else _empty_summary()


# ======================================================
# 🧰 DEFAULT SUMMARY (NO EVALS YET)
# ======================================================
def _empty_summary():
    return {
        "overall_score": 0,
        "avg_relevance": 0,
        "avg_clarity": 0,
        "avg_depth": 0,
        "avg_confidence": 0,
        "recommendation": "Not enough data",
        "total_questions": 0,
    }

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.services import session_store
from app.services.rate_limiter import transcribe_limiter

from app.services.speech_to_text import transcribe_audio
from app.services.speech_confidence import analyze_confidence
from app.services.emotion_detector import analyze_emotion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview"])


# ======================================================
# TRANSCRIBE
# ======================================================
@router.post("/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    transcribe_limiter.check(str(current_user.id))

    audio_bytes = await file.read()
    result = await asyncio.to_thread(transcribe_audio, audio_bytes)

    confidence = analyze_confidence(
        result["text"],
        result["duration"]
    )

    return {
        "text": result["text"],
        "confidence": confidence,
    }


# ======================================================
# EMOTION DETECTION
# ======================================================
@router.post("/emotion")
async def detect_emotion(file: UploadFile = File(...)):
    return analyze_emotion(await file.read())


# ======================================================
# INTERVIEW SUMMARY
# ======================================================
@router.get("/summary/{session_id}")
async def get_interview_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await session_store.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    return await session_store.compute_summary(db, session)


# ======================================================
# HISTORY - past interviews for the signed-in user
# ======================================================
@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await session_store.list_user_sessions(db, current_user.id)
    return [
        {
            "id": str(s.id),
            "role": s.role,
            "level": s.level,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "overall_score": s.overall_score,
            "recommendation": s.recommendation,
            "question_count": s.question_count,
        }
        for s in sessions
    ]

from fastapi import APIRouter, UploadFile, File, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict
import os
from fastapi import HTTPException
from app.services.session_store import (
    create_session,
    get_session,
    add_evaluation,
    compute_summary,
)

from app.services.topic_selector import select_topic
from app.services.llm_service import generate_question
from app.services.llm_evaluator import evaluate_answer
from app.services.speech_to_text import transcribe_audio
from app.services.speech_confidence import analyze_confidence
from app.services.emotion_detector import analyze_emotion
from app.services.tts_service import generate_voice  # ✅ NEW

router = APIRouter()


@router.options("/{path:path}")
def options_handler(path: str):
    return Response(status_code=200)


class StartInterviewRequest(BaseModel):
    role: str


class AnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    emotion: Optional[Dict] = None


# ---------------- START INTERVIEW ----------------
@router.post("/start")
def start_interview(payload: StartInterviewRequest):
    session_id = create_session(payload.role)
    session = get_session(session_id)

    topic = select_topic(payload.role, [], 0)
    question = generate_question(payload.role, topic, "easy")

    session["asked_topics"].append(topic)
    session["last_question"] = question  # 👈 IMPORTANT

    audio_path = generate_voice(
        f"Hello. Welcome to your interview. {question}"
    )

    return {
        "session_id": session_id,
        "question": question,
        "audio": "/interview/audio",
    }


# ---------------- ANSWER ----------------
@router.post("/answer")
def answer_interview(payload: AnswerRequest):
    session = get_session(payload.session_id)
    if not session:
        return {"error": "Invalid session"}

    text = payload.answer.lower()

    # 🎧 Detect repeat request
    if any(k in text for k in ["repeat", "say again", "didn't understand"]):
        audio_path = generate_voice(session["last_question"])
        return {
            "repeat": True,
            "audio": "/interview/audio",
        }

    evaluation = evaluate_answer(payload.question, payload.answer)

    if payload.emotion:
        evaluation["emotion"] = payload.emotion

    add_evaluation(payload.session_id, evaluation)

    scores = [e["scores"]["relevance"] for e in session["evaluations"]]
    avg_score = sum(scores) / len(scores)

    difficulty = "hard" if avg_score >= 7 else "medium" if avg_score >= 4 else "easy"

    topic = select_topic(
        session["role"],
        session["asked_topics"],
        avg_score,
    )

    if not topic:
        return {"evaluation": evaluation, "next_question": None}

    next_question = generate_question(session["role"], topic, difficulty)
    session["asked_topics"].append(topic)
    session["last_question"] = next_question

    generate_voice(next_question)

    return {
        "evaluation": evaluation,
        "next_question": next_question,
        "audio": "/interview/audio",
    }


# ---------------- AUDIO STREAM ----------------


@router.get("/audio")
def get_audio():
    path = "generated_audio/latest.wav"

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio not ready")

    return FileResponse(path, media_type="audio/wav")



# ---------------- TRANSCRIBE ----------------
@router.post("/transcribe")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    result = transcribe_audio(audio_bytes)

    confidence = analyze_confidence(
        result["text"], result["duration"]
    )

    return {
        "text": result["text"],
        "confidence": confidence,
    }


# ---------------- EMOTION ----------------
@router.post("/emotion")
async def detect_emotion(file: UploadFile = File(...)):
    return analyze_emotion(await file.read())


# ---------------- FINAL ----------------
@router.get("/final/{session_id}")
def final_scorecard(session_id: str):
    session = get_session(session_id)
    return {
        "summary": compute_summary(session),
        "timeline": session["evaluations"],
    }

from fastapi import APIRouter, UploadFile, File, Response
from pydantic import BaseModel
from typing import Optional, Dict

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

router = APIRouter()

# --------------------------------------------------
# CORS PREFLIGHT HANDLER
# --------------------------------------------------
@router.options("/{path:path}")
def options_handler(path: str):
    return Response(status_code=200)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------
class StartInterviewRequest(BaseModel):
    role: str


class AnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    emotion: Optional[Dict] = None  # 👈 emotion comes from frontend


# --------------------------------------------------
# START INTERVIEW
# --------------------------------------------------
@router.post("/start")
def start_interview(payload: StartInterviewRequest):
    session_id = create_session(payload.role)
    session = get_session(session_id)

    topic = select_topic(
        role=payload.role,
        asked_topics=[],
        avg_score=0,
    )

    question = generate_question(
        role=payload.role,
        topic=topic,
        difficulty="easy",
    )

    session["asked_topics"].append(topic)

    return {
        "session_id": session_id,
        "question": question,
        "topic": topic,
    }


# --------------------------------------------------
# SUBMIT ANSWER
# --------------------------------------------------
@router.post("/answer")
def answer_interview(payload: AnswerRequest):
    try:
        session = get_session(payload.session_id)
        if not session:
            return {"error": "Invalid session"}

        # 🔥 LLM evaluation
        evaluation = evaluate_answer(
            question=payload.question,
            answer=payload.answer,
        )

        # 🧠 Attach emotion if available
        if payload.emotion:
            evaluation["emotion"] = payload.emotion

        # Store evaluation
        add_evaluation(payload.session_id, evaluation)

        # ---- ADAPTIVITY LOGIC ----
        scores = [
            e["scores"]["relevance"]
            for e in session["evaluations"]
            if "scores" in e
        ]
        avg_score = sum(scores) / len(scores) if scores else 5

        difficulty = (
            "hard" if avg_score >= 7
            else "medium" if avg_score >= 4
            else "easy"
        )

        topic = select_topic(
            role=session["role"],
            asked_topics=session["asked_topics"],
            avg_score=avg_score,
        )

        if not topic:
            return {
                "evaluation": evaluation,
                "next_question": None,
                "message": "Interview completed",
            }

        next_question = generate_question(
            role=session["role"],
            topic=topic,
            difficulty=difficulty,
        )

        session["asked_topics"].append(topic)

        return {
            "evaluation": evaluation,
            "next_question": next_question,
            "topic": topic,
            "difficulty": difficulty,
        }

    except Exception as e:
        return {"error": str(e)}


# --------------------------------------------------
# SPEECH → TEXT + CONFIDENCE
# --------------------------------------------------
@router.post("/transcribe")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    result = transcribe_audio(audio_bytes)

    confidence = analyze_confidence(
        text=result["text"],
        duration_sec=result["duration"],
    )

    return {
        "text": result["text"],
        "confidence": confidence,
    }


# --------------------------------------------------
# EMOTION DETECTION
# --------------------------------------------------
@router.post("/emotion")
async def detect_emotion(file: UploadFile = File(...)):
    image_bytes = await file.read()
    return analyze_emotion(image_bytes)


# --------------------------------------------------
# FINAL SCORECARD
# --------------------------------------------------
@router.get("/final/{session_id}")
def final_scorecard(session_id: str):
    session = get_session(session_id)
    if not session:
        return {"error": "Session not found"}

    summary = compute_summary(session)

    return {
        "summary": summary,
        "timeline": session["evaluations"],
        "topics_covered": session["asked_topics"],
    }

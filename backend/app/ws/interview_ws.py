import asyncio
import json
import logging
import time
import uuid

from fastapi import HTTPException, WebSocket, WebSocketDisconnect

from app.auth import SESSION_COOKIE_NAME, get_user_by_session_token
from app.db import AsyncSessionLocal
from app.services import session_store
from app.services.llm_service import generate_question
from app.services.llm_evaluator import evaluate_answer
from app.services.tts_service import generate_tts
from app.services.rate_limiter import new_interview_limiter, demo_limiter

logger = logging.getLogger(__name__)

REPEAT_PHRASES = ["repeat", "say again", "once again"]

# Question count (before this question) -> (kind, fixed difficulty override).
# Difficulty is None for phases that use the session's adaptive difficulty.
PHASE_BY_COUNT = {
    0: ("warmup", "easy"),
    1: ("behavioral", "easy"),
}


def _phase_for(question_count: int) -> tuple[str, str | None]:
    return PHASE_BY_COUNT.get(question_count, ("technical", None))


async def interview_ws(websocket: WebSocket):
    is_demo = websocket.query_params.get("demo") == "true"

    if is_demo:
        await websocket.accept()
        await _run_demo_session(websocket)
        return

    token = websocket.cookies.get(SESSION_COOKIE_NAME)
    async with AsyncSessionLocal() as db:
        user = await get_user_by_session_token(db, token)

    if not user:
        logger.warning("WS connection rejected: no valid session cookie")
        await websocket.close(code=4401)
        return

    user_id = user.id
    await websocket.accept()
    logger.info("WS accepted for user=%s", user_id)

    session_id: uuid.UUID | None = None
    current_question = None
    current_audio_url = None
    history = ""

    async def send_question(index: int):
        await websocket.send_json({
            "event": "question",
            "session_id": str(session_id),
            "index": index,
            "text": current_question,
            "audio_url": current_audio_url,
        })

    async def ask_next_question(db, session, role: str):
        """
        Generates and stores the NEXT single question (lazy, one at a
        time). The first two questions are a fixed warm-up and a
        generated behavioral question; from question 3 onward it's the
        original adaptive-difficulty, topic-rotating technical flow.
        """
        nonlocal current_question, current_audio_url, history
        kind, fixed_difficulty = _phase_for(session.question_count)
        topic = await session_store.next_topic(db, session)
        difficulty = fixed_difficulty or session_store.get_difficulty(session)

        q = await asyncio.to_thread(
            generate_question,
            role=role,
            topic=topic,
            difficulty=difficulty,
            history=history,
            question_kind=kind,
        )

        current_question = q
        current_audio_url = await generate_tts(q)
        history += f"\nQ: {q}"

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            event = payload.get("event")

            # ================= START =================
            if event == "start":
                try:
                    new_interview_limiter.check(str(user_id))
                except HTTPException as e:
                    await websocket.send_json({"event": "error", "reason": e.detail})
                    await websocket.close(code=4429)
                    return

                config = {
                    "role": payload.get("role", "General"),
                    "topics": payload.get("topics", []),
                    "level": payload.get("level", "fresher"),
                    "duration": payload.get("duration", 5),  # minutes
                }
                logger.info(
                    "Interview config: role=%s level=%s duration=%s topics=%d",
                    config["role"], config["level"], config["duration"], len(config["topics"]),
                )

                async with AsyncSessionLocal() as db:
                    session = await session_store.create_session(db, user_id, config)
                    session_id = session.id
                    history = ""

                    await ask_next_question(db, session, config["role"])
                    logger.info("Sending first question for session=%s", session_id)
                    await send_question(session.question_count)

            # ================= TRANSCRIPT =================
            elif event == "transcript":
                if not session_id:
                    continue

                async with AsyncSessionLocal() as db:
                    session = await session_store.get_session(db, session_id)
                    if not session:
                        continue

                    elapsed = time.time() - session.started_at.timestamp()
                    max_time = session.duration_minutes * 60

                    if elapsed >= max_time:
                        await session_store.mark_ended(db, session)
                        await websocket.send_json({
                            "event": "end",
                            "reason": "Interview time completed",
                        })
                        return

                    raw_text = payload.get("text", "").strip()
                    if not raw_text:
                        continue
                    if len(raw_text.split()) < 3:
                        logger.debug("Ignoring too-short transcript; waiting for fuller answer")
                        continue
                    text = raw_text.lower()

                    # ---------------- REPEAT (spoken) ----------------
                    if any(p in text for p in REPEAT_PHRASES):
                        await websocket.send_json({
                            "event": "repeat",
                            "text": current_question,
                            "audio_url": current_audio_url,
                        })
                        continue

                    # ---------------- EVALUATE CURRENT ANSWER ----------------
                    if current_question:
                        evaluation = await asyncio.to_thread(evaluate_answer, current_question, raw_text)
                        await session_store.add_evaluation(
                            db, session_id, current_question, raw_text, evaluation
                        )
                        new_difficulty = await session_store.update_difficulty(db, session, evaluation)
                        logger.info("Saved evaluation, difficulty -> %s", new_difficulty)

                    # ---------------- NEXT QUESTION (lazy, adaptive) ----------------
                    await ask_next_question(db, session, session.role)
                    await send_question(session.question_count)
                    logger.info("Sent next question index=%s", session.question_count)

            # ================= REPEAT (explicit event) =================
            elif event == "repeat":
                if not session_id or not current_question:
                    continue
                logger.info("Repeat event for session=%s", session_id)

                await websocket.send_json({
                    "event": "repeat",
                    "text": current_question,
                    "audio_url": current_audio_url,
                })

            # ================= SKIP QUESTION =================
            elif event == "skip":
                if not session_id:
                    continue

                async with AsyncSessionLocal() as db:
                    session = await session_store.get_session(db, session_id)
                    if not session:
                        continue

                    elapsed = time.time() - session.started_at.timestamp()
                    max_time = session.duration_minutes * 60
                    if elapsed >= max_time:
                        await session_store.mark_ended(db, session)
                        await websocket.send_json({
                            "event": "end",
                            "reason": "Interview time completed",
                        })
                        return

                    # Skip isn't a performance signal - keep difficulty unchanged.
                    await ask_next_question(db, session, session.role)
                    await send_question(session.question_count)
                    logger.info("Sent skipped-to next question index=%s", session.question_count)

    except WebSocketDisconnect:
        logger.info("Interview disconnected (user=%s, session=%s)", user_id, session_id)
    except Exception as e:
        logger.exception("WS handler error: %s", e)


# ================================================================
# DEMO MODE - no login, no persistence, fixed 3-question preview
# ================================================================

DEMO_PLAN = [
    ("warmup", "easy"),
    ("behavioral", "easy"),
    ("technical", "easy"),
]


def _compute_demo_summary(evaluations: list[dict]) -> dict:
    scored = [e for e in evaluations if not e.get("errored") and e.get("scores")]
    unscored = len(evaluations) - len(scored)

    def avg(key):
        vals = [e["scores"].get(key, 0) for e in scored]
        return round(sum(vals) / len(vals), 2) if vals else 0

    if scored:
        avg_relevance, avg_clarity, avg_depth, avg_confidence = (
            avg("relevance"), avg("clarity"), avg("depth"), avg("confidence")
        )
        overall = round((avg_relevance + avg_clarity + avg_depth + avg_confidence) / 4, 2)
        recommendation = (
            "Strong Hire" if overall >= 7.5
            else "Hire" if overall >= 6
            else "Needs Improvement"
        )
    else:
        avg_relevance = avg_clarity = avg_depth = avg_confidence = overall = 0
        recommendation = "Not enough data"

    return {
        "overall_score": overall,
        "avg_relevance": avg_relevance,
        "avg_clarity": avg_clarity,
        "avg_depth": avg_depth,
        "avg_confidence": avg_confidence,
        "recommendation": recommendation,
        "total_questions": len(evaluations),
        "unscored_answers": unscored,
    }


async def _run_demo_session(websocket: WebSocket):
    client_ip = websocket.client.host if websocket.client else "unknown"
    try:
        demo_limiter.check(client_ip)
    except HTTPException as e:
        await websocket.send_json({"event": "error", "reason": e.detail})
        await websocket.close(code=4429)
        return

    logger.info("Demo WS accepted for ip=%s", client_ip)

    current_question = None
    current_audio_url = None
    history = ""
    evaluations: list[dict] = []
    role = "Software Engineer"
    topics = ["General"]
    idx = 0  # number of questions asked so far

    async def ask_next():
        nonlocal current_question, current_audio_url, history, idx
        kind, difficulty = DEMO_PLAN[idx]
        topic = topics[idx % len(topics)] if kind == "technical" else kind

        q = await asyncio.to_thread(
            generate_question,
            role=role,
            topic=topic,
            difficulty=difficulty,
            history=history,
            question_kind=kind,
        )

        current_question = q
        current_audio_url = await generate_tts(q)
        history += f"\nQ: {q}"
        idx += 1

    async def send_question():
        await websocket.send_json({
            "event": "question",
            "session_id": None,
            "index": idx,
            "text": current_question,
            "audio_url": current_audio_url,
        })

    try:
        raw = await websocket.receive_text()
        payload = json.loads(raw)
        role = payload.get("role", role)
        topics = payload.get("topics") or topics

        await ask_next()
        await send_question()

        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            event = payload.get("event")

            if event == "transcript":
                raw_text = payload.get("text", "").strip()
                if not raw_text or len(raw_text.split()) < 3:
                    continue
                text = raw_text.lower()

                if any(p in text for p in REPEAT_PHRASES):
                    await websocket.send_json({
                        "event": "repeat",
                        "text": current_question,
                        "audio_url": current_audio_url,
                    })
                    continue

                evaluation = await asyncio.to_thread(evaluate_answer, current_question, raw_text)
                evaluations.append(evaluation)

                if idx >= len(DEMO_PLAN):
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Demo completed",
                        "summary": _compute_demo_summary(evaluations),
                    })
                    return

                await ask_next()
                await send_question()

            elif event == "repeat":
                if not current_question:
                    continue
                await websocket.send_json({
                    "event": "repeat",
                    "text": current_question,
                    "audio_url": current_audio_url,
                })

            elif event == "skip":
                if idx >= len(DEMO_PLAN):
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Demo completed",
                        "summary": _compute_demo_summary(evaluations),
                    })
                    return
                await ask_next()
                await send_question()

    except WebSocketDisconnect:
        logger.info("Demo interview disconnected (ip=%s)", client_ip)
    except Exception as e:
        logger.exception("Demo WS handler error: %s", e)

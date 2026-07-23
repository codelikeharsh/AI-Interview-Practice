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
from app.services.question_bank import get_question_by_id

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


def _format_resume_context(profile: dict | None) -> str:
    """
    Turns a parsed resume profile (see resume_service.analyze_resume) into
    one readable block to ground question generation in the candidate's
    real background. Empty string (no-op for the prompt) if no profile.
    """
    if not profile:
        return ""

    lines = []
    if profile.get("name"):
        lines.append(f"Name: {profile['name']}")
    if profile.get("role_title"):
        lines.append(f"Target role: {profile['role_title']}")

    skills = profile.get("skills") or []
    if skills:
        lines.append(f"Skills: {', '.join(skills)}")

    experience = profile.get("experience") or []
    if experience:
        lines.append("Experience:")
        for e in experience:
            lines.append(
                f"- {e.get('title', '')} at {e.get('company', '')} "
                f"({e.get('duration', '')}): {e.get('highlights', '')}"
            )

    education = profile.get("education") or []
    if education:
        lines.append("Education:")
        for ed in education:
            lines.append(f"- {ed.get('degree', '')}, {ed.get('institution', '')}")

    return "\n".join(lines)


HEARTBEAT_INTERVAL_S = 20


async def _heartbeat(websocket: WebSocket):
    """
    Recorded audio goes over a separate REST upload, not this socket, so
    while someone is answering the WS can otherwise sit fully idle for a
    minute or more. Reverse proxies in front of the app (e.g. Render's
    free tier) close connections that look idle, which would silently
    drop the interview mid-answer - this keeps traffic flowing so that
    never happens. Exits quietly once the socket is gone.
    """
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL_S)
            await websocket.send_json({"event": "ping"})
    except Exception:
        return


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
    heartbeat_task = asyncio.create_task(_heartbeat(websocket))

    session_id: uuid.UUID | None = None
    current_question = None
    current_audio_url = None
    history = ""
    resume_context = ""
    is_practice_session = False
    pending_eval_task: asyncio.Task | None = None

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
            level=session.level,
            resume_context=resume_context,
        )

        current_question = q
        current_audio_url = await generate_tts(q)
        history += f"\nQ: {q}"

    async def evaluate_and_store(sid, question, answer, role, difficulty, level):
        """
        Runs off the critical path (fired via asyncio.create_task, not
        awaited before the next question is generated) - scoring someone's
        just-given answer doesn't need to block asking the next question.
        Adaptive difficulty ends up one question behind as a result, which
        is a fair trade for the interview no longer stalling on an extra
        LLM round trip after every single answer. Uses its own DB session
        since it outlives the request scope that triggered it.
        """
        evaluation = await asyncio.to_thread(
            evaluate_answer, question, answer, role=role, difficulty=difficulty, level=level
        )
        async with AsyncSessionLocal() as eval_db:
            eval_session = await session_store.get_session(eval_db, sid)
            if not eval_session:
                return
            await session_store.add_evaluation(eval_db, sid, question, answer, evaluation)
            new_difficulty = await session_store.update_difficulty(eval_db, eval_session, evaluation)
            logger.info("Saved evaluation (background), session=%s difficulty -> %s", sid, new_difficulty)

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

                resume_context = _format_resume_context(payload.get("resumeProfile"))
                practice_question = get_question_by_id(payload.get("practice_question_id") or "")

                async with AsyncSessionLocal() as db:
                    session = await session_store.create_session(db, user_id, config)
                    session_id = session.id
                    history = ""

                    if practice_question:
                        is_practice_session = True
                        current_question = practice_question["text"]
                        current_audio_url = await generate_tts(current_question)
                        session.question_count = 1
                        await db.commit()
                        logger.info(
                            "Sending practice question=%s for session=%s",
                            practice_question["id"], session_id,
                        )
                    else:
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

                    # ---------------- PRACTICE MODE: ONE QUESTION, THEN DONE ----------------
                    if is_practice_session:
                        if current_question:
                            evaluation = await asyncio.to_thread(
                                evaluate_answer, current_question, raw_text,
                                role=session.role, difficulty=session_store.get_difficulty(session),
                                level=session.level,
                            )
                            await session_store.add_evaluation(
                                db, session_id, current_question, raw_text, evaluation
                            )
                        await session_store.mark_ended(db, session)
                        await websocket.send_json({
                            "event": "end",
                            "reason": "Practice question completed",
                        })
                        return

                    # ---------------- EVALUATE IN THE BACKGROUND (don't block on it) ----------------
                    if pending_eval_task and not pending_eval_task.done():
                        await pending_eval_task
                    if current_question:
                        pending_eval_task = asyncio.create_task(
                            evaluate_and_store(
                                session_id, current_question, raw_text,
                                session.role, session_store.get_difficulty(session), session.level,
                            )
                        )
                        history += f"\nA: {raw_text}"

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
    finally:
        heartbeat_task.cancel()
        if pending_eval_task:
            try:
                await pending_eval_task
            except Exception:
                logger.exception("Background evaluation failed during shutdown")


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

    details = [
        {
            "question": e.get("question"),
            "scores": e.get("scores"),
            "strengths": e.get("strengths") or [],
            "improvements": e.get("improvements") or [],
            "feedback": e.get("feedback"),
            "difficulty": e.get("difficulty"),
        }
        for e in scored
    ]

    return {
        "overall_score": overall,
        "avg_relevance": avg_relevance,
        "avg_clarity": avg_clarity,
        "avg_depth": avg_depth,
        "avg_confidence": avg_confidence,
        "recommendation": recommendation,
        "total_questions": len(evaluations),
        "unscored_answers": unscored,
        "details": details,
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
    heartbeat_task = asyncio.create_task(_heartbeat(websocket))

    current_question = None
    current_audio_url = None
    current_difficulty = "easy"
    history = ""
    eval_tasks: list[asyncio.Task] = []
    role = "Software Engineer"
    topics = ["General"]
    level = "fresher"
    idx = 0  # number of questions asked so far

    async def evaluate_demo_answer(question, answer, difficulty):
        # Same off-the-critical-path treatment as the authenticated flow -
        # demo has no adaptive difficulty to preserve ordering for, so this
        # is purely a latency win. Tags the question onto the result since
        # nothing else here persists it for later labeling.
        evaluation = await asyncio.to_thread(
            evaluate_answer, question, answer, role=role, difficulty=difficulty, level=level
        )
        return {**evaluation, "question": question, "difficulty": difficulty}

    async def ask_next():
        nonlocal current_question, current_audio_url, current_difficulty, history, idx
        kind, difficulty = DEMO_PLAN[idx]
        topic = topics[idx % len(topics)] if kind == "technical" else kind

        q = await asyncio.to_thread(
            generate_question,
            role=role,
            topic=topic,
            difficulty=difficulty,
            history=history,
            question_kind=kind,
            level=level,
        )

        current_question = q
        current_audio_url = await generate_tts(q)
        current_difficulty = difficulty
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
        level = payload.get("level", level)

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

                eval_tasks.append(asyncio.create_task(
                    evaluate_demo_answer(current_question, raw_text, current_difficulty)
                ))
                history += f"\nA: {raw_text}"

                if idx >= len(DEMO_PLAN):
                    evaluations = [await t for t in eval_tasks]
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
                    evaluations = [await t for t in eval_tasks]
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
    finally:
        heartbeat_task.cancel()
        for t in eval_tasks:
            if not t.done():
                t.cancel()

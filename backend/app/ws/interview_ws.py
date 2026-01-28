from fastapi import WebSocket, WebSocketDisconnect
from app.services.session_store import create_session, get_session
from app.services.llm_service import generate_question
from app.services.tts_service import generate_tts
import json, time

LEVEL_MAP = {
    "fresher": "easy",
    "intermediate": "medium",
    "experienced": "hard",
}

async def interview_ws(websocket: WebSocket):
    await websocket.accept()

    session_id = None
    current_question = None

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            event = payload.get("event")

            # ---------------- START ----------------
            if event == "start":
                config = {
                    "role": payload.get("role", "General"),
                    "topics": payload.get("topics", []),
                    "level": payload.get("level", "fresher"),
                    "duration": payload.get("duration", 5),  # minutes
                }

                session_id = create_session(config)
                session = get_session(session_id)

                difficulty = LEVEL_MAP.get(config["level"], "easy")

                topic = config["topics"][0] if config["topics"] else "general"

                current_question = generate_question(
                    role=config["role"],
                    topic=topic,
                    difficulty=difficulty,
                )

                await websocket.send_json({
                    "event": "question",
                    "session_id": session_id,
                    "index": 1,
                    "text": current_question,
                    "audio_url": generate_tts(current_question),
                })

            # ---------------- TRANSCRIPT ----------------
            elif event == "transcript":
                if not session_id:
                    continue

                session = get_session(session_id)
                config = session["config"]

                # ⏱️ CHECK DURATION (soft limit)
                elapsed = time.time() - session["start_time"]
                max_time = config["duration"] * 60

                if elapsed >= max_time:
                    await websocket.send_json({
    "event": "end",
    "reason": "Interview time completed",
    "total_questions": session["question_index"] + 1
})

                    return

                text = payload.get("text", "").lower().strip()
                if not text:
                    continue

                # repeat
                if any(p in text for p in ["repeat", "say again", "once again"]):
                    await websocket.send_json({
                        "event": "repeat",
                        "text": current_question,
                        "audio_url": generate_tts(current_question),
                    })
                    continue

                # next question
                session["question_index"] += 1

                difficulty = LEVEL_MAP.get(config["level"], "easy")

                topic = (
                    config["topics"][session["question_index"] % len(config["topics"])]
                    if config["topics"] else "general"
                )

                current_question = generate_question(
                    role=config["role"],
                    topic=topic,
                    difficulty=difficulty,
                )

                await websocket.send_json({
                    "event": "question",
                    "index": session["question_index"] + 1,
                    "text": current_question,
                    "audio_url": generate_tts(current_question),
                })
         
    except WebSocketDisconnect:
        print("🟡 Interview disconnected")

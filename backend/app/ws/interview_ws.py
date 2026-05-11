from fastapi import WebSocket, WebSocketDisconnect
from app.services.session_store import (
    create_session,
    get_session,
    set_questions,
    get_next_question,
    add_evaluation,
)
from app.services.llm_service import generate_question
from app.services.llm_evaluator import evaluate_answer
from app.services.tts_service import generate_tts
import json
import time
import math

LEVEL_MAP = {
    "fresher": "easy",
    "intermediate": "medium",
    "experienced": "hard",
}

async def interview_ws(websocket: WebSocket):
    await websocket.accept()
    print("🟢 WS accepted")

    session_id = None
    current_question = None

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            event = payload.get("event")

            # ================= START =================
            if event == "start":
                print("▶️ WS start event received")
                config = {
                    "role": payload.get("role", "General"),
                    "topics": payload.get("topics", []),
                    "level": payload.get("level", "fresher"),
                    "duration": payload.get("duration", 5),  # minutes
                }
                print(f"⚙️ Interview config: role={config['role']}, level={config['level']}, duration={config['duration']}, topics={len(config['topics'])}")

                session_id = create_session(config)
                session = get_session(session_id)

                difficulty = LEVEL_MAP.get(config["level"], "easy")
                topics = config["topics"] or ["general"]

                # -------------------------------
                # PRE-GENERATE QUESTIONS
                # -------------------------------
                # Avg ~3 min per question + buffer
                base_q = math.ceil(config["duration"] / 3)
                total_questions = base_q + 2
                print(f"🧠 Pre-generating {total_questions} questions")

                generated_questions = []
                history = ""

                for i in range(total_questions):
                    topic = topics[i % len(topics)]

                    q = generate_question(
                        role=config["role"],
                        topic=topic,
                        difficulty=difficulty,
                        history=history,
                    )

                    if not q:
                        q = generate_question(
                            role=config["role"],
                            topic=topic,
                            difficulty=difficulty,
                            history=history,
                        )

                    generated_questions.append(q)
                    history += f"\nQ{i+1}: {q}"
                    print(f"✅ Generated question {i+1}/{total_questions}")

                set_questions(session_id, generated_questions)

                # Send FIRST question
                current_question = get_next_question(session_id)
                print(f"📤 Sending first question for session={session_id}")

                await websocket.send_json({
                    "event": "question",
                    "session_id": session_id,
                    "index": 1,
                    "text": current_question,
                    "audio_url": generate_tts(current_question),
                })

            # ================= TRANSCRIPT =================
            elif event == "transcript":
                if not session_id:
                    continue
                print(f"📝 Transcript event for session={session_id}")

                session = get_session(session_id)
                config = session["config"]

                # ⏱️ Duration check (hard stop)
                elapsed = time.time() - session["start_time"]
                max_time = config["duration"] * 60

                if elapsed >= max_time:
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Interview time completed",
                        "total_questions": len(session.get("evaluations", [])),
                    })
                    return

                raw_text = payload.get("text", "").strip()
                if not raw_text:
                    continue
                if len(raw_text.split()) < 3:
                    print("⏳ Ignoring too-short transcript; waiting for fuller answer")
                    continue
                text = raw_text.lower()

                # ---------------- REPEAT ----------------
                if any(p in text for p in ["repeat", "say again", "once again"]):
                    await websocket.send_json({
                        "event": "repeat",
                        "text": current_question,
                        "audio_url": generate_tts(current_question),
                    })
                    continue

                # ---------------- EVALUATE CURRENT ANSWER ----------------
                if current_question:
                    evaluation = evaluate_answer(current_question, raw_text)
                    add_evaluation(
                        session_id,
                        {
                            "question": current_question,
                            "answer": raw_text,
                            **evaluation,
                        },
                    )
                    print("✅ Saved evaluation for current answer")

                # ---------------- NEXT QUESTION ----------------
                next_q = get_next_question(session_id)

                if not next_q:
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Questions completed",
                    })
                    return

                current_question = next_q

                await websocket.send_json({
                    "event": "question",
                    "index": session["current_question_ptr"],
                    "text": current_question,
                    "audio_url": generate_tts(current_question),
                })
                print(f"📤 Sent next question index={session['current_question_ptr']}")

            # ================= SKIP QUESTION =================
            elif event == "skip":
                if not session_id:
                    continue
                print(f"⏭️ Skip event for session={session_id}")

                session = get_session(session_id)
                config = session["config"]

                elapsed = time.time() - session["start_time"]
                max_time = config["duration"] * 60
                if elapsed >= max_time:
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Interview time completed",
                        "total_questions": len(session.get("evaluations", [])),
                    })
                    return

                next_q = get_next_question(session_id)
                if not next_q:
                    await websocket.send_json({
                        "event": "end",
                        "reason": "Questions completed",
                    })
                    return

                current_question = next_q
                await websocket.send_json({
                    "event": "question",
                    "index": session["current_question_ptr"],
                    "text": current_question,
                    "audio_url": generate_tts(current_question),
                })
                print(f"📤 Sent skipped-to next question index={session['current_question_ptr']}")

    except WebSocketDisconnect:
        print("🟡 Interview disconnected")
    except Exception as e:
        print(f"❌ WS handler error: {e}")

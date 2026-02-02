import uuid
import time

# In-memory session store (for demo / local use)
_sessions = {}

def create_session(config: dict):
    """
    Creates a new interview session with config.
    """
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "config": config,                # domain, topics, level, duration
        "question_index": 0,             # legacy index (kept for safety)
        "questions": [],                 # ✅ NEW: pre-generated questions
        "current_question_ptr": 0,       # ✅ NEW: pointer for questions list
        "start_time": time.time(),
        "asked_topics": [],
        "evaluations": []
    }
    return session_id


def get_session(session_id: str):
    """
    Fetch a session by ID.
    """
    return _sessions.get(session_id)


# ================================
# PRE-GENERATED QUESTION HELPERS
# ================================

def set_questions(session_id: str, questions: list):
    """
    Stores pre-generated questions for the session.
    """
    if session_id in _sessions:
        _sessions[session_id]["questions"] = questions
        _sessions[session_id]["current_question_ptr"] = 0


def get_next_question(session_id: str):
    """
    Returns the next question from pre-generated list.
    """
    session = _sessions.get(session_id)
    if not session:
        return None

    idx = session["current_question_ptr"]
    questions = session.get("questions", [])

    if idx >= len(questions):
        return None

    session["current_question_ptr"] += 1
    return questions[idx]


# ================================
# EVALUATION + SUMMARY (UNCHANGED)
# ================================

def add_evaluation(session_id: str, evaluation: dict):
    """
    Stores evaluation data for a question.
    """
    if session_id in _sessions:
        _sessions[session_id]["evaluations"].append(evaluation)


def compute_summary(session: dict):
    """
    Computes final interview scorecard.
    """
    evaluations = session.get("evaluations", [])
    if not evaluations:
        return {}

    relevance = []
    clarity = []
    depth = []
    confidence = []

    for e in evaluations:
        scores = e.get("scores", {})
        relevance.append(scores.get("relevance", 0))
        clarity.append(scores.get("clarity", 0))
        depth.append(scores.get("depth", 0))
        confidence.append(scores.get("confidence", 5))

    def avg(arr):
        return round(sum(arr) / len(arr), 2) if arr else 0

    overall = round(
        (avg(relevance) + avg(clarity) + avg(depth) + avg(confidence)) / 4,
        2
    )

    recommendation = (
        "Strong Hire" if overall >= 7.5
        else "Hire" if overall >= 6
        else "Needs Improvement"
    )

    return {
        "overall_score": overall,
        "avg_relevance": avg(relevance),
        "avg_clarity": avg(clarity),
        "avg_depth": avg(depth),
        "avg_confidence": avg(confidence),
        "recommendation": recommendation,
        "total_questions": len(evaluations)
    }

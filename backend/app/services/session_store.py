import uuid

# In-memory session store (for demo / local use)
_sessions = {}

def create_session(role: str):
    """
    Creates a new interview session.
    """
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
    "role": role,
    "asked_topics": [],
    "evaluations": []
}

    return session_id


def get_session(session_id: str):
    """
    Fetch a session by ID.
    """
    return _sessions.get(session_id)


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

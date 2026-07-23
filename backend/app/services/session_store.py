import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InterviewSession, QuestionEvaluation

logger = logging.getLogger(__name__)

LEVEL_MAP = {
    "fresher": "easy",
    "intermediate": "medium",
    "experienced": "hard",
}

DIFFICULTY_STEPS = ["easy", "medium", "hard"]


def next_difficulty(current: str, evaluation: dict | None) -> str:
    """
    Pure function (no I/O) so it can be unit-tested without a database.
    Adjusts difficulty for the NEXT question based on how well the
    just-recorded answer scored. An answer that couldn't be scored
    (evaluation["errored"]) doesn't move difficulty either way - it
    isn't a signal about the candidate.
    """
    base = current if current in DIFFICULTY_STEPS else "easy"
    if not evaluation or evaluation.get("errored"):
        return base

    scores = evaluation.get("scores") or {}
    values = [
        scores.get("relevance", 0),
        scores.get("clarity", 0),
        scores.get("depth", 0),
        scores.get("confidence", 0),
    ]
    avg = sum(values) / len(values) if values else 0

    step = DIFFICULTY_STEPS.index(base)
    if avg >= 7.5:
        step = min(step + 1, len(DIFFICULTY_STEPS) - 1)
    elif avg <= 4:
        step = max(step - 1, 0)
    return DIFFICULTY_STEPS[step]


async def create_session(db: AsyncSession, user_id: uuid.UUID, config: dict) -> InterviewSession:
    session = InterviewSession(
        user_id=user_id,
        role=config.get("role", "General"),
        topics=config.get("topics") or ["general"],
        level=config.get("level", "fresher"),
        duration_minutes=config.get("duration", 5),
        current_difficulty=LEVEL_MAP.get(config.get("level"), "easy"),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id) -> InterviewSession | None:
    if isinstance(session_id, str):
        try:
            session_id = uuid.UUID(session_id)
        except ValueError:
            return None
    return await db.get(InterviewSession, session_id)


async def next_topic(db: AsyncSession, session: InterviewSession) -> str:
    topics = session.topics or ["general"]
    idx = session.topic_ptr % len(topics)
    session.topic_ptr += 1
    session.question_count += 1
    await db.commit()
    return topics[idx]


def get_difficulty(session: InterviewSession) -> str:
    return session.current_difficulty


async def update_difficulty(db: AsyncSession, session: InterviewSession, evaluation: dict) -> str:
    session.current_difficulty = next_difficulty(session.current_difficulty, evaluation)
    await db.commit()
    return session.current_difficulty


async def add_evaluation(
    db: AsyncSession,
    session_id: uuid.UUID,
    question: str,
    answer: str,
    evaluation: dict,
) -> None:
    row = QuestionEvaluation(
        session_id=session_id,
        question=question,
        answer=answer,
        scores=evaluation.get("scores"),
        feedback=evaluation.get("feedback"),
        strengths=evaluation.get("strengths") or [],
        improvements=evaluation.get("improvements") or [],
        errored=bool(evaluation.get("errored")),
    )
    db.add(row)
    await db.commit()


async def mark_ended(db: AsyncSession, session: InterviewSession) -> None:
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()


async def compute_summary(db: AsyncSession, session: InterviewSession) -> dict:
    """
    Recomputes the scorecard from persisted evaluations and writes it
    back onto the session row (so history listings can read it without
    re-aggregating every time). Answers that failed to score
    (errored=True) are excluded from the averages, not counted as a
    real low score - the count is reported separately.
    """
    result = await db.execute(
        select(QuestionEvaluation)
        .where(QuestionEvaluation.session_id == session.id)
        .order_by(QuestionEvaluation.created_at)
    )
    evaluations = result.scalars().all()

    scored = [e for e in evaluations if not e.errored and e.scores]
    unscored = len(evaluations) - len(scored)

    def avg(key):
        vals = [e.scores.get(key, 0) for e in scored]
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

    session.overall_score = overall
    session.avg_relevance = avg_relevance
    session.avg_clarity = avg_clarity
    session.avg_depth = avg_depth
    session.avg_confidence = avg_confidence
    session.recommendation = recommendation
    session.unscored_answers = unscored
    await db.commit()

    timeline = [
        {
            "question": e.question,
            "scores": e.scores,
            "strengths": e.strengths or [],
            "improvements": e.improvements or [],
            "feedback": e.feedback,
            "difficulty": e.difficulty,
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
        "timeline": timeline,
    }


async def list_user_sessions(db: AsyncSession, user_id: uuid.UUID) -> list[InterviewSession]:
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.started_at.desc())
    )
    return list(result.scalars().all())

import random

def select_topic(role: str, asked_topics: list[str], avg_score: float):
    """
    Select next topic based on performance.
    """
    from app.services.topic_bank import TOPICS

    available = [t for t in TOPICS.get(role, []) if t not in asked_topics]
    if not available:
        return None

    # Simple adaptivity
    if avg_score >= 7:
        return random.choice(available)  # harder / deeper topics later
    else:
        return random.choice(available[:2])  # fundamentals first

import re
from typing import Dict, List

FILLER_WORDS = [
    "uh", "um", "like", "you know", "actually", "basically", "so"
]

def analyze_confidence(text: str, duration_sec: float | None = None) -> Dict:
    words = re.findall(r"\b\w+\b", text.lower())
    word_count = len(words)

    # Speaking rate (fallback if duration unknown)
    if duration_sec and duration_sec > 0:
        wpm = int((word_count / duration_sec) * 60)
    else:
        # assume ~60 sec answer if unknown
        wpm = int(word_count)

    fillers_found: Dict[str, int] = {}
    for filler in FILLER_WORDS:
        count = len(re.findall(rf"\b{re.escape(filler)}\b", text.lower()))
        if count > 0:
            fillers_found[filler] = count

    total_fillers = sum(fillers_found.values())

    # Simple confidence heuristic
    score = 10
    if wpm < 90:
        score -= 2
    elif wpm > 170:
        score -= 2

    if total_fillers > 5:
        score -= 3
    elif total_fillers > 2:
        score -= 2

    score = max(0, min(10, score))

    tips: List[str] = []
    if wpm < 90:
        tips.append("Try speaking a bit faster to sound more confident.")
    if wpm > 170:
        tips.append("Slow down slightly to improve clarity.")
    if total_fillers > 0:
        tips.append("Reduce filler words by pausing silently instead.")

    return {
        "words": word_count,
        "wpm": wpm,
        "filler_words": fillers_found,
        "confidence_score": score,
        "tips": tips
    }

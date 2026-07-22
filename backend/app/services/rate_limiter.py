import time
from collections import defaultdict, deque

from fastapi import HTTPException


class RateLimiter:
    """
    Simple in-memory sliding-window rate limiter, keyed by an arbitrary
    string (e.g. a user id). Good enough for a single-process deployment;
    once this app runs as multiple worker processes, this needs to move
    to something shared (Redis) since each process would otherwise track
    its own independent counters.
    """

    def __init__(self, max_events: int, window_seconds: float):
        self.max_events = max_events
        self.window_seconds = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]

        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()

        if len(hits) >= self.max_events:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please slow down.")

        hits.append(now)


# New interviews per user: generous, but bounds runaway Gemini/TTS cost.
new_interview_limiter = RateLimiter(max_events=10, window_seconds=60 * 60)

# Transcription requests per user: bounds a stuck/left-open tab spamming audio.
transcribe_limiter = RateLimiter(max_events=30, window_seconds=60)

# Unauthenticated demo interviews, keyed by IP (no user_id to key on).
demo_limiter = RateLimiter(max_events=5, window_seconds=60 * 60)

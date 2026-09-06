"""
Lightweight in-memory rate limiter for sensitive auth endpoints (login,
PIN verification, PIN recovery).

This is intentionally dependency-free and process-local: it won't survive
a restart or work across multiple worker processes. That's the right
tradeoff for this app's current single-process scale — if it's ever run
behind multiple workers or instances, swap the in-memory store for a
shared one (e.g. Redis) without changing any call sites below.
"""
import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException

_attempts = defaultdict(list)
_lock = Lock()


def enforce_rate_limit(key: str, max_attempts: int, window_seconds: int):
    """Raise HTTP 429 if `key` has already been used `max_attempts` times
    within the trailing `window_seconds`; otherwise record this attempt."""
    now = time.monotonic()
    window_start = now - window_seconds
    with _lock:
        attempts = _attempts[key]
        while attempts and attempts[0] < window_start:
            attempts.pop(0)
        if len(attempts) >= max_attempts:
            retry_after = max(1, int(window_seconds - (now - attempts[0])))
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Try again in {retry_after} seconds."
            )
        attempts.append(now)

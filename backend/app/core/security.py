import time
from collections import defaultdict
from fastapi import Request, HTTPException
from app.config import settings


# In-memory rate limiter: {ip: [timestamps]}
_rate_limit_store: dict = defaultdict(list)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request):
    ip = get_client_ip(request)
    now = time.time()
    window = settings.RATE_LIMIT_WINDOW
    limit = settings.RATE_LIMIT_REQUESTS

    # Remove timestamps outside the window
    _rate_limit_store[ip] = [
        ts for ts in _rate_limit_store[ip] if now - ts < window
    ]

    if len(_rate_limit_store[ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {limit} requests per {window} seconds.",
        )

    _rate_limit_store[ip].append(now)


def validate_file_extension(filename: str) -> bool:
    import os
    ext = os.path.splitext(filename)[1].lower()
    return ext in settings.ALLOWED_EXTENSIONS


def is_video_file(filename: str) -> bool:
    import os
    ext = os.path.splitext(filename)[1].lower()
    return ext in [".mp4", ".avi", ".mov"]


def is_image_file(filename: str) -> bool:
    import os
    ext = os.path.splitext(filename)[1].lower()
    return ext in [".jpg", ".jpeg", ".png"]

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

# Configurable limits via environment variables
AI_LIMIT = os.getenv("AI_RATE_LIMIT", "10/minute")
AUTH_LIMIT = os.getenv("AUTH_RATE_LIMIT", "20/minute")
UPLOAD_LIMIT = os.getenv("UPLOAD_RATE_LIMIT", "5/minute")
DEFAULT_LIMIT = os.getenv("DEFAULT_RATE_LIMIT", "100/minute")

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "status": "error",
            "message": "Too many requests. Please slow down.",
            "error_code": "RATE_LIMIT_EXCEEDED",
            "details": f"Limit: {exc.limit}"
        }
    )
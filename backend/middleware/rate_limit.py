import os
import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

def _get_rate_limit_key(request: Request) -> str:
    """
    Returns firm_id from JWT if present, else falls back to IP.
    Decodes without signature verification (verification happens in verify_token).
    This is intentional: key extraction only, not auth.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        try:
            # options={"verify_signature": False} — key extraction only
            payload = jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
            # Supabase stores firm_id in user_metadata
            firm_id = (
                payload.get("user_metadata", {}).get("firm_id")
                or payload.get("firm_id")
            )
            if firm_id:
                return f"firm:{firm_id}"
        except Exception:
            pass
    return get_remote_address(request)

limiter = Limiter(key_func=_get_rate_limit_key)

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
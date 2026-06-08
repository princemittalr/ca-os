from fastapi import Depends, HTTPException, status, Header, Request
from typing import List, Optional
import jwt as pyjwt
from config.supabase import get_supabase_client, is_supabase_active
from config.settings import settings

# -------------------------------------------------------------------------
# JWT SESSION VERIFICATION DEPENDENCY
# -------------------------------------------------------------------------
async def verify_token(request: Request, authorization: Optional[str] = Header(None)) -> dict:
    """
    HTTP Bearer JWT Token verification middleware.
    Decodes Supabase Auth session JWTs, injecting user context.
    Uses offline HS256 verification when SUPABASE_JWT_SECRET is available.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header."
        )

    token = authorization.split(" ", 1)[1]
    jwt_secret = settings.SUPABASE_JWT_SECRET

    # 1. Fast path: offline verification using JWT secret (no Supabase round-trip)
    if jwt_secret and jwt_secret not in ("mock_secret", ""):
        try:
            payload = pyjwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",  # Supabase default audience
            )
            user_id = payload.get("sub")
            meta = payload.get("user_metadata") or {}
            firm_id = meta.get("firm_id")
            if not user_id or not firm_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token claims: missing sub or firm_id."
                )
            return {
                "user_id": user_id,
                "firm_id": firm_id,
                "role": meta.get("role", "ARTICLE"),
                "full_name": meta.get("full_name", "CA Auditor"),
                "email": payload.get("email", ""),
            }
        except pyjwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired."
            )
        except pyjwt.InvalidTokenError:
            # Fall through to Supabase SDK verification for other errors
            pass

    # 2. Slow path: Supabase SDK round-trip (fallback for dev/test without real secret)
    if not is_supabase_active():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable."
        )

    try:
        res = get_supabase_client().auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session."
            )

        user = res.user
        metadata = user.user_metadata or {}
        role = metadata.get("role", "ARTICLE")
        firm_id = metadata.get("firm_id")

        if not firm_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User missing firm association."
            )

        return {
            "user_id": user.id,
            "firm_id": firm_id,
            "role": role,
            "full_name": metadata.get("full_name", "CA Auditor"),
            "email": user.email,
        }

    except HTTPException:
        raise  # ← CRITICAL: must re-raise, not fall through to generic handler

    except Exception as e:
        # Scrub internal detail in production
        detail = str(e) if settings.DEBUG else "Authentication verification failed."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )

# -------------------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL (RBAC) GUARD DEPENDENCY
# -------------------------------------------------------------------------
class RequireRoles:
    """
    FastAPI Route Guard enforcing specific statutory roles:
    SUPER_ADMIN | PARTNER | MANAGER | ARTICLE | CLIENT_VIEWER
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(verify_token)) -> dict:
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {self.allowed_roles}."
            )
        return current_user

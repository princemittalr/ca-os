from fastapi import Depends, HTTPException, status, Header
from typing import List, Optional
import os

from config.supabase import supabase_client, is_supabase_active

# -------------------------------------------------------------------------
# JWT SESSION VERIFICATION DEPENDENCY
# -------------------------------------------------------------------------
async def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    HTTP Bearer JWT Token verification middleware.
    Decodes Supabase Auth session JWTs, injecting user context.
    If Supabase is unconfigured, automatically fallbacks to a high-privilege mock context.
    """
    # 1. Check if Supabase Persistent database is active
    if not is_supabase_active():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable. Database not configured."
        )

    # 2. Enforce presence of Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header."
        )

    token = authorization.split(" ")[1]
    
    try:
        # Ask Supabase directly to verify the JWT and fetch user context
        res = supabase_client.auth.get_user(token)
        if not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication session."
            )
            
        user = res.user
        # Extract custom user roles & metadata
        metadata = user.user_metadata or {}
        role = metadata.get("role", "ARTICLE") # Default to standard auditor associate
        firm_id = metadata.get("firm_id", "mock-firm-uuid-67890")
        full_name = metadata.get("full_name", "CA Auditor")
        
        return {
            "user_id": user.id,
            "firm_id": firm_id,
            "role": role,
            "full_name": full_name,
            "email": user.email
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication verification failed: {str(e)}"
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
                detail=f"Access denied. Required roles: {self.allowed_roles}. Your current role is: {current_user['role']}."
            )
        return current_user

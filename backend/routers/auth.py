from fastapi import APIRouter, Depends, HTTPException, status, Request
from middleware.rate_limit import limiter, AUTH_LIMIT
import uuid
import logging

from models import schemas
from middleware.auth import verify_token
from config.supabase import get_supabase_client, is_supabase_active


from services.audit_logger import log_audit_event, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/signup", response_model=schemas.TokenResponse)
async def signup_firm_user(payload: schemas.UserRegister):
    """
    Registers a new CA Firm user account using Supabase Auth.
    Automatically provisions firm tenant context, inserts the user profile
    row into the users table, and assigns roles. Rolls back the auth user
    if the DB insert fails to prevent orphan auth records.
    """
    email = payload.email
    password = payload.password
    full_name = payload.full_name
    firm_name = payload.firm_name
    role = payload.role or "PARTNER"

    # Provision dynamic tenant firm UUID — single source of truth for this firm
    firm_id = str(uuid.uuid4())

    if is_supabase_active():
        try:
            # Step 1: Register user in Supabase Auth with custom metadata
            res = get_supabase_client().auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": full_name,
                        "firm_name": firm_name,
                        "role": role,
                        "firm_id": firm_id
                    }
                }
            })

            if not res.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Auth signup request failed."
                )

            user = res.user

            # Step 2: Insert user profile row — firm_id must match user_metadata exactly.
            # If this fails, rollback the auth user to prevent orphan records.
            try:
                get_supabase_client().table("users").insert({
                    "id": user.id,
                    "full_name": full_name,
                    "firm_name": firm_name,
                    "firm_id": firm_id,
                    "onboarding_complete": False
                }).execute()
            except Exception as db_err:
                # Rollback: delete the auth user so we don't leave orphan records
                logger.error(f"User profile creation failed: {str(db_err)}", exc_info=True)
                try:
                    get_supabase_client().auth.admin.delete_user(user.id)
                except Exception:
                    pass  # Best-effort rollback; log but don't mask original error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="User profile creation failed. Please contact support."
                )

            # Step 3: Log audit trail
            await log_audit_event(
                action="SIGNUP_FIRM_USER",
                entity_type="users",
                actor_id=user.id,
                firm_id=firm_id,
                entity_id=user.id,
                details={"firm_name": firm_name, "role": role},
            )

            if not res.session:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration succeeded but session could not be established. Please verify your email."
                )

            return {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "token_type": "bearer",
                "user_id": user.id,
                "firm_id": firm_id,
                "role": role,
                "full_name": full_name
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please check your details and try again."
            )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Registration service unavailable. Supabase is not configured."
    )

@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit(AUTH_LIMIT)
async def login_firm_user(request: Request, payload: schemas.UserLogin):
    """
    Authenticates CA Firm credentials, returning active JWT sessions.
    """
    email = payload.email
    password = payload.password

    if is_supabase_active():
        try:
            res = get_supabase_client().auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not res.user or not res.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password credentials."
                )
                
            user = res.user
            metadata = user.user_metadata or {}
            role = metadata.get("role", "ARTICLE")
            firm_id = metadata.get("firm_id")
            if not firm_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed. User profile metadata is missing the required firm association."
                )
            full_name = metadata.get("full_name", "CA Partner")
            
            # Log audit
            await log_audit_event(
                action="LOGIN_SUCCESS",
                entity_type="auth",
                actor_id=user.id,
                firm_id=firm_id,
                entity_id=user.id,
                details={"email": email},
                ip_address=get_client_ip(request),
            )
            return {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "token_type": "bearer",
                "user_id": user.id,
                "firm_id": firm_id,
                "role": role,
                "full_name": full_name
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password credentials."
            )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service unavailable. Supabase is not configured."
    )

@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(verify_token)):
    """
    Retrieves the decrypted authentication context for the current session.
    """
    return current_user

@router.patch("/me/onboarding")
async def complete_onboarding(current_user: dict = Depends(verify_token)):
    """
    Sets onboarding_complete = True for the current logged-in user in the database.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user context."
        )
    if is_supabase_active():
        try:
            get_supabase_client().table("users").update({"onboarding_complete": True}).eq("id", user_id).execute()
            return {"message": "Onboarding completed successfully.", "onboarding_complete": True}
        except Exception as e:
            logger.error(f"Failed to update onboarding status: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update onboarding status in the database."
            )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service unavailable. Supabase is not configured."
    )


@router.post("/verify-password")
async def verify_password(payload: schemas.VerifyPasswordRequest, current_user: dict = Depends(verify_token)):
    """
    Verify current authenticated user's password through Supabase Auth.
    """
    email = current_user.get("email")
    if not isinstance(email, str):
        return {"valid": False}
    if is_supabase_active():
        try:
            res = get_supabase_client().auth.sign_in_with_password({
                "email": email,
                "password": payload.password
            })
            if res.user:
                return {"valid": True}
        except HTTPException:
            raise
        except Exception:
            return {"valid": False}
    return {"valid": False}

@router.put("/password")
async def update_password(
    payload: schemas.PasswordUpdateRequest,
    current_user: dict = Depends(verify_token)
):
    """
    Update authenticated user's password through Supabase Auth.
    Requires current password verification first.
    """
    user_id = current_user.get("user_id")
    email = current_user.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=400, detail="Invalid user context.")

    if not is_supabase_active():
        raise HTTPException(status_code=503, detail="Authentication service unavailable.")

    # Step 1: Verify current password
    try:
        verify_res = get_supabase_client().auth.sign_in_with_password({
            "email": email,
            "password": payload.current_password,
        })
        if not verify_res.user:
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Current password verification failed.")

    # Step 2: Update to new password
    try:
        get_supabase_client().auth.admin.update_user_by_id(
            user_id, {"password": payload.new_password}
        )
        await log_audit_event(
            action="PASSWORD_CHANGED",
            entity_type="auth",
            actor_id=user_id,
            firm_id=current_user.get("firm_id"),
            details={"email": email},
        )
        return {"message": "Password updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password update failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to update password. Please try again.")

@router.get("/sessions")
async def get_active_sessions(current_user: dict = Depends(verify_token)):
    """
    Return current active sessions.
    NOTE: Supabase Auth (GoTrue) does not expose an API to list active user sessions/devices.
    """
    return {
        "supported": False,
        "sessions": []
    }

@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, current_user: dict = Depends(verify_token)):
    """
    Revoke selected session.
    NOTE: Supabase Auth (GoTrue) does not support targeted session revocation by ID.
    Thus, we return HTTP 501 Not Implemented.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Targeted session revocation is not supported by the identity provider."
    )

@router.delete("/sessions")
async def logout_other_sessions(request: Request, current_user: dict = Depends(verify_token)):
    """
    Logout all other sessions.
    """
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if is_supabase_active():
            try:
                # Sign out other sessions using scope 'others'
                get_supabase_client().auth.admin.sign_out(jwt=token, scope="others")
                return {"message": "Logged out of all other devices successfully."}
            except Exception as e:
                logger.error(f"Failed to logout other sessions: {str(e)}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to logout other sessions. Please try again."
                )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication token."
    )


@router.post("/logout")
async def logout(request: Request, current_user: dict = Depends(verify_token)):
    """
    Invalidates the current session server-side by signing out the user.
    The caller should also discard the access_token client-side.
    """
    authorization = request.headers.get("Authorization")
    if is_supabase_active() and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            # Invalidate the session associated with this JWT on the server
            get_supabase_client().auth.admin.sign_out(jwt=token, scope="global")
        except Exception as e:
            # Non-fatal — the token will expire naturally; still return success
            print(f"[WARN] Server-side sign-out error: {str(e)}")

    await log_audit_event(
        action="LOGOUT",
        entity_type="auth",
        actor_id=current_user.get("user_id"),
        firm_id=current_user.get("firm_id"),
        details={"email": current_user.get("email")},
        ip_address=get_client_ip(request)
    )
    return {"message": "Logged out successfully."}


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh_token(payload: schemas.TokenRefreshRequest):
    """
    Accepts a Supabase refresh_token and returns a new access_token.
    Used by clients to silently renew sessions before expiry.
    """
    if not is_supabase_active():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable. Supabase is not configured."
        )
    try:
        res = get_supabase_client().auth.refresh_session(payload.refresh_token)
        if not res.session or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )
        user = res.user
        metadata = user.user_metadata or {}
        firm_id = metadata.get("firm_id")
        if not firm_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile metadata is missing firm association."
            )
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "token_type": "bearer",
            "user_id": user.id,
            "firm_id": firm_id,
            "role": metadata.get("role", "ARTICLE"),
            "full_name": metadata.get("full_name", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed. Please login again."
        )

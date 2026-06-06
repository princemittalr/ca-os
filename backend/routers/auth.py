from fastapi import APIRouter, Depends, HTTPException, status, Request
from middleware.rate_limit import limiter, AUTH_LIMIT
import uuid

from models import schemas
from middleware.auth import verify_token
from config.supabase import supabase_client, is_supabase_active
from services import security

from services.audit_logger import log_audit_event, get_client_ip

router = APIRouter()

@router.post("/signup", response_model=schemas.TokenResponse)
async def signup_firm_user(payload: schemas.UserRegister):
    """
    Registers a new CA Firm user account using Supabase Auth.
    Automatically provisions firm tenant context and assigns roles.
    """
    email = payload.email
    password = payload.password
    full_name = payload.full_name
    firm_name = payload.firm_name
    role = payload.role or "PARTNER"

    # Provision dynamic tenant firm UUID
    firm_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    if is_supabase_active():
        try:
            # Register user in Supabase Auth with custom metadata
            res = supabase_client.auth.sign_up({
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
            # Log audit trail
            security.log_audit_event(
                firm_id=firm_id,
                actor_id=user.id,
                action="signup_firm_user",
                entity_type="users",
                entity_id=user.id,
                details={"firm_name": firm_name, "role": role}
            )
            
            if not res.session:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration succeeded but session could not be established. Please verify your email."
                )
                
            return {
                "access_token": res.session.access_token,
                "token_type": "bearer",
                "user_id": user.id,
                "firm_id": firm_id,
                "role": role,
                "full_name": full_name
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {str(e)}"
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
            res = supabase_client.auth.sign_in_with_password({
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
            security.log_audit_event(
                firm_id=firm_id,
                actor_id=user.id,
                action="login_success",
                entity_type="users",
                entity_id=user.id,
                details={"email": email}
            )
            log_audit_event(
                action="LOGIN_SUCCESS",
    entity_type="auth",
    actor_id=str(user.id),
    firm_id=firm_id,
    details={"email": email},
    ip_address=get_client_ip(request)
)
            return {
                "access_token": res.session.access_token,
                "token_type": "bearer",
                "user_id": user.id,
                "firm_id": firm_id,
                "role": role,
                "full_name": full_name
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
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


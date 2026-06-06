from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional, cast
from supabase import Client
from models import schemas
from config.supabase import supabase_client as _raw_supabase, is_supabase_active

_db: Client = cast(Client, _raw_supabase)
from middleware.auth import verify_token

router = APIRouter()


@router.get("/", response_model=List[schemas.AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(50, description="Number of records to return"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    current_user: dict = Depends(verify_token),
):
    """
    Fetch audit trail from persistent database.
    - Standard roles see only their own firm's logs.
    - SUPER_ADMIN can see all firms' logs.
    - CLIENT_VIEWER role has ip_address redacted from results.
    """
    if not is_supabase_active():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Audit trail unavailable. Database not configured.",
        )

    try:
        q = (
            _db.table("audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )

        # SUPER_ADMIN sees all firms; everyone else is scoped to their own firm
        if current_user.get("role") != "SUPER_ADMIN":
            q = q.eq("firm_id", current_user["firm_id"])

        if actor_id:
            q = q.eq("actor_id", actor_id)
        if entity_type:
            q = q.eq("entity_type", entity_type)

        res = q.execute()

        # CLIENT_VIEWER must not see IP addresses (PII / operational intel)
        is_viewer = current_user.get("role") == "CLIENT_VIEWER"
        if is_viewer:
            for row in res.data:
                row.pop("ip_address", None)

        return res.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit logs: {str(e)}",
        )

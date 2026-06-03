from fastapi import APIRouter, Query
from typing import List, Optional
from models import schemas
from config.supabase import supabase_client, is_supabase_active
from fastapi import HTTPException, status

router = APIRouter()

@router.get("/", response_model=List[schemas.AuditLogResponse])
async def get_audit_logs(
  limit: int = Query(50, description="Number of records to return"),
  actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
  entity_type: Optional[str] = Query(None, description="Filter by entity type")
):
  """Fetch audit trail from persistent database."""
  if not is_supabase_active():
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Audit trail unavailable. Database not configured."
    )
  try:
    q = supabase_client.table("audit_logs").select("*").order("created_at", desc=True).limit(limit)
    if actor_id:
      q = q.eq("actor_id", actor_id)
    if entity_type:
      q = q.eq("entity_type", entity_type)
    res = q.execute()
    
    # Map database columns to match AuditLogResponse schema requirements (e.g. actor_id -> user_id, entity_id null safety)
    mapped_data = []
    for row in res.data:
      mapped_row = dict(row)
      if "user_id" not in mapped_row or not mapped_row["user_id"]:
        mapped_row["user_id"] = mapped_row.get("actor_id") or "system"
      if "entity_id" not in mapped_row or mapped_row["entity_id"] is None:
        mapped_row["entity_id"] = str(mapped_row.get("entity_id") or "")
      mapped_data.append(mapped_row)
      
    return mapped_data
  except Exception as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Failed to fetch audit logs: {str(e)}"
    )

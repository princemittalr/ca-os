import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """Extract real client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def log_audit_event(
    action: str,
    entity_type: str,
    actor_id: Optional[str] = None,
    firm_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Log audit event to Supabase audit_logs table.
    Falls back to console logging if Supabase unavailable.
    """
    from config.supabase import supabase_client, is_supabase_active

    log_entry = {
        "id": str(uuid.uuid4()),
        "firm_id": firm_id,
        "actor_id": actor_id or "system",
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "ip_address": ip_address or "unknown",
        "created_at": datetime.utcnow().isoformat()
    }

    if is_supabase_active():
        try:
            supabase_client.table("audit_logs").insert(log_entry).execute()
            return
        except Exception as e:
            print(f"[AUDIT] Supabase write failed: {e}")

    # Console fallback
    print(f"[AUDIT] {datetime.utcnow()} | {action} | {entity_type} | actor={actor_id} | ip={ip_address}")
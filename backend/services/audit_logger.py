import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Extract real client IP, honouring reverse-proxy X-Forwarded-For header."""
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
    ip_address: Optional[str] = None,
) -> None:
    """
    Canonical audit event writer.

    Persists to the ``audit_logs`` Supabase table using the service-role
    client so that writes bypass Row-Level Security (RLS) — audit records
    must never be blocked by tenant policies.

    Schema written to DB:
        id          UUID (generated here)
        firm_id     UUID | NULL
        actor_id    text  (user UUID or "system")
        action      text
        entity_type text
        entity_id   text | NULL
        details     jsonb
        ip_address  text | NULL
        created_at  ISO-8601 timestamp

    Falls back to console logging if Supabase is unavailable so callers
    never need to guard against exceptions from this function.
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
        "ip_address": ip_address,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if is_supabase_active() and supabase_client is not None:
        try:
            supabase_client.table("audit_logs").insert(log_entry).execute()
            return
        except Exception as e:
            print(f"[AUDIT] Supabase write failed: {e}")

    # Console fallback — never raise, never swallow silently
    print(
        f"[AUDIT] {log_entry['created_at']} | {action} | {entity_type}"
        f" | actor={actor_id} | firm={firm_id} | ip={ip_address}"
    )
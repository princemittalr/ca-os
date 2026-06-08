import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Extract real client IP, honouring reverse-proxy X-Forwarded-For header."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _write_audit_sync(log_entry: dict) -> None:
    """Blocking Supabase write — runs in thread pool via asyncio.to_thread."""
    from config.supabase import get_supabase_client, is_supabase_active
    if is_supabase_active():
        get_supabase_client().table("audit_logs").insert(log_entry).execute()


async def log_audit_event(
    action: str,
    entity_type: str,
    actor_id: Optional[str] = None,
    firm_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Async audit writer. Offloads blocking Supabase insert to thread pool.
    Never raises — fallback to console on failure.

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
    """
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

    from config.supabase import is_supabase_active
    if is_supabase_active():
        try:
            await asyncio.to_thread(_write_audit_sync, log_entry)
            return
        except Exception as e:
            print(f"[AUDIT] Supabase write failed: {e}")

    # Console fallback — never raise, never swallow silently
    print(
        f"[AUDIT] {log_entry['created_at']} | {action} | {entity_type}"
        f" | actor={actor_id} | firm={firm_id} | ip={ip_address}"
    )

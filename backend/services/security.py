import os
from typing import Dict, Any, Optional
from datetime import datetime
from config.supabase import supabase_client, is_supabase_active

def log_audit_event(
    firm_id: str,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Writes a statutory auditor action audit trail log entry.
    Persists to Supabase audit_logs table if database is active.
    Otherwise fallbacks to standard console tracing in mock local dev.
    """
    timestamp = datetime.now().isoformat()
    log_data = {
        "firm_id": firm_id,
        "actor_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "created_at": timestamp
    }
    
    if is_supabase_active():
        try:
            res = supabase_client.table("audit_logs").insert(log_data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[WARN] Failed to persist audit log: {str(e)}")
            
    # Mock fallback audit console output
    print(f"[AUDIT LOG] [{timestamp}] Firm: {firm_id} | Actor: {actor_id} | Action: {action} | Entity: {entity_type}/{entity_id} | Details: {details}")
    return log_data

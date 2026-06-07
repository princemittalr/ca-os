from fastapi import APIRouter, Depends
from typing import List, Dict, Any, cast
from datetime import datetime, timezone
from middleware.auth import verify_token
from config.supabase import supabase_client, is_supabase_active

router = APIRouter()

def format_time_ago(dt_str: str) -> str:
    if not dt_str:
        return ""
    try:
        # Normalize ISO-8601 string timezone representation
        clean_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        
        # Ensure we operate in UTC timezone
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
            
        now = datetime.now(timezone.utc)
        diff = now - dt
        
        diff_secs = int(diff.total_seconds())
        if diff_secs < 0:
            return "Just now"
            
        diff_mins = diff_secs // 60
        diff_hours = diff_mins // 60
        diff_days = diff_hours // 24
        
        if diff_mins < 1:
            return "Just now"
        if diff_mins < 60:
            return f"{diff_mins}m ago"
        if diff_hours < 24:
            return f"{diff_hours}h ago"
        return f"{diff_days}d ago"
    except Exception:
        return ""

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
async def list_messages(current_user: dict = Depends(verify_token)):
    """
    Get recent communications from audit logs for the current user's firm.
    """
    if not is_supabase_active() or supabase_client is None:
        return []

    try:
        firm_id = current_user.get("firm_id")
        if not firm_id:
            return []

        res = (
            supabase_client.table("audit_logs")
            .select("*")
            .eq("firm_id", firm_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        data_list = cast(List[Dict[str, Any]], res.data)
        messages = []
        for log in data_list:
            actor = log.get("actor_id")
            sender = "System" if not actor or actor == "system" else str(actor)
            
            messages.append({
                "id": str(log.get("id") or ""),
                "sender": sender,
                "text": f"{log.get('action') or ''} on {log.get('entity_type') or ''}",
                "time": format_time_ago(str(log.get("created_at") or "")),
                "unread": False
            })
        return messages
    except Exception:
        return []

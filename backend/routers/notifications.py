from fastapi import APIRouter, HTTPException
from typing import List
from models import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.NotificationResponse])
async def list_notifications():
    """List all user notifications from persistent store."""
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        return []
    try:
        res = supabase_client.table("notifications").select("*").order("created_at", desc=True).limit(50).execute()
        return res.data
    except Exception as e:
        return []

@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        raise HTTPException(status_code=503, detail="Notification service unavailable.")
    try:
        res = supabase_client.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"status": "success", "notification": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/read-all")
async def mark_all_read():
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        raise HTTPException(status_code=503, detail="Notification service unavailable.")
    try:
        supabase_client.table("notifications").update({"is_read": True}).eq("is_read", False).execute()
        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import APIRouter, HTTPException
from typing import List
from app.models import schemas
from datetime import datetime, timedelta

router = APIRouter()

MOCK_NOTIFICATIONS = [
    {
        "id": "notif-1",
        "user_id": "mock-user-uuid-12345",
        "type": "reconciliation",
        "title": "Reconciliation complete",
        "message": "TechNova Solutions — March 2024 invoice matching finished successfully.",
        "is_read": False,
        "action_url": "/gst-recon/technova-march-2024",
        "created_at": datetime.now() - timedelta(hours=2)
    },
    {
        "id": "notif-2",
        "user_id": "mock-user-uuid-12345",
        "type": "reconciliation",
        "title": "Mismatch: 3 invoices found",
        "message": "Apex Innovations Pvt Ltd has 3 value mismatch invoices totaling ₹32,500.",
        "is_read": False,
        "action_url": "/gst-recon/apex-march-2024",
        "created_at": datetime.now() - timedelta(hours=5)
    },
    {
        "id": "notif-3",
        "user_id": "mock-user-uuid-12345",
        "type": "compliance",
        "title": "GSTR-1 filing due soon",
        "message": "Wayne Enterprises Ltd's GSTR-1 filing is due in 3 days.",
        "is_read": False,
        "action_url": "/compliance",
        "created_at": datetime.now() - timedelta(days=1)
    },
    {
        "id": "notif-4",
        "user_id": "mock-user-uuid-12345",
        "type": "compliance",
        "title": "GSTR-3B OVERDUE",
        "message": "Global Trade LLC filing is OVERDUE since yesterday.",
        "is_read": False,
        "action_url": "/compliance",
        "created_at": datetime.now() - timedelta(days=2)
    },
    {
        "id": "notif-5",
        "user_id": "mock-user-uuid-12345",
        "type": "system",
        "title": "Security alert",
        "message": "Successful login detected from new IP address: 192.168.1.15.",
        "is_read": True,
        "action_url": "/settings",
        "created_at": datetime.now() - timedelta(days=5)
    }
]

@router.get("/", response_model=List[schemas.NotificationResponse])
async def list_notifications():
    """List all user notifications."""
    return MOCK_NOTIFICATIONS

@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["is_read"] = True
            return {"status": "success", "notification": n}
    raise HTTPException(status_code=404, detail="Notification not found")

@router.post("/read-all")
async def mark_all_read():
    """Mark all notifications as read."""
    for n in MOCK_NOTIFICATIONS:
        n["is_read"] = True
    return {"status": "success", "message": "All notifications marked as read"}


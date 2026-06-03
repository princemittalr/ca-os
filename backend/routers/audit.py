from fastapi import APIRouter
from typing import List
from app.models import schemas
from datetime import datetime, timedelta

router = APIRouter()

MOCK_AUDIT_LOGS = [
    {
        "id": "log-1",
        "user_id": "mock-user-uuid-12345",
        "action": "RECONCILE",
        "entity_type": "reconciliation",
        "entity_id": "recon-1001",
        "details": {"client": "TechNova Solutions Pvt Ltd", "period": "March 2024", "matches": 1102, "mismatches": 52},
        "ip_address": "192.168.1.15",
        "created_at": datetime.now() - timedelta(hours=2)
    },
    {
        "id": "log-2",
        "user_id": "mock-user-uuid-12345",
        "action": "CREATE",
        "entity_type": "client",
        "entity_id": "client-5",
        "details": {"client_name": "Sharma Traders", "gstin": "09AABCS7890E1Z9"},
        "ip_address": "192.168.1.15",
        "created_at": datetime.now() - timedelta(days=1)
    },
    {
        "id": "log-3",
        "user_id": "mock-user-uuid-12345",
        "action": "EXPORT",
        "entity_type": "excel_report",
        "entity_id": "recon-998",
        "details": {"client": "Apex Innovations", "period": "February 2024"},
        "ip_address": "192.168.1.20",
        "created_at": datetime.now() - timedelta(days=2)
    },
    {
        "id": "log-4",
        "user_id": "mock-user-uuid-12345",
        "action": "LOGIN",
        "entity_type": "user",
        "entity_id": "mock-user-uuid-12345",
        "details": {"login_status": "success"},
        "ip_address": "192.168.1.15",
        "created_at": datetime.now() - timedelta(days=3)
    }
]

@router.get("/", response_model=List[schemas.AuditLogResponse])
async def get_audit_logs():
    """Fetch user audit log trails."""
    return MOCK_AUDIT_LOGS


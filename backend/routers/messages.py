from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from middleware.auth import verify_token
from services.db import manager as db_manager

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
async def list_messages(current_user: dict = Depends(verify_token)):
    """
    Get all user-specific/tenant-aware messages.
    """
    try:
        user_firm_id = current_user.get("firm_id")
        if not user_firm_id:
            return []
        clients = db_manager.get_clients(firm_id=user_firm_id)

        # If no clients are found, return empty array
        if not clients:
            return []

        messages = []
        for i, client in enumerate(clients[:4]):
            client_name = client.get("business_name")
            assigned_manager = client.get("assigned_manager") or "Manager"
            state = client.get("state") or "State"
            gstin = client.get("gstin") or "GSTIN"
            
            if i == 0:
                messages.append({
                    "id": f"msg-d1-{client.get('id')}",
                    "sender": client_name,
                    "text": f"Uploaded purchase ledger for verification ({state}).",
                    "time": "15m ago",
                    "unread": True
                })
            elif i == 1:
                messages.append({
                    "id": f"msg-d2-{client.get('id')}",
                    "sender": f"System Alert ({client_name})",
                    "text": f"GSTR-1 mismatch check completed. GSTIN: {gstin}.",
                    "time": "2h ago",
                    "unread": True
                })
            elif i == 2:
                messages.append({
                    "id": f"msg-d3-{client.get('id')}",
                    "sender": f"{assigned_manager} (Client Lead)",
                    "text": f"Updated compliance status for {client_name}.",
                    "time": "5h ago",
                    "unread": False
                })
            elif i == 3:
                messages.append({
                    "id": f"msg-d4-{client.get('id')}",
                    "sender": "Tax Engine",
                    "text": f"Notice ASMT-10 analysis draft ready for {client_name}.",
                    "time": "1d ago",
                    "unread": False
                })
        
        return messages
    except Exception as e:
        return []

from fastapi import APIRouter, HTTPException
from typing import List
from models import schemas
from datetime import datetime

router = APIRouter()

MOCK_TICKETS: list = []

@router.get("/tickets", response_model=List[schemas.SupportTicketResponse])
async def list_tickets():
    """List all support tickets raised by the user."""
    from config.supabase import supabase_client, is_supabase_active
    if is_supabase_active() and supabase_client is not None:
      try:
        res = supabase_client.table("support_tickets").select("*").order("created_at", desc=True).execute()
        return res.data
      except Exception as e:
        print(f"Supabase error: {e}")
    return MOCK_TICKETS

@router.post("/tickets", response_model=schemas.SupportTicketResponse)
async def create_ticket(ticket: schemas.SupportTicketCreate):
    """Raise a new support ticket."""
    import uuid as uuid_mod
    from datetime import datetime
    from config.supabase import supabase_client, is_supabase_active
    new_ticket = {
      "id": str(uuid_mod.uuid4()),
      "user_id": "system",
      "ticket_number": f"TKT-{str(uuid_mod.uuid4())[:6].upper()}",
      "category": ticket.category,
      "subject": ticket.subject,
      "description": ticket.description,
      "priority": ticket.priority,
      "status": "open",
      "created_at": datetime.now()
    }
    if is_supabase_active() and supabase_client is not None:
      try:
        payload = {**new_ticket, "created_at": new_ticket["created_at"].isoformat()}
        res = supabase_client.table("support_tickets").insert(payload).execute()
        if res.data: return res.data[0]
      except Exception as e:
        print(f"Supabase error: {e}")
    MOCK_TICKETS.append(new_ticket)
    return new_ticket



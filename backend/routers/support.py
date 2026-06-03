from fastapi import APIRouter, HTTPException
from typing import List
from app.models import schemas
from datetime import datetime

router = APIRouter()

MOCK_TICKETS = [
    {
        "id": "tkt-1",
        "user_id": "mock-user-uuid-12345",
        "ticket_number": "TKT-001",
        "category": "Reconciliation",
        "subject": "Fuzzy matching score threshold query",
        "description": "How do we adjust the fuzzy matching ratio threshold from 85 to 90 for certain suppliers?",
        "priority": "medium",
        "status": "open",
        "created_at": datetime.now()
    },
    {
        "id": "tkt-2",
        "user_id": "mock-user-uuid-12345",
        "ticket_number": "TKT-002",
        "category": "Billing",
        "subject": "GST details not printing on invoice",
        "description": "Our firm's GSTIN is not appearing in the monthly invoice for our subscription. Please update.",
        "priority": "low",
        "status": "resolved",
        "created_at": datetime.now()
    }
]

@router.get("/tickets", response_model=List[schemas.SupportTicketResponse])
async def list_tickets():
    """List all support tickets raised by the user."""
    return MOCK_TICKETS

@router.post("/tickets", response_model=schemas.SupportTicketResponse)
async def create_ticket(ticket: schemas.SupportTicketCreate):
    """Raise a new support ticket."""
    new_ticket = {
        "id": f"tkt-{len(MOCK_TICKETS) + 1}",
        "user_id": "mock-user-uuid-12345",
        "ticket_number": f"TKT-00{len(MOCK_TICKETS) + 1}",
        "category": ticket.category,
        "subject": ticket.subject,
        "description": ticket.description,
        "priority": ticket.priority,
        "status": "open",
        "created_at": datetime.now()
    }
    MOCK_TICKETS.append(new_ticket)
    return new_ticket


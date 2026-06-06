from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional, cast
from models import schemas
from datetime import datetime

router = APIRouter()

@router.get("/tickets", response_model=List[schemas.SupportTicketResponse])
async def list_tickets():
    """List all support tickets raised by the user."""
    from config.supabase import supabase_client, is_supabase_active
    if is_supabase_active() and supabase_client is not None:
      try:
        res = supabase_client.table("support_tickets").select("*").order("created_at", desc=True).execute()
        tickets_list = []
        db_tickets = cast(List[Dict[str, Any]], res.data)
        for t in db_tickets:
            # Only return persisted data. Return empty replies array if not present.
            t["replies"] = t.get("replies") or []
            if "agent" in t:
                t["agent"] = t.get("agent")
            if "timeline" in t:
                t["timeline"] = t.get("timeline")
            tickets_list.append(t)
        return tickets_list
      except Exception as e:
        print(f"Supabase error: {e}")
    return []

@router.post("/tickets", response_model=schemas.SupportTicketResponse)
async def create_ticket(ticket: schemas.SupportTicketCreate):
    """Raise a new support ticket."""
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        raise HTTPException(status_code=503, detail="Support service unavailable.")
        
    import uuid as uuid_mod
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
    try:
        payload = {
          "id": new_ticket["id"],
          "user_id": new_ticket["user_id"],
          "ticket_number": new_ticket["ticket_number"],
          "category": new_ticket["category"],
          "subject": new_ticket["subject"],
          "description": new_ticket["description"],
          "priority": new_ticket["priority"],
          "status": new_ticket["status"],
          "created_at": new_ticket["created_at"].isoformat()
        }
        res = supabase_client.table("support_tickets").insert(payload).execute()
        if res.data: 
            ret = cast(Dict[str, Any], res.data[0])
            ret["replies"] = ret.get("replies") or []
            return ret
    except Exception as e:
        print(f"Supabase error: {e}")
    raise HTTPException(status_code=503, detail="Support service unavailable.")

@router.post("/tickets/{ticket_id}/replies")
async def add_reply(ticket_id: str, payload: dict):
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        raise HTTPException(status_code=503, detail="Support service unavailable.")
        
    try:
        res = supabase_client.table("support_tickets").select("*").eq("id", ticket_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        db_t = cast(Dict[str, Any], res.data[0])
    except HTTPException:
        raise
    except Exception as e:
        print(f"Supabase query error: {e}")
        raise HTTPException(status_code=404, detail="Ticket not found")

    # If support_tickets table contains a replies field, update it directly
    if "replies" in db_t:
        try:
            current_replies = db_t.get("replies") or []
            if not isinstance(current_replies, list):
                current_replies = []
            new_reply = {
                "sender": payload.get("sender", "user"),
                "text": payload.get("text"),
                "date": payload.get("date") or datetime.now().strftime("%d-%m-%Y %H:%M")
            }
            updated_replies = current_replies + [new_reply]
            update_res = supabase_client.table("support_tickets").update({"replies": updated_replies}).eq("id", ticket_id).execute()
            if update_res.data:
                ret = cast(Dict[str, Any], update_res.data[0])
                ret["replies"] = updated_replies
                return ret
        except Exception as e:
            print(f"Failed to update replies field: {e}")

    # If support_replies table exists, insert row there
    try:
        reply_payload = {
            "ticket_id": ticket_id,
            "sender": payload.get("sender", "user"),
            "text": payload.get("text"),
            "date": payload.get("date") or datetime.now().strftime("%d-%m-%Y %H:%M")
        }
        reply_res = supabase_client.table("support_replies").insert(reply_payload).execute()
        if reply_res.data:
            db_t["replies"] = [cast(Dict[str, Any], r) for r in reply_res.data]
            return db_t
    except Exception as e:
        print(f"Failed to insert into support_replies: {e}")

    # Otherwise, return HTTP 501
    raise HTTPException(
        status_code=501,
        detail="Support reply persistence has not been configured."
    )

@router.post("/chat")
async def chat_bot(payload: dict):
    message = payload.get("message", "")
    normalized = message.lower()
    
    reply_text = "Thank you for reaching out to Reckon AI support! I am processing your query to check our legal database. Would you like to map this to a specific GSTR return window?"
    agent_data = None
    
    if "recon" in normalized or "gst" in normalized:
        reply_text = "GST reconciliation discrepancies are usually caused by mismatching Form 2A/2B ledgers. I highly recommend running the 'Auto-Reconciliation Agent' in the Automation module to auto-resolve invoice discrepancies. Would you like me to connect you to a live CA on duty to double-check?"
    elif "challan" in normalized or "tds" in normalized or "mismatch" in normalized:
        reply_text = "TDS or GSTR challan mismatches usually indicate a filing discrepancy in Form 26AS. Please make sure that you've imported the correct quarterly challan XML inside our 'Import Recon' portal. Let me know if you want to connect to a live accountant."
    elif any(x in normalized for x in ["human", "live", "talk", "agent", "person"]):
        reply_text = "Connecting you to a live senior Chartered Accountant on duty... CA Rahul Sharma (Partner / Audit Head) has joined the thread. 'Hi! I'm Rahul. How can I help you resolve your compliance error today?'"
        agent_data = {
            "name": "Rahul Sharma (CA)",
            "role": "Senior CA / Audit Partner",
            "avatar": "RS"
        }
    elif any(x in normalized for x in ["license", "seat", "billing"]):
        reply_text = "For subscription, seat licensing, or invoice billing issues, you can upgrade your plan directly in 'Firm Settings > Billing' tab. Alternatively, I can route this to our accounts desk immediately."
        
    from services.ai.provider import get_active_provider
    provider = get_active_provider()
    if provider and not any(x in normalized for x in ["human", "live", "talk", "agent", "person"]):
        try:
            prompt = (
                f"You are Reckon AI's support chatbot (CA Co-Pilot AI). "
                f"Answer the following user query about Indian GST, GSTR reconciliation, compliance, "
                f"or our SaaS app. Keep it professional, helpful, and concise (2-3 sentences):\n"
                f"User: {message}"
            )
            schema = "{\n  \"reply\": \"Your professional support response\"\n}"
            data = await provider.generate_structured_json(prompt, schema)
            reply_text = data.get("reply", reply_text)
        except Exception as e:
            print(f"Chat AI call failed: {e}")
            
    response = {"reply": reply_text}
    if agent_data:
        response["agent"] = agent_data
    return response

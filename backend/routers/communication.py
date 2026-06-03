from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from io import BytesIO

from models import schemas
from services.db import manager as db_manager
from services import communication
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

@router.get("/{client_id}", response_model=List[schemas.CommunicationResponse])
async def get_client_communications(client_id: str):
    """Retrieve all communication drafts scoped to a specific client."""
    return db_manager.get_communications(client_id)

@router.post("/generate", response_model=schemas.CommunicationResponse)
async def generate_outreach_draft(payload: schemas.CommunicationGenerateRequest):
    """Generates a professional GST compliance mismatch follow-up draft dynamically."""
    try:
        data_dict = payload.model_dump()
        draft = db_manager.create_communication(data_dict)
        return draft
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An error occurred while compiling notice drafts: {str(e)}"
        )

@router.put("/{comm_id}/status")
async def update_draft_status(comm_id: str, new_status: str):
    """Updates the workflow status (Drafted, Sent, Vendor Responded, Resolved)."""
    success = db_manager.update_communication_status(comm_id, new_status)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outreach draft not found."
        )
    return {"status": "ok", "message": f"Updated status to {new_status}."}

@router.get("/export/pdf")
async def export_notice_pdf(vendor_name: str, gstin: str, issue: str, deadline: str, body: str, priority: str = "HIGH"):
    """Generates and streams back an official ReportLab PDF notice letter."""
    try:
        notice_data = {
            "vendor_name": vendor_name,
            "gstin": gstin,
            "issue": issue,
            "recommended_deadline": deadline,
            "email_body": body,
            "priority": priority
        }
        
        pdf_bytes = communication.compile_notice_letter_pdf(notice_data)
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Compliance_Notice_{vendor_name.replace(' ', '_')}.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An error occurred while compiling notice PDF: {str(e)}"
        )


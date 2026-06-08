from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from io import BytesIO
import logging

from models import schemas
from services.db import manager as db_manager
from services import communication
from middleware.auth import verify_token, RequireRoles

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{client_id}", response_model=List[schemas.CommunicationResponse])
async def get_client_communications(
    client_id: str,
    current_user: dict = Depends(verify_token)
):
    """Retrieve all communication drafts scoped to a specific client."""
    # Verify client belongs to firm
    client = db_manager.get_client_by_id(client_id, firm_id=current_user["firm_id"])
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return db_manager.get_communications(client_id)

@router.post("/generate", response_model=schemas.CommunicationResponse)
async def generate_outreach_draft(
    payload: schemas.CommunicationGenerateRequest,
    current_user: dict = Depends(verify_token)
):
    """Generates a professional GST compliance mismatch follow-up draft dynamically."""
    # Validate firm ownership if client_id is available
    if payload.client_id:
        client = db_manager.get_client_by_id(payload.client_id, firm_id=current_user["firm_id"])
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    # Inject firm_id from token — never from payload
    data = payload.model_dump()
    data["firm_id"] = current_user["firm_id"]

    try:
        draft = db_manager.create_communication(data)
        return draft
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Communication creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create communication draft."
        )

@router.put("/{comm_id}/status")
async def update_draft_status(
    comm_id: str,
    new_status: str,
    current_user: dict = Depends(verify_token)
):
    """Updates the workflow status (Drafted, Sent, Vendor Responded, Resolved)."""
    success = db_manager.update_communication_status(comm_id, new_status)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outreach draft not found."
        )
    return {"status": "ok", "message": f"Updated status to {new_status}."}

@router.get("/export/pdf")
async def export_notice_pdf(
    vendor_name: str,
    gstin: str,
    issue: str,
    deadline: str,
    body: str,
    priority: str = "HIGH",
    client_id: str = None,
    current_user: dict = Depends(verify_token)
):
    """Generates and streams back an official ReportLab PDF notice letter."""
    # Verify firm ownership if client_id is provided
    if client_id:
        client = db_manager.get_client_by_id(client_id, firm_id=current_user["firm_id"])
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

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
        logger.error(f"An error occurred while compiling notice PDF: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An error occurred while compiling notice PDF. Please try again."
        )


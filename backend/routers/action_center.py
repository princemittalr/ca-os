from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from models import schemas
from services.db import manager as db_manager
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

@router.get("", response_model=List[schemas.ActionItemResponse])
async def get_ranked_action_items():
    """
    Get unified CA operational action items ranked by risk-weighted indicators.
    """
    return db_manager.get_action_items()

@router.get("/summary", response_model=schemas.ActionCenterSummaryResponse)
async def get_action_center_summary():
    """
    Exposes high-level daily copilot narrative briefings and totals.
    """
    active = db_manager.get_action_items()
    high_priority = [a for a in active if a["priority"] == "HIGH"]
    
    itc_exposure = sum(float(a.get("exposure_amount", 0.0)) for a in active)
            
    from services.action_center import generate_daily_summary
    summary_data = generate_daily_summary()
    summary_text = summary_data["daily_summary"]
    
    return {
        "total_actions": len(active),
        "high_priority_count": len(high_priority),
        "pending_itc_exposure": itc_exposure,
        "daily_summary": summary_text
    }

@router.put("/{action_id}/resolve", response_model=schemas.ActionItemResponse)
async def resolve_copilot_item(action_id: str):
    """
    Mark a copilot action item as resolved.
    """
    resolved_item = db_manager.resolve_action_item(action_id)
    if not resolved_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action item with ID '{action_id}' not found."
        )
    return resolved_item

from pydantic import BaseModel

class ActionAssignRequest(BaseModel):
    assigned_to: str

@router.put("/{action_id}/assign", response_model=schemas.ActionItemResponse)
async def assign_copilot_item(action_id: str, payload: ActionAssignRequest):
    """
    Assign a staff member to a copilot action item.
    """
    updated_item = db_manager.update_action_assignment(action_id, payload.assigned_to)
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action item with ID '{action_id}' not found."
        )
    return updated_item



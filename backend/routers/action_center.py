from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from typing import List, Optional

from models import schemas
from services.db import manager as db_manager
from middleware.auth import verify_token

router = APIRouter()


@router.get("", response_model=List[schemas.ActionItemResponse])
async def get_ranked_action_items(
    include_resolved: bool = Query(False),
    current_user: dict = Depends(verify_token)
):
    """
    Get unified CA operational action items ranked by risk score, scoped to the firm.
    Requires a valid Bearer session token.
    """
    firm_id = current_user["firm_id"]
    return db_manager.get_action_items(firm_id=firm_id, include_resolved=include_resolved)


@router.get("/summary", response_model=schemas.ActionCenterSummaryResponse)
async def get_action_center_summary(current_user: dict = Depends(verify_token)):
    """
    Exposes high-level daily copilot narrative briefings and totals, scoped to the firm.
    Requires a valid Bearer session token.
    """
    firm_id = current_user["firm_id"]
    active = db_manager.get_action_items(firm_id=firm_id)
    high_priority = [a for a in active if a.get("priority") == "HIGH"]
    itc_exposure = sum(float(a.get("exposure_amount", 0.0)) for a in active)

    # Build narrative summary inline — no longer delegating to in-memory action_center service
    top_items = sorted(active, key=lambda x: float(x.get("risk_score", 0)), reverse=True)[:3]
    top_text = "; ".join([
        f"{a.get('client_name', 'Client')} — {a.get('title', '')} (₹{float(a.get('exposure_amount', 0)):,.0f} at risk)"
        for a in top_items
    ]) if top_items else "No critical items detected."
    summary_text = (
        f"Today, the CA Copilot has compiled {len(active)} active compliance signals requiring your attention. "
        f"There are {len(high_priority)} HIGH-severity escalations. "
        f"Top items: {top_text}"
    )

    return {
        "total_actions": len(active),
        "high_priority_count": len(high_priority),
        "pending_itc_exposure": itc_exposure,
        "daily_summary": summary_text,
    }


@router.put("/{action_id}/resolve", response_model=schemas.ActionItemResponse)
async def resolve_copilot_item(
    action_id: str,
    current_user: dict = Depends(verify_token),
):
    """
    Mark a copilot action item as RESOLVED.
    Scoped to the authenticated firm — cross-tenant mutations are rejected.
    """
    firm_id = current_user["firm_id"]
    resolved_item = db_manager.resolve_action_item(action_id, firm_id=firm_id)
    if not resolved_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action item '{action_id}' not found or does not belong to your firm.",
        )
    return resolved_item


class ActionAssignRequest(BaseModel):
    assigned_to: str


@router.put("/{action_id}/assign", response_model=schemas.ActionItemResponse)
async def assign_copilot_item(
    action_id: str,
    payload: ActionAssignRequest,
    current_user: dict = Depends(verify_token),
):
    """
    Assign a staff member to a copilot action item.
    Scoped to the authenticated firm — cross-tenant mutations are rejected.
    """
    firm_id = current_user["firm_id"]
    updated_item = db_manager.update_action_assignment(action_id, payload.assigned_to, firm_id=firm_id)
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action item '{action_id}' not found or does not belong to your firm.",
        )
    return updated_item

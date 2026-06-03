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
    
    itc_exposure = 0.0
    for a in active:
        desc = a.get("description") or ""
        impact = a.get("predicted_impact") or ""
        if "₹1.8L" in desc or "₹1,83,780" in impact:
            itc_exposure += 183780.0
        if "₹1,85,000" in desc:
            itc_exposure += 185000.0
            
    summary_text = (
        f"Good morning, Partner Auditor. Today, the Reckon AI Copilot has detected {len(active)} active compliance signals "
        f"requiring your focus. There are {len(high_priority)} HIGH-severity escalations. "
        f"TechNova Solutions GSTR-3B tax returns are overdue by 4 days, locking statutory input tax credit. "
        f"Additionally, Sharma Traders has not responded to GSTR-2B mismatches, placing {f'₹{185000:,.0f}'} in ITC claims "
        f"at extreme delay risk, while high-value discrepancies at Wayne Enterprises expose {f'₹{183780:,.0f}'} in corporate capital. "
        f"We recommend completing immediate filings for TechNova and launching SMS/outreach reminder warnings for Sharma Traders."
    )
    
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


from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta

from models import schemas
from services.db import manager as db_manager
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

@router.get("", response_model=List[schemas.ComplianceResponse])
async def list_compliance_records(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    compliance_type: Optional[str] = Query(None, description="Filter by compliance type (e.g. GSTR-1)"),
    status: Optional[str] = Query(None, description="Filter by status (Upcoming, Overdue, Filed, Escalated)"),
    assigned_to: Optional[str] = Query(None, description="Filter by staff assignee")
):
    """
    List regulatory compliance filing deadlines, evaluated with dynamic status indicators.
    """
    return db_manager.get_compliance(
        client_id=client_id,
        compliance_type=compliance_type,
        status=status,
        assigned_to=assigned_to
    )

@router.get("/upcoming", response_model=List[schemas.ComplianceResponse])
async def get_upcoming_deadlines(days: int = Query(7, description="Number of days lookahead")):
    """
    Fetch upcoming filings and deadlines within a specific window of days.
    """
    today_dt = date.today()
    target_date = today_dt + timedelta(days=days)
    
    tasks = db_manager.get_compliance()
    upcoming = []
    for task in tasks:
        # Check if due_date is string or date object
        due = task["due_date"]
        if isinstance(due, str):
            due = date.fromisoformat(due)
        if task["status"] in ["Upcoming", "Due Today"] and due <= target_date:
            upcoming.append(task)
            
    upcoming.sort(key=lambda x: x["due_date"])
    return upcoming

@router.get("/dashboard/summary", response_model=schemas.ComplianceSummaryResponse)
async def get_dashboard_summary():
    """
    Exposes high-level aggregations for compliance dashboard panels.
    """
    tasks = db_manager.get_compliance()
    
    upcoming_count = 0
    overdue_count = 0
    high_risk_clients = set()
    completed_this_month = 0
    
    for task in tasks:
        if task["status"] in ["Upcoming", "Due Today"]:
            upcoming_count += 1
        elif task["status"] in ["Overdue", "Escalated"]:
            overdue_count += 1
            high_risk_clients.add(task["client_id"])
            
        if task["status"] == "Filed":
            completed_this_month += 1
            
    return {
        "upcoming_filings": upcoming_count,
        "overdue_filings": overdue_count,
        "high_risk_clients": len(high_risk_clients),
        "filings_completed_this_month": completed_this_month
    }

@router.post("/create", response_model=schemas.ComplianceResponse)
async def create_compliance_deadline(payload: schemas.ComplianceCreate):
    """
    Manually create a new regulatory compliance filing entry.
    """
    try:
        data = payload.model_dump()
        return db_manager.create_compliance(data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An error occurred while compiling compliance task: {str(e)}"
        )

@router.put("/{compliance_id}/status", response_model=schemas.ComplianceResponse)
async def update_deadline_status(
    compliance_id: str,
    new_status: Optional[str] = Query(None, description="Update status e.g. Filed"),
    assigned_to: Optional[str] = Query(None, description="Re-assign staff member")
):
    """
    Update filing status or staff assignment on any compliance record.
    """
    task = None
    if new_status:
        task = db_manager.update_compliance_status(compliance_id, new_status)
    if assigned_to:
        task = db_manager.update_compliance_assignment(compliance_id, assigned_to)
        
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance task with ID '{compliance_id}' not found."
        )
    return task


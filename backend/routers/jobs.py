from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any

from models import schemas
from middleware.auth import verify_token, RequireRoles
from services.db import manager as db_manager
from services.jobs.queue import job_queue
from services.jobs import tasks

# Globally protect the jobs command router with firm auditing RBAC guards
router = APIRouter()

@router.get("", response_model=List[schemas.JobResponse])
async def list_background_jobs():
    """
    Retrieves history logs of all background processes and scheduled automated tasks.
    """
    return db_manager.get_jobs()

@router.get("/notifications", response_model=List[schemas.NotificationLogResponse])
async def list_notifications_logs():
    """
    Retrieves audit logs of statutory compliance outreach warnings and reminders sent.
    """
    return db_manager.get_notifications_log()

@router.get("/{job_id}", response_model=schemas.JobResponse)
async def get_job_details(job_id: str):
    """
    Fetch exact state tracking logs of any background task worker by ID.
    """
    job = db_manager.get_job_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )
    return job

@router.post("/{job_id}/retry", response_model=schemas.JobResponse)
async def retry_failed_job(job_id: str):
    """
    Enforces manual retry executions for failed, halted background tasks.
    """
    job = db_manager.get_job_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )
        
    if job["status"] != "FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only failed tasks can be retried. Current status is: {job['status']}"
        )
        
    # Trigger new execution run based on original type
    job_type = job["job_type"]
    task_func = None
    
    if job_type == "action_center_refresh":
        task_func = tasks.action_center_refresh_task
    elif job_type == "compliance_reminders":
        task_func = tasks.compliance_reminders_task
    elif job_type == "overdue_escalation":
        task_func = tasks.overdue_escalation_task
    elif job_type == "nightly_reconciliation" or job_type == "report_generation":
        task_func = tasks.nightly_reconciliation_summary_job
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported task type for retrying: {job_type}"
        )
        
    # Enqueue a fresh job execution run
    new_job = job_queue.enqueue(job_type, task_func)
    
    # Update old job log to link to new execution run
    db_manager.update_job(job_id, {"error_logs": f"Manually retried as new job: {new_job['job_id']}"})
    
    return new_job

@router.post("/trigger", response_model=schemas.JobResponse)
async def force_trigger_job(payload: schemas.JobTriggerRequest):
    """
    Force launches scheduled cron sweeps immediately from the Operations desk.
    """
    job_type = payload.job_type
    task_func = None
    
    if job_type == "action_center_refresh":
        task_func = tasks.action_center_refresh_task
    elif job_type == "compliance_reminders":
        task_func = tasks.compliance_reminders_task
    elif job_type == "overdue_escalation":
        task_func = tasks.overdue_escalation_task
    elif job_type == "nightly_reconciliation":
        task_func = tasks.nightly_reconciliation_summary_job
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid periodic automation job type: {job_type}"
        )
        
    return job_queue.enqueue(job_type, task_func)


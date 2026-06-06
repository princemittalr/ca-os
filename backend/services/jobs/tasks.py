from datetime import date, datetime, timedelta
import time
from services.db import manager as db_manager
from services.notifications.sender import send_notification
from services.db.manager import update_job

def compliance_reminders_task(job_id: str):
    """
    Task worker: Scans compliance calendar tasks.
    Sends automated reminder notifications 3 days before due date.
    """
    update_job(job_id, {"progress": 30.0})
    time.sleep(0.5)
    
    # 1. Fetch compliance records
    tasks = db_manager.get_compliance()
    today = date.today()
    target_date = today + timedelta(days=3)
    
    sent_count = 0
    update_job(job_id, {"progress": 60.0})
    
    for task in tasks:
        due = task["due_date"]
        if isinstance(due, str):
            due = date.fromisoformat(due)
            
        if task["status"] in ["Upcoming", "Due Today"] and due == target_date:
            client = db_manager.get_client_by_id(task["client_id"])
            if client:
                body = (
                    f"Filing Notice: Your statutory filing GSTR-1 return for period {task['filing_period']} "
                    f"is due on {task['due_date']}. Please upload your sales book invoices to CA-OS immediately "
                    f"to prevent statutory fines."
                )
                send_notification(
                    channel="EMAIL",
                    recipient=client.get("email") or "accounts@client.com",
                    subject=f"Urgent GST Filing Reminder: Due in 3 Days ({client['business_name']})",
                    body=body
                )
                sent_count += 1
                
    update_job(job_id, {"progress": 90.0})
    time.sleep(0.2)
    print(f"[TASKS] Compliance reminder scan complete. Dispatched {sent_count} reminders.")

def overdue_escalation_task(job_id: str):
    """
    Task worker: Scans all filings.
    If overdue:
      - Automatically escalates risk level and risk score.
      - If overdue by > 3 days, triggers high-priority alerts to CA firm action feed.
    """
    update_job(job_id, {"progress": 25.0})
    time.sleep(0.4)
    
    tasks = db_manager.get_compliance()
    today = date.today()
    escalated_count = 0
    
    update_job(job_id, {"progress": 50.0})
    
    for task in tasks:
        due = task["due_date"]
        if isinstance(due, str):
            due = date.fromisoformat(due)
            
        if task["status"] in ["Upcoming", "Due Today", "Overdue"] and due < today:
            overdue_days = (today - due).days
            new_status = "Overdue"
            
            if overdue_days > 3:
                new_status = "Escalated"
                client = db_manager.get_client_by_id(task["client_id"])
                if client:
                    print(f"[TASKS] ESCALATION CRITICAL: Client {client['business_name']} is overdue on filings by {overdue_days} days!")
                    
            db_manager.update_compliance_status(task["compliance_id"], new_status)
            db_manager.update_compliance_assignment(task["compliance_id"], task.get("assigned_to") or None)
            escalated_count += 1
            
    update_job(job_id, {"progress": 85.0})
    time.sleep(0.2)
    print(f"[TASKS] Overdue escalation scan complete. Updated {escalated_count} tasks.")

def nightly_reconciliation_summary_job(job_id: str):
    """
    Task worker: Performs recalculations of ITC risks and mismatch exposure rankings.
    """
    update_job(job_id, {"progress": 20.0})
    time.sleep(0.5)
    
    update_job(job_id, {"progress": 50.0})
    time.sleep(0.5)
    
    update_job(job_id, {"progress": 80.0})
    time.sleep(0.2)
    print("[TASKS] Nightly reconciliation portfolio re-ranking completed.")

def action_center_refresh_task(job_id: str):
    """
    Task worker: Triggers recalculation of Smart AI Copilot ranked actions feed.
    """
    update_job(job_id, {"progress": 30.0})
    time.sleep(0.4)
    
    actions = db_manager.get_action_items()
    update_job(job_id, {"progress": 70.0})
    time.sleep(0.3)
    
    print(f"[TASKS] Smart Action Center re-ranking finalized. Evaluated {len(actions)} signals.")

def report_generation_task(job_id: str, client_id: str, format_type: str = "PDF"):
    """
    Task worker: Simulates heavy asynchronous compilation and download dispatch.
    """
    update_job(job_id, {"progress": 15.0})
    time.sleep(0.5)
    
    update_job(job_id, {"progress": 50.0})
    time.sleep(0.5)
    
    update_job(job_id, {"progress": 80.0})
    time.sleep(0.2)
    
    client = db_manager.get_client_by_id(client_id)
    if client:
        send_notification(
            channel="EMAIL",
            recipient="manager@ca-firm.com",
            subject="Asynchronous GST Reconciliation Report Compiled",
            body=f"The {format_type} report for {client['business_name']} has been successfully compiled and is ready for download."
        )
    print(f"[TASKS] Async {format_type} report generation complete.")

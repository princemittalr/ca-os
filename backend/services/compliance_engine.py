from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional

# Preloaded compliance tasks
MOCK_COMPLIANCE: list = []

def sync_to_action_engine(task: Dict[str, Any]):
    try:
        from services.action_engine import action_engine
        
        status = task.get("status")
        act_id = f"act-comp-{task['compliance_id']}"
        
        if status == "Filed":
            action_engine.resolve_action_item(act_id)
            return
            
        if status not in ["Overdue", "Escalated", "Due Today"]:
            return

        action_state = "NEW"
        if status == "Escalated":
            action_state = "IN_PROGRESS"
            
        comp_type = task.get("compliance_type", "Filing")
        period = task.get("filing_period", "")
        title = f"Filing {status}: {comp_type} ({period})"
        description = f"Filing task {comp_type} for period {period} is {status.lower()}. Due date: {task.get('due_date')}."
        
        exposure = 5000.0
        if "GSTR-3B" in comp_type:
            exposure = 15000.0
        elif "TDS" in comp_type:
            exposure = 20000.0
        elif "ROC" in comp_type or "MCA" in comp_type:
            exposure = 50000.0

        action_engine.push_action_item({
            "id": act_id,
            "client_id": task.get("client_id"),
            "source_module": "COMPLIANCE",
            "title": title,
            "description": description,
            "risk_score": float(task.get("risk_score", 50.0)),
            "exposure_amount": exposure,
            "recommended_action": f"Prepare files and submit {comp_type} return immediately.",
            "due_date": task.get("due_date"),
            "action_state": action_state,
            "assigned_to": task.get("assigned_to"),
            "source_url": "/compliance",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.92
        })
    except Exception as e:
        print(f"[WARN] Failed to sync compliance task to action engine: {str(e)}")

def evaluate_status_and_risk(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies automatic status logic, intelligent escalation engine, and risk score calculations.
    """
    if task["status"] == "Filed":
        task["risk_level"] = "LOW"
        task["risk_score"] = 0.0
        task["escalation_level"] = 0
        sync_to_action_engine(task)
        return task

    due_date = task["due_date"]
    if isinstance(due_date, str):
        due_date = date.fromisoformat(due_date)
        task["due_date"] = due_date

    today_dt = date.today()

    if due_date < today_dt:
        overdue_days = (today_dt - due_date).days
        if overdue_days > 3:
            task["status"] = "Escalated"
            task["escalation_level"] = 2
            task["risk_level"] = "HIGH"
            task["risk_score"] = min(100.0, 75.0 + (overdue_days * 5.0))
        else:
            task["status"] = "Overdue"
            task["escalation_level"] = 1
            task["risk_level"] = "HIGH"
            task["risk_score"] = 75.0
    elif due_date == today_dt:
        task["status"] = "Due Today"
        task["escalation_level"] = 0
        task["risk_level"] = "MEDIUM"
        task["risk_score"] = 45.0
    else:
        task["status"] = "Upcoming"
        task["escalation_level"] = 0
        days_left = (due_date - today_dt).days
        if days_left <= 3:
            task["risk_level"] = "MEDIUM"
            task["risk_score"] = 30.0
        else:
            task["risk_level"] = "LOW"
            task["risk_score"] = 15.0

    sync_to_action_engine(task)
    return task

def get_all_compliance(client_id: Optional[str] = None, 
                       compliance_type: Optional[str] = None, 
                       status: Optional[str] = None, 
                       assigned_to: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves all compliance tasks evaluated in real-time, filtered by parameters.
    """
    evaluated = []
    for comp in MOCK_COMPLIANCE:
        # Evaluate status & risk dynamically on load
        task = evaluate_status_and_risk(dict(comp))
        
        # Apply filters
        if client_id and task["client_id"] != client_id:
            continue
        if compliance_type and task["compliance_type"].lower() != compliance_type.lower():
            continue
        if status and task["status"].lower() != status.lower():
            continue
        if assigned_to and task["assigned_to"].lower() != assigned_to.lower():
            continue
            
        evaluated.append(task)
    return evaluated

def get_upcoming_compliance(days: int = 7) -> List[Dict[str, Any]]:
    """
    Retrieves upcoming/due-today filings due within the next N days.
    """
    today_dt = date.today()
    target_date = today_dt + timedelta(days=days)
    
    tasks = get_all_compliance()
    upcoming = []
    for task in tasks:
        if task["status"] in ["Upcoming", "Due Today"] and task["due_date"] <= target_date:
            upcoming.append(task)
            
    upcoming.sort(key=lambda x: x["due_date"])
    return upcoming

def create_compliance(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserts a new compliance filing record.
    """
    due_date = data.get("due_date")
    if isinstance(due_date, str):
        due_date = date.fromisoformat(due_date)
        
    new_comp = {
        "compliance_id": f"comp-{len(MOCK_COMPLIANCE) + 1}",
        "client_id": data["client_id"],
        "compliance_type": data["compliance_type"],
        "filing_period": data["filing_period"],
        "due_date": due_date,
        "status": "Upcoming",
        "assigned_to": data.get("assigned_to"),
        "escalation_level": 0,
        "risk_level": "LOW",
        "risk_score": 15.0
    }
    
    # Evaluate immediately
    new_comp = evaluate_status_and_risk(new_comp)
    MOCK_COMPLIANCE.append(new_comp)
    return new_comp

def update_compliance_status(comp_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    """
    Updates the status or staff assignment of a compliance task.
    """
    for comp in MOCK_COMPLIANCE:
        if comp["compliance_id"] == comp_id:
            comp["status"] = new_status
            
            # Recalculate
            evaluated = evaluate_status_and_risk(comp)
            # Sync back to mock DB
            comp.update(evaluated)
            return comp
    return None

def update_compliance_assignment(comp_id: str, staff: str) -> Optional[Dict[str, Any]]:
    """
    Updates the assigned staff member for a compliance task.
    """
    for comp in MOCK_COMPLIANCE:
        if comp["compliance_id"] == comp_id:
            comp["assigned_to"] = staff
            # Recalculate
            evaluated = evaluate_status_and_risk(comp)
            comp.update(evaluated)
            return comp
    return None

def get_dashboard_aggregations() -> Dict[str, Any]:
    """
    Computes dashboard KPIs: upcoming filings, overdue filings, high-risk clients, completed this month.
    """
    tasks = get_all_compliance()
    
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

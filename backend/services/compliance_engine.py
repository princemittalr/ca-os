from datetime import date, datetime, timedelta
from typing import Dict, Any, Optional


def sync_compliance_to_action_engine(task: Dict[str, Any], firm_id: Optional[str] = None) -> None:
    """
    Upserts a compliance task signal into Supabase action_items.
    Called after every DB write so the action feed stays in sync.
    Resolves firm_id from the task's client record if not supplied.
    """
    try:
        from services.db.manager import supabase_client, is_supabase_active, get_client_by_id

        if not is_supabase_active():
            return

        status = task.get("status")
        comp_id = task.get("compliance_id") or task.get("id", "unknown")
        act_id = f"act-comp-{comp_id}"
        client_id = task.get("client_id")
        now_str = datetime.now().isoformat()

        # Resolve firm_id from client record if not provided
        if not firm_id and client_id:
            client_info = get_client_by_id(client_id)
            firm_id = (client_info or {}).get("firm_id")
        client_info = get_client_by_id(client_id) if client_id else {}
        client_name = (client_info or {}).get("business_name", "Unknown Client")

        if status == "Filed":
            # Mark any existing action item as resolved
            supabase_client.table("action_items") \
                .update({
                    "status": "RESOLVED",
                    "action_state": "RESOLVED",
                    "resolved_at": now_str,
                    "updated_at": now_str,
                }) \
                .eq("action_id", act_id) \
                .execute()
            return

        if status not in ["Overdue", "Escalated", "Due Today"]:
            return

        action_state = "IN_PROGRESS" if status == "Escalated" else "NEW"

        comp_type = task.get("compliance_type", "Filing")
        period = task.get("filing_period", "")
        title = f"Filing {status}: {comp_type} ({period})"
        description = (
            f"Filing task {comp_type} for period {period} is {status.lower()}. "
            f"Due date: {task.get('due_date')}."
        )

        exposure = 5000.0
        if "GSTR-3B" in comp_type:
            exposure = 15000.0
        elif "TDS" in comp_type:
            exposure = 20000.0
        elif "ROC" in comp_type or "MCA" in comp_type:
            exposure = 50000.0

        risk_score = float(task.get("risk_score", 50.0))
        priority = "HIGH" if risk_score >= 75.0 else ("MEDIUM" if risk_score >= 30.0 else "LOW")

        due_date = task.get("due_date")
        if isinstance(due_date, date):
            due_date = due_date.isoformat()

        payload: Dict[str, Any] = {
            "action_id": act_id,
            "firm_id": firm_id,
            "client_id": client_id,
            "client_name": client_name,
            "source_module": "COMPLIANCE",
            "category": "COMPLIANCE",
            "priority": priority,
            "title": title,
            "description": description,
            "risk_score": risk_score,
            "exposure_amount": exposure,
            "recommended_action": f"Prepare files and submit {comp_type} return immediately.",
            "due_date": due_date,
            "deadline": due_date,
            "status": "PENDING",
            "action_state": action_state,
            "source_url": "/compliance",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.92,
            "ai_summary": f"System signal flagged under COMPLIANCE.",
            "predicted_impact": "Prevents late filing penalties and statutory interest accumulation.",
            "updated_at": now_str,
            "created_at": now_str,
            "is_deleted": False,
        }

        supabase_client.table("action_items") \
            .upsert(payload, on_conflict="action_id") \
            .execute()

    except Exception as e:
        print(f"[WARN] Failed to sync compliance task to action engine: {str(e)}")


def evaluate_status_and_risk(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pure function — computes dynamic status, risk_level, risk_score, and escalation_level
    from due_date. Does NOT mutate any global state or perform DB writes.
    Returns a new dict with evaluated fields merged in.
    Call sync_compliance_to_action_engine() separately after any DB persist.
    """
    # Work on a copy so we never mutate the caller's dict
    task = dict(task)

    if task.get("status") == "Filed":
        task["risk_level"] = "LOW"
        task["risk_score"] = 0.0
        task["escalation_level"] = 0
        return task

    due_date = task.get("due_date")
    if isinstance(due_date, str):
        due_date = date.fromisoformat(due_date)
    if not due_date:
        return task

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

    return task

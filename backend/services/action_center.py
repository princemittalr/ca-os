from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional


def calculate_weighted_risk(action: Dict[str, Any]) -> float:
    """
    Applies the risk-weighted ranking algorithm based on priority, categories,
    escalation levels, and exposure parameters.
    """
    prio_scores = {"CRITICAL": 90.0, "HIGH": 65.0, "MEDIUM": 40.0, "LOW": 10.0}
    score = prio_scores.get(action.get("priority", "MEDIUM").upper(), 15.0)

    category = action.get("category") or action.get("source_module") or "MANUAL"
    if category == "COMPLIANCE":
        score += 10.0
    elif category == "RECONCILIATION":
        score += 15.0
    elif category == "IMPORT":
        score += 10.0
    elif category == "NOTICE":
        score += 20.0
    elif category == "MANUAL":
        score += 5.0

    return max(0.0, min(100.0, score))


def get_ranked_actions(firm_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all PENDING action center items for the firm, sorted by risk-weighted ranking.
    Delegates directly to db_manager (Supabase).
    """
    from services.db import manager as db_manager
    return db_manager.get_action_items(firm_id=firm_id)


def resolve_action_item(action_id: str, firm_id: str) -> Optional[Dict[str, Any]]:
    """
    Marks an action item as RESOLVED. Delegates to db_manager (Supabase).
    """
    from services.db import manager as db_manager
    return db_manager.resolve_action_item(action_id, firm_id=firm_id)


def update_action_assignment(action_id: str, staff: str, firm_id: str) -> Optional[Dict[str, Any]]:
    """
    Updates the assigned team member for an action item. Delegates to db_manager (Supabase).
    """
    from services.db import manager as db_manager
    return db_manager.update_action_assignment(action_id, staff, firm_id=firm_id)


def generate_daily_summary(firm_id: str) -> Dict[str, Any]:
    """
    Generates a daily operational narrative copilot summary based on active signal counts
    pulled from Supabase for the given firm.
    """
    active = get_ranked_actions(firm_id=firm_id)
    high_priority = [a for a in active if a.get("priority") in ["HIGH", "CRITICAL"]]

    exposure = sum(float(a.get("exposure_amount", 0.0)) for a in active)

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
        "pending_itc_exposure": exposure,
        "daily_summary": summary_text,
    }

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional

from services import compliance_engine
from services import client_workspace
from services import communication
from services.action_engine import action_engine

# High-fidelity backward compatibility subclass to intercept any direct modifications or lookups
class MockActionsList(list):
    def __iter__(self):
        return iter(action_engine.actions.values())
    
    def __len__(self):
        return len(action_engine.actions)
    
    def append(self, item):
        action_engine.push_action_item(item)
        
    def clear(self):
        action_engine.actions.clear()
        
    def extend(self, items):
        for item in items:
            action_engine.push_action_item(item)

MOCK_ACTIONS = MockActionsList()

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

def get_ranked_actions() -> List[Dict[str, Any]]:
    """
    Retrieves all pending action center items sorted by risk-weighted ranking.
    """
    return action_engine.get_action_items()

def resolve_action_item(action_id: str) -> Optional[Dict[str, Any]]:
    """
    Marks an action item as RESOLVED.
    """
    return action_engine.resolve_action_item(action_id)

def update_action_assignment(action_id: str, staff: str) -> Optional[Dict[str, Any]]:
    """
    Updates the assigned team member for an action item.
    """
    return action_engine.update_action_assignment(action_id, staff)

def generate_daily_summary() -> Dict[str, Any]:
    """
    Generates a daily operational narrative copilot summary based on active signal counts.
    """
    active = get_ranked_actions()
    high_priority = [a for a in active if a["priority"] in ["HIGH", "CRITICAL"]]
    
    exposure = sum([a.get("exposure_amount", 0.0) for a in active])
            
    top_items = sorted(active, key=lambda x: x.get("risk_score", 0), reverse=True)[:3]
    top_text = "; ".join([
        f"{a['client_name']} — {a['title']} (₹{a.get('exposure_amount', 0):,.0f} at risk)"
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
        "daily_summary": summary_text
    }

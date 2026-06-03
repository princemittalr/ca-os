import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

class ActionEngineService:
    def __init__(self):
        self.actions: Dict[str, Dict[str, Any]] = {}

    def _preload_mock_data(self):
        """
        Preloads standard high-impact alerts across different categories
        using the push mechanism to ensure perfect timeline and state alignment.
        """
        pass

    def push_action_item(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Pushes a new or updated Action Item into the central Action Engine.
        Ensures complete schema alignment, automatic timeline tracking, and 
        dynamic risk/priority mapping.
        """
        # Determine unique ID
        act_id = action_data.get("id") or action_data.get("action_id") or f"act-{str(uuid.uuid4())[:8]}"
        
        now_str = datetime.now().isoformat()
        
        # Clone/dict-copy to avoid reference sharing
        existing = dict(self.actions[act_id]) if act_id in self.actions else None
        action_data = dict(action_data)
        
        # State mapping & validation
        action_state = action_data.get("action_state") or action_data.get("status") or "NEW"
        valid_states = ["NEW", "IN_PROGRESS", "WAITING_FOR_CLIENT", "WAITING_FOR_GOVERNMENT", "RESOLVED", "CLOSED"]
        if action_state not in valid_states:
            if action_state.upper() == "PENDING":
                action_state = "NEW"
            elif action_state.upper() == "RESOLVED":
                action_state = "RESOLVED"
            else:
                action_state = "NEW"

        # Risk & priority mappings
        risk_score = float(action_data.get("risk_score", 50.0))
        priority = action_data.get("priority")
        if not priority:
            if risk_score >= 85.0:
                priority = "HIGH"
            elif risk_score >= 50.0:
                priority = "MEDIUM"
            else:
                priority = "LOW"

        # Lookup client name if missing
        client_id = action_data.get("client_id") or "client-generic"
        client_name = action_data.get("client_name")
        if not client_name:
            from services.db import manager as db_manager
            client_info = db_manager.get_client_by_id(client_id)
            if client_info:
                client_name = client_info.get("business_name")
            else:
                client_name = "Generic Client"

        # Module / category mapping
        source_module = action_data.get("source_module") or action_data.get("category") or "MANUAL"
        category = source_module

        # Due Date / Deadline mapping
        due_date = action_data.get("due_date") or action_data.get("deadline")
        if isinstance(due_date, (date, datetime)):
            due_date = due_date.strftime("%Y-%m-%d")
        elif not due_date:
            due_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        deadline = due_date

        # Timeline updates
        created_at = action_data.get("created_at") or (existing["created_at"] if existing else now_str)
        updated_at = now_str
        
        resolved_at = action_data.get("resolved_at")
        if action_state in ["RESOLVED", "CLOSED"]:
            resolved_at = resolved_at or now_str
        else:
            resolved_at = None

        # Event history logger
        if not existing:
            event_history = []
            event_history.append({
                "timestamp": now_str,
                "event_type": "CREATED",
                "description": f"Action Item initialized in state {action_state} via {source_module}."
            })
        else:
            event_history = list(existing.get("event_history") or [])
            if existing["action_state"] != action_state:
                event_history.append({
                    "timestamp": now_str,
                    "event_type": "STATE_TRANSITION",
                    "description": f"State transitioned from {existing['action_state']} to {action_state}."
                })
            if existing.get("assigned_to") != action_data.get("assigned_to"):
                event_history.append({
                    "timestamp": now_str,
                    "event_type": "ASSIGNMENT_CHANGED",
                    "description": f"Assignment updated to {action_data.get('assigned_to')}."
                })

        # Deep linking mapping
        source_url = action_data.get("source_url")
        if not source_url:
            # Automatic mapping based on source module
            url_map = {
                "COMPLIANCE": "/compliance",
                "RECONCILIATION": "/gst-recon",
                "NOTICE": "/notices",
                "IMPORT": "/import-recon"
            }
            source_url = url_map.get(source_module.upper(), "/action-center")

        # Compile future-proof and backward-compatible object
        enriched_item = {
            "id": act_id,
            "action_id": act_id,
            "client_id": client_id,
            "client_name": client_name,
            "source_module": source_module,
            "category": category,
            "priority": priority,
            "title": action_data.get("title") or "Untitled Action Item",
            "description": action_data.get("description") or "",
            "risk_score": risk_score,
            "exposure_amount": float(action_data.get("exposure_amount", 0.0)),
            "recommended_action": action_data.get("recommended_action") or "Review details.",
            "due_date": due_date,
            "deadline": deadline,
            "status": "RESOLVED" if action_state in ["RESOLVED", "CLOSED"] else "PENDING",
            "action_state": action_state,
            "assigned_to": action_data.get("assigned_to"),
            
            # Action Timeline & Deep Link
            "created_at": created_at,
            "updated_at": updated_at,
            "resolved_at": resolved_at,
            "event_history": event_history,
            "source_url": source_url,
            
            # Future Automation Fields
            "automation_candidate": bool(action_data.get("automation_candidate", False)),
            "can_auto_resolve": bool(action_data.get("can_auto_resolve", False)),
            "confidence_score": float(action_data.get("confidence_score", 0.95)),
            
            # Secondary fallback fields
            "ai_summary": action_data.get("ai_summary") or f"System signal flagged under {source_module}.",
            "predicted_impact": action_data.get("predicted_impact") or "Protects client corporate statutory capital."
        }

        self.actions[act_id] = enriched_item
        return dict(enriched_item)

    def get_action_items(self) -> List[Dict[str, Any]]:
        """
        Retrieves all pending action items sorted by risk score descending.
        """
        pending = [dict(act) for act in self.actions.values() if act["action_state"] not in ["RESOLVED", "CLOSED"]]
        pending.sort(key=lambda x: x["risk_score"], reverse=True)
        return pending

    def resolve_action_item(self, action_id: str) -> Optional[Dict[str, Any]]:
        """
        Transitions an action item state to RESOLVED.
        """
        if action_id in self.actions:
            item = self.actions[action_id]
            item["action_state"] = "RESOLVED"
            item["status"] = "RESOLVED"
            item["resolved_at"] = datetime.now().isoformat()
            item["updated_at"] = datetime.now().isoformat()
            item["event_history"] = list(item["event_history"])
            item["event_history"].append({
                "timestamp": item["updated_at"],
                "event_type": "RESOLVED",
                "description": "Action item marked as RESOLVED by auditor."
            })
            return dict(item)
        return None

    def update_action_assignment(self, action_id: str, staff: str) -> Optional[Dict[str, Any]]:
        """
        Updates assignments on an action item.
        """
        if action_id in self.actions:
            item = self.actions[action_id]
            old_assign = item.get("assigned_to")
            item["assigned_to"] = staff
            item["updated_at"] = datetime.now().isoformat()
            item["event_history"].append({
                "timestamp": item["updated_at"],
                "event_type": "ASSIGNMENT_CHANGED",
                "description": f"Assignment updated from {old_assign} to {staff}."
            })
            return item
        return None

# Global Singleton Instance of the Action Engine
action_engine = ActionEngineService()

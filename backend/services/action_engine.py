import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

class ActionEngineService:
    def __init__(self):
        self.actions: Dict[str, Dict[str, Any]] = {}
        self._preload_mock_data()

    def _preload_mock_data(self):
        """
        Preloads standard high-impact alerts across different categories
        using the push mechanism to ensure perfect timeline and state alignment.
        """
        today_str = date.today().strftime("%Y-%m-%d")
        
        preloaded = [
            {
                "id": "act-1",
                "client_id": "client-1",
                "client_name": "TechNova Solutions Pvt Ltd",
                "source_module": "RECONCILIATION",
                "title": "GST Mismatch: Books vs GSTR-2B",
                "description": "Reconciliation check identified a critical mismatch of ₹4,20,000 in IGST credit claims. Major supplier Sharma Traders GSTR-2B filing records are missing.",
                "recommended_action": "Run GSTR-2B automated reconciliation audit matching Sharma invoices and withhold vendor payment.",
                "due_date": today_str,
                "risk_score": 95.0,
                "exposure_amount": 420000.0,
                "assigned_to": "Aditya Rao",
                "action_state": "NEW",
                "source_url": "/gst-recon",
                "automation_candidate": True,
                "can_auto_resolve": True,
                "confidence_score": 0.98,
                "ai_summary": "Supplier Sharma Traders has failed to upload sales invoices to GSTR-1, causing GSTR-2B inputs variance.",
                "predicted_impact": "Saves ₹4,20,000 in blocked statutory input tax credit."
            },
            {
                "id": "act-2",
                "client_id": "client-2",
                "client_name": "Apex Innovations Pvt Ltd",
                "source_module": "IMPORT",
                "title": "Missing ICEGATE BOE Reflection",
                "description": "Bill of Entry (BOE) import duty log mismatch detected between ICEGATE port customs gate logs and purchase registers. Mismatched IGST imports detected.",
                "recommended_action": "Re-trigger ICEGATE customs gateway sync and check BOE numbers.",
                "due_date": (date.today() + timedelta(days=2)).strftime("%Y-%m-%d"),
                "risk_score": 88.0,
                "exposure_amount": 340000.0,
                "assigned_to": "Neha Sharma",
                "action_state": "IN_PROGRESS",
                "source_url": "/import-recon",
                "automation_candidate": True,
                "can_auto_resolve": False,
                "confidence_score": 0.94,
                "ai_summary": "Discrepancies between Customs port logs and purchase registers will result in IGST credit claim rejection.",
                "predicted_impact": "Secures ₹3,40,000 in unclaimed import duty inputs and prevents double assessment."
            },
            {
                "id": "act-3",
                "client_id": "client-3",
                "client_name": "Wayne Enterprises Ltd",
                "source_module": "NOTICE",
                "title": "Notice Reply Required: DRC-01 SCN",
                "description": "GST show cause notice received under Section 73 (Ref: GST/TNV/2026/DRC-01/108) regarding Books vs GSTR-2B credit discrepancies.",
                "recommended_action": "Draft and submit statutory extension reply or pay liability.",
                "due_date": (date.today() + timedelta(days=3)).strftime("%Y-%m-%d"),
                "risk_score": 92.0,
                "exposure_amount": 185000.0,
                "assigned_to": "Rohan Mehta",
                "action_state": "WAITING_FOR_CLIENT",
                "source_url": "/notices",
                "automation_candidate": False,
                "can_auto_resolve": False,
                "confidence_score": 0.96,
                "ai_summary": "Failure to file a comprehensive rectification reply within 15 days results in direct recovery demands.",
                "predicted_impact": "Mitigates high-severity litigation dispute risks and ₹75,000 immediate penalty risk."
            },
            {
                "id": "act-4",
                "client_id": "client-4",
                "client_name": "Global Trade LLC",
                "source_module": "COMPLIANCE",
                "title": "TDS Return Filing Deadline",
                "description": "Quarterly TDS GSTR-7 return submission is due today. 3 deduction certificates pending verification.",
                "recommended_action": "Verify client employee PAN registers and file TDS returns.",
                "due_date": today_str,
                "risk_score": 65.0,
                "exposure_amount": 20000.0,
                "assigned_to": "Neha Sharma",
                "action_state": "NEW",
                "source_url": "/compliance",
                "automation_candidate": True,
                "can_auto_resolve": True,
                "confidence_score": 0.89,
                "ai_summary": "Incomplete deducer submissions trigger Section 234E late fee penalties.",
                "predicted_impact": "Avoids TDS delay penalty of ₹200/day under Section 234E."
            },
            {
                "id": "act-5",
                "client_id": "client-5",
                "client_name": "Sharma Traders",
                "source_module": "MANUAL",
                "title": "Collect Vendor Payment Proofs",
                "description": "Obtain bank statement payment records matching discrepancy invoices for Sharma GSTR-2B mismatch audit.",
                "recommended_action": "Outreach client accounts team for ledger statement folders.",
                "due_date": (date.today() + timedelta(days=4)).strftime("%Y-%m-%d"),
                "risk_score": 50.0,
                "exposure_amount": 0.0,
                "assigned_to": "Kunal Sen",
                "action_state": "NEW",
                "source_url": "/action-center",
                "automation_candidate": False,
                "can_auto_resolve": False,
                "confidence_score": 0.85,
                "ai_summary": "Manual audit trail compilation required to support the ASMT-11 scrutiny reply.",
                "predicted_impact": "Secures evidence checklist readiness score to 100%."
            }
        ]
        
        for act in preloaded:
            self.push_action_item(act)

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

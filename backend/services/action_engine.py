import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional, cast
from supabase import Client

def _now() -> str:
    """UTC ISO-8601 timestamp string for Supabase timestamptz columns."""
    return datetime.now(timezone.utc).isoformat()


class ActionEngineService:
    """
    Central action engine — all state persisted to Supabase `action_items` table.
    The in-memory self.actions dict has been removed; every method is DB-backed.
    """

    def _get_supabase(self) -> Client:
        from config.supabase import get_supabase_client, is_supabase_active
        if not is_supabase_active():
            raise RuntimeError("Supabase is not active. Cannot persist action items.")
        return cast(Client, get_supabase_client())

    def push_action_item(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upserts a new or updated Action Item into the Supabase action_items table.
        Performs full schema enrichment (risk mapping, timeline, deep-link) before write.
        Conflict key: action_id (on_conflict="action_id").
        """
        # Determine unique ID
        act_id = action_data.get("id") or action_data.get("action_id") or f"act-{str(uuid.uuid4())[:8]}"

        now_str = _now()

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

        # Lookup client name and firm_id if missing
        client_id = action_data.get("client_id") or "client-generic"
        client_name = action_data.get("client_name")
        firm_id = action_data.get("firm_id")

        if not client_name or not firm_id:
            from services.db import manager as db_manager
            client_info = db_manager.get_client_by_id(client_id)
            if client_info:
                client_name = client_name or client_info.get("business_name", "Generic Client")
                firm_id = firm_id or client_info.get("firm_id")
            else:
                client_name = client_name or "Generic Client"

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

        # Timeline
        resolved_at = action_data.get("resolved_at")
        if action_state in ["RESOLVED", "CLOSED"]:
            resolved_at = resolved_at or now_str
        else:
            resolved_at = None

        # Deep link mapping
        source_url = action_data.get("source_url")
        if not source_url:
            url_map = {
                "COMPLIANCE": "/compliance",
                "RECONCILIATION": "/gst-recon",
                "NOTICE": "/notices",
                "IMPORT": "/import-recon"
            }
            source_url = url_map.get(source_module.upper(), "/action-center")

        # Build the enriched payload
        enriched_item: Dict[str, Any] = {
            "action_id": act_id,
            "firm_id": firm_id,
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
            "updated_at": now_str,
            "resolved_at": resolved_at,
            "source_url": source_url,
            "automation_candidate": bool(action_data.get("automation_candidate", False)),
            "can_auto_resolve": bool(action_data.get("can_auto_resolve", False)),
            "confidence_score": float(action_data.get("confidence_score", 0.95)),
            "ai_summary": action_data.get("ai_summary") or f"System signal flagged under {source_module}.",
            "predicted_impact": action_data.get("predicted_impact") or "Protects client corporate statutory capital.",
        }

        # created_at only set on insert; upsert will ignore it on conflict if DB default is set
        enriched_item["created_at"] = action_data.get("created_at") or now_str

        try:
            supabase = self._get_supabase()
            # Upsert on action_id — inserts new row or updates existing one
            res = supabase.table("action_items").upsert(
                enriched_item,
                on_conflict="action_id"
            ).execute()
            if res.data:
                return dict(res.data[0])
        except Exception as e:
            print(f"[WARN] ActionEngine failed to upsert action item {act_id}: {str(e)}")

        # Return the enriched payload as best-effort even if DB write failed
        return dict(enriched_item)

    def get_action_items(self) -> List[Dict[str, Any]]:
        """
        Retrieves all PENDING action items sorted by risk score descending.
        NOTE: Not firm-scoped here — use db_manager.get_action_items(firm_id) from the router layer.
        """
        try:
            supabase = self._get_supabase()
            res = supabase.table("action_items") \
                .select("*") \
                .eq("status", "PENDING") \
                .eq("is_deleted", False) \
                .order("risk_score", desc=True) \
                .execute()
            return list(res.data or [])
        except Exception as e:
            print(f"[WARN] ActionEngine failed to fetch action items: {str(e)}")
            return []

    def resolve_action_item(self, action_id: str) -> Optional[Dict[str, Any]]:
        """
        Transitions an action item to RESOLVED in Supabase.
        """
        now_str = _now()
        updates = {
            "status": "RESOLVED",
            "action_state": "RESOLVED",
            "resolved_at": now_str,
            "updated_at": now_str,
        }
        try:
            supabase = self._get_supabase()
            res = supabase.table("action_items") \
                .update(updates) \
                .eq("action_id", action_id) \
                .execute()
            if res.data:
                return dict(res.data[0])
        except Exception as e:
            print(f"[WARN] ActionEngine failed to resolve action item {action_id}: {str(e)}")
        return None

    def update_action_assignment(self, action_id: str, staff: str) -> Optional[Dict[str, Any]]:
        """
        Updates the assigned_to field for an action item in Supabase.
        """
        now_str = _now()
        updates = {
            "assigned_to": staff,
            "updated_at": now_str,
        }
        try:
            supabase = self._get_supabase()
            res = supabase.table("action_items") \
                .update(updates) \
                .eq("action_id", action_id) \
                .execute()
            if res.data:
                return dict(res.data[0])
        except Exception as e:
            print(f"[WARN] ActionEngine failed to update assignment for {action_id}: {str(e)}")
        return None


# Global Singleton Instance of the Action Engine
action_engine = ActionEngineService()

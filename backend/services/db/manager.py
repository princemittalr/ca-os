import json
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional, cast
from supabase import Client

from config.supabase import get_supabase_client, is_supabase_active

def _now() -> str:
    """UTC ISO-8601 timestamp string for Supabase timestamptz columns."""
    return datetime.now(timezone.utc).isoformat()

# -------------------------------------------------------------------------
# CLIENTS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_clients(firm_id: str) -> List[Dict[str, Any]]:
    """
    Fetches all active clients scoped to the given firm.
    firm_id MUST come from the authenticated user's token.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — returning empty client list.")
        return []
    try:
        res = (
            get_supabase_client().table("clients")
            .select("*")
            .eq("firm_id", firm_id)
            .eq("is_deleted", False)
            .execute()
        )
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        print(f"[ERROR] Supabase get_clients error: {str(e)}")
        return []

def get_client_by_id(client_id: str, firm_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Fetches a single active client by ID.
    When firm_id is provided the query is firm-scoped, preventing cross-tenant reads.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — client lookup unavailable.")
        return None
    try:
        q = (
            get_supabase_client().table("clients")
            .select("*")
            .eq("id", client_id)
            .eq("is_deleted", False)
        )
        if firm_id:
            q = q.eq("firm_id", firm_id)
        res = q.execute()
        if res.data:
            return cast(Dict[str, Any], res.data[0])
    except Exception as e:
        print(f"[ERROR] Supabase get_client_by_id error: {str(e)}")
    return None

def create_client(client_data: Dict[str, Any], firm_id: Optional[str] = None) -> Dict[str, Any]:
    if not firm_id:
        raise ValueError("firm_id is required to create a client; cannot be empty.")
    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot create client.")
    payload = {
        "id": str(uuid.uuid4()),
        "firm_id": firm_id,
        "business_name": client_data["business_name"],
        "legal_name": client_data.get("legal_name") or client_data["business_name"],
        "trade_name": client_data.get("trade_name") or client_data["business_name"],
        "gstin": client_data["gstin"].upper(),
        "contact_person": client_data.get("contact_person") or "Assigned Auditor",
        "email": client_data.get("email") or "accounts@domain.com",
        "phone": client_data.get("phone") or "+91 99999 99999",
        "state": client_data.get("state") or "Maharashtra",
        "state_code": client_data.get("state_code") or "27",
        "filing_type": client_data.get("filing_type") or "full",
        "filing_frequency": client_data.get("filing_frequency") or "monthly",
        "assigned_manager": client_data.get("assigned_manager") or "Audit Associate",
        "is_deleted": False
    }
    try:
        res = get_supabase_client().table("clients").insert(payload).execute()
        if res.data:
            return cast(Dict[str, Any], res.data[0])
        raise RuntimeError("Client insert returned no data.")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to create client: {str(e)}") from e

def update_client(client_id: str, client_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates mutable fields of an existing client record.
    Caller must have already verified firm ownership before calling this.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — client update unavailable.")
        return None
    try:
        payload = {}
        for field in ["business_name", "legal_name", "trade_name", "gstin", "contact_person", "email", "phone", "state", "state_code", "filing_frequency", "assigned_manager"]:
            if field in client_data:
                payload[field] = client_data[field]
        if "gstin" in payload:
            payload["gstin"] = payload["gstin"].upper()
        res = get_supabase_client().table("clients").update(payload).eq("id", client_id).execute()
        if res.data:
            return cast(Dict[str, Any], res.data[0])
    except Exception as e:
        print(f"[ERROR] Supabase update_client error: {str(e)}")
    return None

def soft_delete_client(client_id: str, firm_id: str) -> bool:
    """
    Sets is_deleted = True for the given client.
    firm_id is used as an additional guard to prevent cross-tenant deletes.
    Returns True on success, False otherwise.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — client delete unavailable.")
        return False
    try:
        res = (
            get_supabase_client().table("clients")
            .update({"is_deleted": True})
            .eq("id", client_id)
            .eq("firm_id", firm_id)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        print(f"[ERROR] Supabase soft_delete_client error: {str(e)}")
    return False

def get_all_active_firm_ids() -> List[str]:
    """Returns distinct firm_ids from users table. For background job iteration only."""
    if not is_supabase_active():
        return []
    try:
        res = get_supabase_client().table("users").select("firm_id").execute()
        seen = set()
        result = []
        for row in (res.data or []):
            fid = row.get("firm_id")
            if fid and fid not in seen:
                seen.add(fid)
                result.append(fid)
        return result
    except Exception as e:
        print(f"[ERROR] get_all_active_firm_ids error: {str(e)}")
        return []

# -------------------------------------------------------------------------
# RECONCILIATIONS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_reconciliations(client_id: str) -> List[Dict[str, Any]]:
    if not is_supabase_active():
        print("[WARN] Supabase not active — returning empty reconciliation list.")
        return []
    try:
        res = get_supabase_client().table("reconciliation_runs").select("*").eq("client_id", client_id).eq("is_deleted", False).execute()
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        print(f"[ERROR] Supabase get_reconciliations error: {str(e)}")
        return []

def add_reconciliation(client_id: str, run_data: Dict[str, Any]) -> Dict[str, Any]:
    # Calculate risk score based on mismatch values
    mismatches = run_data.get("mismatch_count", 0)
    risk_val = run_data.get("itc_at_risk", 0.0)
    risk_score = "LOW"
    if mismatches > 3 or risk_val > 50000.0:
        risk_score = "HIGH"
    elif mismatches > 0 or risk_val > 0.0:
        risk_score = "MEDIUM"

    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot persist reconciliation run.")
    try:
        payload = {
            "reconciliation_id": str(uuid.uuid4()),
            "client_id": client_id,
            "filing_period": run_data.get("filing_period") or "2024-03",
            "reconciliation_status": "Fully Reconciled" if mismatches == 0 else "Completed with Mismatches",
            "total_invoices": run_data.get("total_invoices", 0),
            "matched_count": run_data.get("matched_count", 0),
            "mismatch_count": mismatches,
            "missing_in_2b_count": run_data.get("missing_in_2b_count", 0),
            "missing_in_books_count": run_data.get("missing_in_books_count", 0),
            "itc_at_risk": risk_val,
            "itc_protected": run_data.get("itc_protected", 0.0),
            "risk_score": risk_score,
            "is_deleted": False
        }
        # Soft-overwrite existing records for the same period
        get_supabase_client().table("reconciliation_runs").update({"is_deleted": True}).eq("client_id", client_id).eq("filing_period", payload["filing_period"]).execute()
        res = get_supabase_client().table("reconciliation_runs").insert(payload).execute()
        if res.data:
            ret = cast(Dict[str, Any], res.data[0])
        else:
            raise RuntimeError("Reconciliation insert returned no data.")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to persist reconciliation run: {str(e)}") from e

    sync_reconciliation_to_action_engine(client_id, ret)
    
    # Wire reconciliation completion to notify assigned manager
    try:
        client_info = get_client_by_id(client_id)
        if client_info:
            manager_name = client_info.get("assigned_manager")
            if manager_name:
                manager_id = get_user_id_by_name(manager_name)
                if manager_id:
                    create_user_notification(
                        user_id=manager_id,
                        type="reconciliation",
                        title="Reconciliation Completed",
                        message=f"Reconciliation run completed for {client_info['business_name']} - Period {ret.get('filing_period')}.",
                        action_url=f"/gst-recon"
                    )
    except Exception as e:
        print(f"[WARN] Failed to trigger reconciliation completion notification: {e}")

    return cast(Dict[str, Any], ret)

# -------------------------------------------------------------------------
# COMPLIANCE DEADLINES CRUD ABSTRACTION
# All operations are Supabase-only (no in-memory fallback).
# Queries are firm-scoped via a client join to prevent cross-tenant leakage.
# evaluate_status_and_risk() is applied after fetch — pure, no side-effects.
# -------------------------------------------------------------------------
def get_compliance(
    firm_id: Optional[str] = None,
    client_id: Optional[str] = None,
    compliance_type: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetches compliance tasks from Supabase, scoped to firm_id (via clients join).
    If firm_id is None (e.g. called from background scheduler), returns unscoped results
    so cron tasks still function correctly.
    evaluate_status_and_risk() is applied on each row before returning.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — returning empty compliance list.")
        return []
    try:
        from services.compliance_engine import evaluate_status_and_risk

        if firm_id:
            # Firm-scoped: join through clients table to enforce tenant isolation
            q = (
                get_supabase_client().table("compliance_tasks")
                .select("*, clients!inner(firm_id)")
                .eq("clients.firm_id", firm_id)
                .eq("is_deleted", False)
            )
        else:
            # Unscoped — used only by background scheduler tasks
            q = get_supabase_client().table("compliance_tasks").select("*").eq("is_deleted", False)

        if client_id:
            q = q.eq("client_id", client_id)
        if compliance_type:
            q = q.eq("compliance_type", compliance_type)
        if status:
            q = q.eq("status", status)
        if assigned_to:
            q = q.eq("assigned_to", assigned_to)

        res = q.execute()
        rows = cast(List[Dict[str, Any]], res.data or [])
        return [evaluate_status_and_risk(task) for task in rows]
    except Exception as e:
        print(f"[ERROR] Supabase compliance query error: {str(e)}")
        return []

def create_compliance(data: Dict[str, Any], firm_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Inserts a new compliance task into Supabase.
    Validates that client_id belongs to firm_id when firm_id is provided.
    """
    if not is_supabase_active():
        raise RuntimeError("Supabase is not active. Cannot create compliance task.")

    # Firm-scoped ownership check (same pattern as P69)
    if firm_id:
        client = get_client_by_id(data["client_id"], firm_id=firm_id)
        if not client:
            raise ValueError(
                f"client_id '{data['client_id']}' does not belong to the authenticated firm."
            )

    from services.compliance_engine import evaluate_status_and_risk

    payload = {
        "compliance_id": str(uuid.uuid4()),
        "client_id": data["client_id"],
        "compliance_type": data["compliance_type"],
        "filing_period": data["filing_period"],
        "due_date": str(data["due_date"]),
        "status": "Upcoming",
        "assigned_to": data.get("assigned_to") or None,
        "escalation_level": 0,
        "risk_level": "LOW",
        "risk_score": 15.00,
        "is_deleted": False,
    }

    try:
        res = get_supabase_client().table("compliance_tasks").insert(payload).execute()
        if res.data:
            created = cast(Dict[str, Any], res.data[0])
            evaluated = evaluate_status_and_risk(created)
            # Sync evaluated status/risk back to DB
            _update_compliance_evaluated_fields(created.get("id") or created.get("compliance_id"), evaluated)
            # Sync to action engine
            from services.compliance_engine import sync_compliance_to_action_engine
            sync_compliance_to_action_engine(evaluated, firm_id)
            return evaluated
    except Exception as e:
        raise RuntimeError(f"Failed to create compliance task: {str(e)}") from e

    raise RuntimeError("Supabase insert returned no data.")

def _update_compliance_evaluated_fields(row_pk: Optional[str], evaluated: Dict[str, Any]) -> None:
    """
    Internal helper: writes back the evaluated status/risk fields computed by
    evaluate_status_and_risk() to the DB row identified by its UUID primary key.
    Uses the `id` column (Supabase auto-PK) when available, falls back to compliance_id.
    """
    if not row_pk or not is_supabase_active():
        return
    try:
        updates = {
            "status": evaluated.get("status"),
            "risk_level": evaluated.get("risk_level"),
            "risk_score": evaluated.get("risk_score"),
            "escalation_level": evaluated.get("escalation_level"),
        }
        # Try `id` first (Supabase UUID PK), fall back to `compliance_id`
        res = get_supabase_client().table("compliance_tasks").update(updates).eq("id", row_pk).execute()
        if not res.data:
            get_supabase_client().table("compliance_tasks").update(updates).eq("compliance_id", row_pk).execute()
    except Exception as e:
        print(f"[WARN] Could not persist evaluated fields for task {row_pk}: {str(e)}")

def update_compliance_status(
    comp_id: str, new_status: str, filed_date: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Persists a status change (and optional filed_date) to Supabase.
    comp_id may be the UUID `id` column OR the `compliance_id` string — we try both.
    Evaluates status/risk after update and syncs to action engine.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — compliance status update skipped.")
        return None
    try:
        from services.compliance_engine import evaluate_status_and_risk, sync_compliance_to_action_engine

        updates: Dict[str, Any] = {"status": new_status}
        if filed_date:
            updates["filed_date"] = filed_date

        # Try `id` (UUID PK) first, then fall back to `compliance_id`
        res = get_supabase_client().table("compliance_tasks").update(updates).eq("id", comp_id).execute()
        if not res.data:
            res = get_supabase_client().table("compliance_tasks").update(updates).eq("compliance_id", comp_id).execute()

        if res.data:
            task = cast(Dict[str, Any], res.data[0])
            evaluated = evaluate_status_and_risk(task)
            # Persist evaluated risk fields back
            row_pk = task.get("id") or task.get("compliance_id")
            _update_compliance_evaluated_fields(row_pk, evaluated)
            # Resolve firm_id for action engine sync
            client = get_client_by_id(evaluated.get("client_id", ""))
            firm_id = (client or {}).get("firm_id")
            sync_compliance_to_action_engine(evaluated, firm_id)
            return evaluated
    except Exception as e:
        print(f"[ERROR] Supabase compliance status update failed: {str(e)}")
    return None

def update_compliance_assignment(comp_id: str, staff: str) -> Optional[Dict[str, Any]]:
    """
    Updates the assigned_to field for a compliance task.
    comp_id may be the UUID `id` column OR the `compliance_id` string — we try both.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — compliance assignment update skipped.")
        return None
    try:
        # Try `id` (UUID PK) first, then fall back to `compliance_id`
        res = get_supabase_client().table("compliance_tasks").update({"assigned_to": staff}).eq("id", comp_id).execute()
        if not res.data:
            res = get_supabase_client().table("compliance_tasks").update({"assigned_to": staff}).eq("compliance_id", comp_id).execute()

        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
    except Exception as e:
        print(f"[ERROR] Supabase compliance assignment update failed: {str(e)}")
    return None

# -------------------------------------------------------------------------
# OUTREACH COMMUNICATIONS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_communications(client_id: str) -> List[Dict[str, Any]]:
    """Fetch client communications from Supabase. No in-memory fallback."""
    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot fetch communications.")
    try:
        res = (
            get_supabase_client().table("communications")
            .select("*")
            .eq("client_id", client_id)
            .eq("is_deleted", False)
            .execute()
        )
        return cast(List[Dict[str, Any]], res.data or [])
    except Exception as e:
        raise RuntimeError(f"Failed to fetch communications: {str(e)}") from e

def create_communication(data: Dict[str, Any]) -> Dict[str, Any]:
    """Persist communication draft to Supabase. No in-memory fallback."""
    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot create communication.")
    
    # Building payload directly to avoid dual-state in services/communication.py
    payload = {
        "id": str(uuid.uuid4()),
        "client_id": data.get("client_id") or "",
        "vendor_name": data.get("vendor_name") or "Supplier Firm",
        "gstin": data.get("gstin") or "—",
        "issue": data.get("issue", "MISSING_IN_2B").upper(),
        "subject": data.get("subject", "GST Compliance Mismatch Notice"),
        "email_body": data.get("email_body", ""),
        "priority": data.get("priority") or "HIGH",
        "recommended_deadline": str(data.get("recommended_deadline") or (date.today() + timedelta(days=10)).strftime("%Y-%m-%d")),
        "status": "Drafted",
        "is_deleted": False,
        "created_at": _now()
    }
    
    if not payload["client_id"]:
        raise ValueError("client_id required for communication.")
        
    try:
        res = get_supabase_client().table("communications").insert(payload).execute()
        if res.data:
            return cast(Dict[str, Any], res.data[0])
        raise RuntimeError("Communication insert returned no data.")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to create communication: {str(e)}") from e

def update_communication_status(comm_id: str, new_status: str) -> bool:
    """Update communication status in Supabase. No in-memory fallback."""
    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot update communication.")
    try:
        res = (
            get_supabase_client().table("communications")
            .update({"status": new_status})
            .eq("id", comm_id)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        raise RuntimeError(f"Failed to update communication status: {str(e)}") from e

# -------------------------------------------------------------------------
# ACTION CENTER CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_action_items(firm_id: str, include_resolved: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches action items for the given firm from Supabase.
    By default only returns PENDING items.
    Always Supabase — no in-memory fallback.
    """
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        query = get_supabase_client().table("action_items") \
            .select("*") \
            .eq("firm_id", firm_id) \
            .eq("is_deleted", False) \
            .order("risk_score", desc=True)
            
        if not include_resolved:
            query = query.eq("status", "PENDING")
            
        res = query.execute()
        return cast(List[Dict[str, Any]], res.data or [])
    except Exception as e:
        raise RuntimeError(f"Failed to fetch action items: {str(e)}") from e

def resolve_action_item(action_id: str, firm_id: str) -> Optional[Dict[str, Any]]:
    """
    Marks an action item as RESOLVED in Supabase.
    Scoped to firm_id to prevent cross-tenant mutations.
    Always Supabase — no in-memory fallback.
    """
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        now_str = _now()
        updates = {
            "status": "RESOLVED",
            "action_state": "RESOLVED",
            "resolved_at": now_str,
            "updated_at": now_str,
        }
        res = get_supabase_client().table("action_items") \
            .update(updates) \
            .eq("action_id", action_id) \
            .eq("firm_id", firm_id) \
            .execute()
        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
        return None
    except Exception as e:
        raise RuntimeError(f"Failed to resolve action item: {str(e)}") from e

def update_action_assignment(action_id: str, staff: str, firm_id: str) -> Optional[Dict[str, Any]]:
    """
    Updates the assigned_to field for an action item.
    Scoped to firm_id to prevent cross-tenant mutations.
    Always Supabase — no in-memory fallback.
    """
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        now_str = _now()
        res = get_supabase_client().table("action_items") \
            .update({"assigned_to": staff, "updated_at": now_str}) \
            .eq("action_id", action_id) \
            .eq("firm_id", firm_id) \
            .execute()
        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
        return None
    except Exception as e:
        raise RuntimeError(f"Failed to update action assignment: {str(e)}") from e


# -------------------------------------------------------------------------
# OPERATIONS JOBS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_jobs(firm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        q = get_supabase_client().table("jobs").select("*")
        if firm_id:
            q = q.eq("firm_id", firm_id)
        res = q.order("created_at", desc=True).execute()
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch jobs from database: {str(e)}") from e

def get_job_by_id(job_id: str, firm_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        q = get_supabase_client().table("jobs").select("*").eq("job_id", job_id)
        if firm_id:
            q = q.eq("firm_id", firm_id)
        res = q.execute()
        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
    except Exception as e:
        raise RuntimeError(f"Failed to fetch job details: {str(e)}") from e
    return None

def create_job(job_type: str, status: str = "PENDING", firm_id: Optional[str] = None) -> Dict[str, Any]:
    if not is_supabase_active():
        raise RuntimeError("Cannot create job: database unavailable")
        
    new_job = {
        "job_id": str(uuid.uuid4()),
        "firm_id": firm_id,
        "job_type": job_type,
        "status": status,
        "progress": 0.0,
        "retry_count": 0,
        "created_at": _now(),
        "completed_at": None,
        "error_logs": None
    }
    
    try:
        res = get_supabase_client().table("jobs").insert(cast(Any, new_job)).execute()
        if res.data:
            return cast(Dict[str, Any], res.data[0])
        raise RuntimeError("Failed to create job: No data returned from database")
    except Exception as e:
        raise RuntimeError(f"Cannot create job: {str(e)}") from e

def update_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        formatted_updates = {}
        for k, v in updates.items():
            if isinstance(v, datetime):
                formatted_updates[k] = v.isoformat()
            else:
                formatted_updates[k] = v
        res = get_supabase_client().table("jobs").update(formatted_updates).eq("job_id", job_id).execute()
        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
    except Exception as e:
        raise RuntimeError(f"Failed to update job: {str(e)}") from e
    return None

# -------------------------------------------------------------------------
# NOTIFICATIONS INBOX & LOGGER CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_user_id_by_name(full_name: str) -> Optional[str]:
    """
    Looks up user_id for a staff user by their full name.
    Returns None if database is not active or user is not found.
    """
    if not is_supabase_active():
        return None
    try:
        res = get_supabase_client().table("users").select("id").eq("full_name", full_name).execute()
        if res.data:
            data_list = cast(List[Dict[str, Any]], res.data)
            return str(data_list[0]["id"])
    except Exception as e:
        print(f"[ERROR] get_user_id_by_name error: {str(e)}")
    return None

def create_user_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates a user inbox notification in the notifications table.
    Bypasses RLS using the service role client. Non-blocking.
    """
    firm_id = None
    if is_supabase_active():
        try:
            res = get_supabase_client().table("users").select("firm_id").eq("id", user_id).execute()
            if res.data:
                data_list = cast(List[Dict[str, Any]], res.data)
                firm_id = str(data_list[0]["firm_id"])
        except Exception as e:
            print(f"[ERROR] Could not fetch firm_id for user {user_id}: {e}")

    payload = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "firm_id": firm_id or "00000000-0000-0000-0000-000000000001",
        "type": type,
        "title": title,
        "message": message,
        "is_read": False,
        "action_url": action_url,
        "created_at": _now()
    }

    db_success = False
    if is_supabase_active():
        try:
            get_supabase_client().table("notifications").insert(payload).execute()
            db_success = True
        except Exception as e:
            print(f"[WARN] Failed to insert notification to DB: {e}")

    if not db_success:
        raise RuntimeError("Failed to persist notification.")

    return payload

def get_notifications_log(firm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if not is_supabase_active():
        raise RuntimeError("Database connection is inactive.")
    try:
        q = get_supabase_client().table("notifications_log").select("*")
        if firm_id:
            q = q.eq("firm_id", firm_id)
        res = q.order("sent_at", desc=True).execute()
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch notifications logs: {str(e)}") from e

def create_notification_log(channel: str, recipient: str, body: str, status: str, subject: Optional[str] = None) -> Dict[str, Any]:
    firm_id = None
    if is_supabase_active():
        try:
            # Resolve firm_id from recipient email by searching clients then users
            res = get_supabase_client().table("clients").select("firm_id").eq("email", recipient).execute()
            if res.data:
                data_list = cast(List[Dict[str, Any]], res.data)
                firm_id = str(data_list[0]["firm_id"])
            else:
                res = get_supabase_client().table("users").select("firm_id").eq("email", recipient).execute()
                if res.data:
                    data_list = cast(List[Dict[str, Any]], res.data)
                    firm_id = str(data_list[0]["firm_id"])
        except Exception as e:
            print(f"[WARN] Failed to resolve firm_id for notification log: {e}")

    new_notif = {
        "id": str(uuid.uuid4()),
        "firm_id": firm_id or "00000000-0000-0000-0000-000000000001",
        "channel": channel,
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "status": status,
        "sent_at": _now()
    }
    if is_supabase_active():
        try:
            get_supabase_client().table("notifications_log").insert(new_notif).execute()
        except Exception as e:
            print(f"[ERROR] Supabase write error for notifications_log: {str(e)}")
    return new_notif



# -------------------------------------------------------------------------
# GST NOTICES PERSISTENCE
# -------------------------------------------------------------------------

def get_notices(
    client_id: Optional[str] = None,
    firm_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetches GST notices from Supabase, scoped to firm_id to enforce tenant isolation.
    Optionally filtered further by client_id.
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — returning empty notices list.")
        return []
    try:
        q = get_supabase_client().table("gst_notices").select("*").eq("is_deleted", False)
        if firm_id:
            q = q.eq("firm_id", firm_id)
        if client_id:
            q = q.eq("client_id", client_id)
        res = q.order("risk_level", desc=True).execute()
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        print(f"[ERROR] Supabase get_notices error: {str(e)}")
        return []

def get_notice_by_id(notice_id: str, firm_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not is_supabase_active():
        print("[WARN] Supabase not active — notice lookup unavailable.")
        return None
    try:
        q = get_supabase_client().table("gst_notices").select("*").eq("id", notice_id).eq("is_deleted", False)
        if firm_id:
            q = q.eq("firm_id", firm_id)
        res = q.execute()
        if res.data:
            return cast(Optional[Dict[str, Any]], res.data[0])
    except Exception as e:
        print(f"[ERROR] Supabase get_notice_by_id error: {str(e)}")
    return None

def create_notice(notice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persists a new GST notice dossier.
    notice_data MUST contain firm_id sourced from the authenticated user's token.
    """
    if not notice_data.get("firm_id"):
        raise ValueError("firm_id is required to create a notice; cannot be empty.")

    tax_amount = float(notice_data.get("tax_amount", 0.0))
    interest_est = float(notice_data.get("interest_exposure_est") or (tax_amount * 0.18))
    penalty_est = float(notice_data.get("penalty_exposure_est") or max(10000.0, tax_amount * 0.10))
    total_est = tax_amount + interest_est + penalty_est

    new_notice = {
        "id": notice_data.get("id") or f"notice-{str(uuid.uuid4())[:8]}",
        "client_id": notice_data["client_id"],
        "firm_id": notice_data["firm_id"],
        "client_name": notice_data["client_name"],
        "notice_number": notice_data["notice_number"],
        "issuing_authority": notice_data.get("issuing_authority") or "GST Tax Authority",
        "section_references": notice_data.get("section_references") or [],
        "notice_type": notice_data.get("notice_type") or "ASMT-10",
        "tax_amount": tax_amount,
        "due_date": notice_data.get("due_date"),
        "hearing_date": notice_data.get("hearing_date"),
        "summary": notice_data.get("summary") or "Discrepancy notice scrutiny.",
        "risk_level": notice_data.get("risk_level") or "MEDIUM",
        "risk_score": float(notice_data.get("risk_score") or 50.0),
        "complexity_score": notice_data.get("complexity_score") or "Moderate",
        "recommended_next_action": notice_data.get("recommended_next_action") or "Prepare Reply",
        "interest_exposure_est": interest_est,
        "penalty_exposure_est": penalty_est,
        "total_exposure_est": total_est,
        "required_action": notice_data.get("required_action") or "Review files.",
        "status": notice_data.get("status") or "PENDING",
        "file_path": notice_data.get("file_path"),
        "raw_ocr_text": notice_data.get("raw_ocr_text") or "",
        "gstin": notice_data.get("gstin") or "27AAACT1234A1Z5",
        "created_at": _now(),
        "updated_at": _now(),
        "supporting_evidence": notice_data.get("supporting_evidence") or [
            "Purchase Register Matching GSTR-2B",
            "Original Purchase Tax Invoices",
            "Vendor Payment Proofs (Bank Statement)"
        ],
        "missing_documents": notice_data.get("missing_documents") or [
            "Supplier GSTR-1 Filing Confirmation",
            "E-way bill copies for transport verification"
        ],
        "questions_for_client": notice_data.get("questions_for_client") or [
            "Have payments to the vendor been made within 180 days of the invoice date?",
            "Can you confirm physical receipt of goods for the disputed invoices?"
        ]
    }
    
    if not is_supabase_active():
        raise RuntimeError("Database unavailable. Cannot create notice.")
    try:
        payload = {**new_notice}
        if isinstance(payload["due_date"], (date, datetime)):
            payload["due_date"] = payload["due_date"].isoformat()
        if isinstance(payload["hearing_date"], (date, datetime)):
            payload["hearing_date"] = payload["hearing_date"].isoformat()
        if isinstance(payload["created_at"], (date, datetime)):
            payload["created_at"] = payload["created_at"].isoformat()
        if isinstance(payload["updated_at"], (date, datetime)):
            payload["updated_at"] = payload["updated_at"].isoformat()

        res = get_supabase_client().table("gst_notices").insert(cast(Any, payload)).execute()
        if res.data:
            ret = cast(Dict[str, Any], res.data[0])
        else:
            raise RuntimeError("Notice insert returned no data.")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to create notice: {str(e)}") from e

    sync_notice_to_action_engine(ret)
    
    # Wire notice upload to notify relevant staff
    try:
        client_info = get_client_by_id(str(ret["client_id"]))
        if client_info:
            manager_name = client_info.get("assigned_manager")
            if manager_name:
                manager_id = get_user_id_by_name(manager_name)
                if manager_id:
                    create_user_notification(
                        user_id=manager_id,
                        type="notice",
                        title=f"New Notice Uploaded: {ret.get('notice_type', 'Notice')}",
                        message=f"A new GST notice has been uploaded for {client_info['business_name']}.",
                        action_url=f"/notices"
                    )
    except Exception as e:
        print(f"[WARN] Failed to trigger notice upload notification: {e}")

    return cast(Dict[str, Any], ret)

def update_notice_status(notice_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    if not is_supabase_active():
        print("[WARN] Supabase not active — notice status update unavailable.")
        return None
    try:
        res = get_supabase_client().table("gst_notices").update({"status": new_status, "updated_at": _now()}).eq("id", notice_id).execute()
        if res.data:
            ret = cast(Dict[str, Any], res.data[0])
            sync_notice_to_action_engine(ret)
            return ret
    except Exception as e:
        print(f"[ERROR] Supabase update_notice_status error: {str(e)}")
    return None


# -------------------------------------------------------------------------
# CENTRAL ACTION ENGINE SYNCHRONIZATION HELPERS
# These helpers upsert directly to Supabase action_items — no in-memory engine.
# firm_id is resolved from the client record so call-sites need not change.
# -------------------------------------------------------------------------
def sync_reconciliation_to_action_engine(client_id: str, run: Dict[str, Any]):
    try:
        mismatches = run.get("mismatch_count", 0)
        risk_val = float(run.get("itc_at_risk", 0.0))
        period = run.get("filing_period") or run.get("month") or "2024-03"

        act_id = f"act-recon-{client_id}-{period}"

        # Resolve firm_id from the client record
        client_info = get_client_by_id(client_id)
        firm_id = (client_info or {}).get("firm_id")
        client_name = (client_info or {}).get("business_name", "Unknown Client")

        now_str = _now()

        if mismatches == 0 and risk_val == 0.0:
            # Reconciled — mark any existing action item as resolved
            if is_supabase_active():
                get_supabase_client().table("action_items") \
                    .update({"status": "RESOLVED", "action_state": "RESOLVED",
                             "resolved_at": now_str, "updated_at": now_str}) \
                    .eq("action_id", act_id) \
                    .execute()
            return

        risk_score = 30.0
        if mismatches > 3 or risk_val > 50000.0:
            risk_score = 90.0
        elif mismatches > 0 or risk_val > 0.0:
            risk_score = 65.0

        priority = "HIGH" if risk_score >= 85.0 else ("MEDIUM" if risk_score >= 50.0 else "LOW")
        due_date = (date.today() + timedelta(days=5)).strftime("%Y-%m-%d")

        payload: Dict[str, Any] = {
            "action_id": act_id,
            "firm_id": firm_id,
            "client_id": client_id,
            "client_name": client_name,
            "source_module": "RECONCILIATION",
            "category": "RECONCILIATION",
            "priority": priority,
            "title": f"Reconciliation Discrepancy: {period}",
            "description": f"Reconciliation check identified {mismatches} mismatches and ₹{risk_val:,.2f} in at-risk ITC for filing period {period}.",
            "risk_score": risk_score,
            "exposure_amount": risk_val,
            "recommended_action": "Run GSTR-2B automated reconciliation audit matching invoices and withhold vendor payment.",
            "due_date": due_date,
            "deadline": due_date,
            "status": "PENDING",
            "action_state": "NEW",
            "source_url": "/gst-recon",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.96,
            "ai_summary": f"System signal flagged under RECONCILIATION.",
            "predicted_impact": "Protects client ITC and prevents GST liability.",
            "updated_at": now_str,
            "created_at": now_str,
            "is_deleted": False,
        }

        if is_supabase_active():
            get_supabase_client().table("action_items") \
                .upsert(payload, on_conflict="action_id") \
                .execute()
    except Exception as e:
        print(f"[WARN] Failed to sync reconciliation run to action_items table: {str(e)}")

def sync_notice_to_action_engine(notice: Dict[str, Any]):
    try:
        notice_status = notice.get("status")
        act_id = f"act-notice-{notice['id']}"
        client_id = notice.get("client_id")
        now_str = _now()

        # Resolve firm_id from client record (notice may not carry it directly)
        firm_id = notice.get("firm_id")
        if not firm_id and client_id:
            client_info = get_client_by_id(client_id)
            firm_id = (client_info or {}).get("firm_id")

        if notice_status in ["RESOLVED", "CLOSED"]:
            # Mark existing action item as resolved
            if is_supabase_active():
                get_supabase_client().table("action_items") \
                    .update({"status": "RESOLVED", "action_state": "RESOLVED",
                             "resolved_at": now_str, "updated_at": now_str}) \
                    .eq("action_id", act_id) \
                    .execute()
            return

        action_state = "NEW"
        if notice_status == "DRAFTED":
            action_state = "IN_PROGRESS"

        due_date = notice.get("due_date")
        if isinstance(due_date, (date, datetime)):
            due_date = due_date.strftime("%Y-%m-%d")
        elif not due_date:
            due_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")

        risk_score = float(notice.get("risk_score", 60.0))
        priority = "HIGH" if risk_score >= 85.0 else ("MEDIUM" if risk_score >= 50.0 else "LOW")
        exposure = float(notice.get("total_exposure_est") or notice.get("tax_amount", 0.0))
        sections = ", ".join(notice.get("section_references", [])) or "GST regulations"

        payload: Dict[str, Any] = {
            "action_id": act_id,
            "firm_id": firm_id,
            "client_id": client_id,
            "client_name": notice.get("client_name"),
            "source_module": "NOTICE",
            "category": "NOTICE",
            "priority": priority,
            "title": f"Notice Reply Required: {notice.get('notice_type', 'Notice')} SCN",
            "description": (
                f"GST notice {notice.get('notice_number')} issued under sections {sections}. "
                f"Demanded tax amount: ₹{notice.get('tax_amount', 0.0):,.2f}."
            ),
            "risk_score": risk_score,
            "exposure_amount": exposure,
            "recommended_action": notice.get("required_action") or "Draft and submit statutory extension reply or pay liability.",
            "due_date": due_date,
            "deadline": due_date,
            "status": "PENDING",
            "action_state": action_state,
            "source_url": "/notices",
            "automation_candidate": False,
            "can_auto_resolve": False,
            "confidence_score": 0.94,
            "ai_summary": f"System signal flagged under NOTICE.",
            "predicted_impact": "Statutory compliance and penalty avoidance.",
            "updated_at": now_str,
            "created_at": now_str,
            "is_deleted": False,
        }

        if is_supabase_active():
            get_supabase_client().table("action_items") \
                .upsert(payload, on_conflict="action_id") \
                .execute()
    except Exception as e:
        print(f"[WARN] Failed to sync notice to action_items table: {str(e)}")


# -------------------------------------------------------------------------
# RECON ROWS — PER-ROW RECONCILIATION RESULT PERSISTENCE
# -------------------------------------------------------------------------
def save_recon_rows(reconciliation_id: str, results: Dict[str, Any]) -> None:
    """
    Batch-inserts every match/mismatch row into the recon_rows table.
    Rows are inserted in chunks of 500 to avoid Supabase payload limits.
    Also stores a compact JSON summary column for quick reads.
    Falls back silently if Supabase is not active (dev mode).
    """
    if not is_supabase_active():
        print("[WARN] Supabase not active — skipping recon_rows persistence.")
        return

    try:
        all_rows = []
        
        # Matches
        for r in results.get("matches", []):
            all_rows.append({
                "id": str(uuid.uuid4()),
                "reconciliation_id": reconciliation_id,
                "supplier_gstin": r.get("supplier_gstin"),
                "invoice_number": r.get("invoice_number"),
                "invoice_date": r.get("invoice_date"),
                "taxable_value_2b": r.get("taxable_value"),
                "taxable_value_pr": r.get("taxable_value"),
                "igst_2b": r.get("igst"),
                "igst_pr": r.get("igst"),
                "difference": 0.0,
                "status": "MATCHED",
                "is_reviewed": False
            })

        # Mismatches
        for r in results.get("mismatches", []):
            all_rows.append({
                "id": str(uuid.uuid4()),
                "reconciliation_id": reconciliation_id,
                "supplier_gstin": r.get("supplier_gstin"),
                "invoice_number": r.get("invoice_number"),
                "invoice_date": r.get("invoice_date"),
                "taxable_value_2b": r.get("taxable_value_2b"),
                "taxable_value_pr": r.get("taxable_value_books"),
                "igst_2b": r.get("igst_2b"),
                "igst_pr": r.get("igst_books"),
                "difference": r.get("difference"),
                "status": r.get("issue") or "MISMATCH",
                "suggested_action": r.get("recommended_action"),
                "ai_insight": r.get("likely_cause"),
                "is_reviewed": False
            })

        # Batch insert in chunks of 500
        for i in range(0, len(all_rows), 500):
            chunk = all_rows[i:i+500]
            get_supabase_client().table("recon_rows").insert(chunk).execute()

        print(f"[SUCCESS] Persisted {len(all_rows)} recon rows for run {reconciliation_id}.")

    except Exception as e:
        print(f"[ERROR] Failed to save recon rows: {str(e)}")


def get_recon_rows(reconciliation_id: str) -> List[Dict[str, Any]]:
    """
    Fetches all individual match/mismatch rows for a specific reconciliation run.
    """
    if not is_supabase_active():
        raise ValueError("Database unavailable. Cannot fetch reconciliation rows.")
    try:
        res = get_supabase_client().table("recon_rows") \
            .select("*") \
            .eq("reconciliation_id", reconciliation_id) \
            .order("status", desc=True) \
            .execute()
        return cast(List[Dict[str, Any]], res.data or [])
    except Exception as e:
        raise ValueError(f"Failed to fetch recon rows for {reconciliation_id}: {str(e)}") from e


def get_recon_rows_structured(reconciliation_id: str) -> Dict[str, Any]:
    """
    Fetches recon rows and reconstructs the summary/matches/mismatches structure
    expected by the export functions.
    """
    rows = get_recon_rows(reconciliation_id)
    if not rows:
        raise ValueError(f"No recon rows found for reconciliation_id={reconciliation_id}")

    matches = []
    mismatches = []

    for row in rows:
        status_val = (row.get("status") or "").upper()
        # Normalize row keys for exporter compatibility
        normalized = {
            "supplier_gstin": row.get("supplier_gstin"),
            "invoice_number": row.get("invoice_number"),
            "invoice_date": row.get("invoice_date"),
            "taxable_value": row.get("taxable_value_pr") or row.get("taxable_value_2b") or 0.0,
            "taxable_value_2b": row.get("taxable_value_2b"),
            "taxable_value_books": row.get("taxable_value_pr"),
            "difference": row.get("difference") or 0.0,
            "issue": status_val,
            "likely_cause": row.get("ai_insight") or "",
            "recommended_action": row.get("suggested_action") or "",
            "risk_level": "LOW" if status_val == "MATCHED" else "HIGH" if status_val == "MISSING_IN_2B" else "MEDIUM",
            "gstin": row.get("supplier_gstin"),
        }
        if status_val == "MATCHED":
            matches.append(normalized)
        else:
            mismatches.append(normalized)

    # Recompute summary from rows
    status_counts: dict = {}
    for row in rows:
        s = (row.get("status") or "UNKNOWN").upper()
        status_counts[s] = status_counts.get(s, 0) + 1

    summary = {
        "matched": status_counts.get("MATCHED", 0),
        "missing_in_2b": status_counts.get("MISSING_IN_2B", 0),
        "missing_in_books": status_counts.get("MISSING_IN_BOOKS", 0),
        "value_mismatch": status_counts.get("VALUE_MISMATCH", 0),
        "partial_match": status_counts.get("PARTIAL_MATCH", 0),
    }

    return {"summary": summary, "matches": matches, "mismatches": mismatches}


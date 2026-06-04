import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, cast
from supabase import Client

from config.supabase import supabase_client as _raw_client, is_supabase_active

supabase_client: Client = cast(Client, _raw_client)

# -------------------------------------------------------------------------
# CLIENTS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_clients() -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("clients").select("*").eq("is_deleted", False).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
            
    # Fallback to local in-memory store
    from services.client_workspace import MOCK_CLIENTS
    return MOCK_CLIENTS

def get_client_by_id(client_id: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            # Handle both UUID and string IDs
            res = supabase_client.table("clients").select("*").eq("id", client_id).eq("is_deleted", False).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")

    # Fallback to local in-memory store
    from services.client_workspace import MOCK_CLIENTS
    for c in MOCK_CLIENTS:
        if c["id"] == client_id:
            return c
    return None

def create_client(client_data: Dict[str, Any]) -> Dict[str, Any]:
    if is_supabase_active():
        try:
            # Create production UUID and scope to default CA Firm ID
            payload = {
                "id": str(uuid.uuid4()),
                "firm_id": str(uuid.uuid4()), # Dynamic firm tenant
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
            res = supabase_client.table("clients").insert(payload).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback to local in-memory store
    from services.client_workspace import MOCK_CLIENTS
    new_id = f"client-{len(MOCK_CLIENTS) + 1}"
    new_client = {
        "id": new_id,
        "user_id": "mock-user-uuid-12345",
        "business_name": client_data.get("business_name"),
        "legal_name": client_data.get("legal_name") or client_data.get("business_name"),
        "trade_name": client_data.get("trade_name") or client_data.get("business_name"),
        "gstin": client_data.get("gstin", "").upper(),
        "contact_person": client_data.get("contact_person") or "Assigned Auditor",
        "email": client_data.get("email") or "accounts@domain.com",
        "phone": client_data.get("phone") or "+91 99999 99999",
        "state": client_data.get("state") or "Maharashtra",
        "state_code": client_data.get("state_code") or "27",
        "filing_type": client_data.get("filing_type") or "full",
        "filing_frequency": client_data.get("filing_frequency") or "monthly",
        "assigned_manager": client_data.get("assigned_manager") or "Audit Associate",
        "created_at": datetime.now()
    }
    MOCK_CLIENTS.append(new_client)
    return new_client

# -------------------------------------------------------------------------
# RECONCILIATIONS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_reconciliations(client_id: str) -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("reconciliation_runs").select("*").eq("client_id", client_id).eq("is_deleted", False).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")

    # Fallback to local in-memory store
    from services.client_workspace import MOCK_RECON_HISTORY
    return [r for r in MOCK_RECON_HISTORY if r["client_id"] == client_id]

def add_reconciliation(client_id: str, run_data: Dict[str, Any]) -> Dict[str, Any]:
    # Calculate risk score based on mismatch values
    mismatches = run_data.get("mismatch_count", 0)
    risk_val = run_data.get("itc_at_risk", 0.0)
    risk_score = "LOW"
    if mismatches > 3 or risk_val > 50000.0:
        risk_score = "HIGH"
    elif mismatches > 0 or risk_val > 0.0:
        risk_score = "MEDIUM"

    ret = None
    if is_supabase_active():
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
            supabase_client.table("reconciliation_runs").update({"is_deleted": True}).eq("client_id", client_id).eq("filing_period", payload["filing_period"]).execute()
            res = supabase_client.table("reconciliation_runs").insert(payload).execute()
            if res.data:
                ret = res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    if not ret:
        # Fallback to local in-memory store
        from services.client_workspace import MOCK_RECON_HISTORY
        new_recon_id = f"recon-{client_id}-{len(MOCK_RECON_HISTORY) + 1}"
        new_run = {
            "reconciliation_id": new_recon_id,
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
            "upload_timestamp": datetime.now()
        }
        
        # Remove existing record of the same filing period if present to overwrite
        MOCK_RECON_HISTORY = [r for r in MOCK_RECON_HISTORY if not (r["client_id"] == client_id and r["filing_period"] == new_run["filing_period"])]
        MOCK_RECON_HISTORY.append(new_run)
        
        # Save back to client_workspace global list
        import services.client_workspace as cw
        cw.MOCK_RECON_HISTORY = MOCK_RECON_HISTORY
        ret = new_run

    sync_reconciliation_to_action_engine(client_id, ret)
    return ret

# -------------------------------------------------------------------------
# COMPLIANCE DEADLINES CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_compliance(client_id: Optional[str] = None, 
                   compliance_type: Optional[str] = None, 
                   status: Optional[str] = None, 
                   assigned_to: Optional[str] = None) -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            q = supabase_client.table("compliance_tasks").select("*").eq("is_deleted", False)
            if client_id:
                q = q.eq("client_id", client_id)
            if compliance_type:
                q = q.eq("compliance_type", compliance_type)
            if status:
                q = q.eq("status", status)
            if assigned_to:
                q = q.eq("assigned_to", assigned_to)
            res = q.execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")

    # Fallback to compliance_engine query
    from services.compliance_engine import get_all_compliance
    return get_all_compliance(client_id, compliance_type, status, assigned_to)

def create_compliance(data: Dict[str, Any]) -> Dict[str, Any]:
    if is_supabase_active():
        try:
            payload = {
                "compliance_id": str(uuid.uuid4()),
                "client_id": data["client_id"],
                "compliance_type": data["compliance_type"],
                "filing_period": data["filing_period"],
                "due_date": str(data["due_date"]),
                "status": "Upcoming",
                "assigned_to": data.get("assigned_to") or "Aditya Rao",
                "escalation_level": 0,
                "risk_level": "LOW",
                "risk_score": 15.00,
                "is_deleted": False
            }
            res = supabase_client.table("compliance_tasks").insert(payload).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback to compliance_engine creation
    from services.compliance_engine import create_compliance as engine_create
    return engine_create(data)

def update_compliance_status(comp_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("compliance_tasks").update({"status": new_status}).eq("compliance_id", comp_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.compliance_engine import update_compliance_status as engine_status
    return engine_status(comp_id, new_status)

def update_compliance_assignment(comp_id: str, staff: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("compliance_tasks").update({"assigned_to": staff}).eq("compliance_id", comp_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.compliance_engine import update_compliance_assignment as engine_assign
    return engine_assign(comp_id, staff)

# -------------------------------------------------------------------------
# OUTREACH COMMUNICATIONS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_communications(client_id: str) -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("communications").select("*").eq("client_id", client_id).eq("is_deleted", False).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.communication import get_communications_by_client
    return get_communications_by_client(client_id)

def create_communication(data: Dict[str, Any]) -> Dict[str, Any]:
    if is_supabase_active():
        try:
            payload = {
                "id": str(uuid.uuid4()),
                "client_id": data.get("client_id") or "client-1",
                "vendor_name": data["vendor_name"],
                "gstin": data["gstin"],
                "issue": data["issue"],
                "subject": data["subject"],
                "email_body": data["email_body"],
                "priority": data.get("priority") or "HIGH",
                "recommended_deadline": str(data["recommended_deadline"]),
                "status": "Drafted",
                "is_deleted": False
            }
            res = supabase_client.table("communications").insert(payload).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.communication import generate_draft
    return generate_draft(data)

def update_communication_status(comm_id: str, new_status: str) -> bool:
    if is_supabase_active():
        try:
            res = supabase_client.table("communications").update({"status": new_status}).eq("id", comm_id).execute()
            return len(res.data) > 0
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.communication import update_communication_status as comm_status
    return comm_status(comm_id, new_status)

# -------------------------------------------------------------------------
# ACTION CENTER CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_action_items() -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("action_items").select("*").eq("status", "PENDING").eq("is_deleted", False).execute()
            # Sort by risk score descending
            data = res.data
            data.sort(key=lambda x: float(x.get("risk_score", 0.0)), reverse=True)
            return data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.action_center import get_ranked_actions
    return get_ranked_actions()

def resolve_action_item(action_id: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("action_items").update({"status": "RESOLVED"}).eq("action_id", action_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")

    # Fallback
    from services.action_center import resolve_action_item as engine_resolve
    return engine_resolve(action_id)

# -------------------------------------------------------------------------
# MOCK STORES FOR JOBS & NOTIFICATIONS
# -------------------------------------------------------------------------
MOCK_JOBS = [
    {
        "job_id": "job-1",
        "job_type": "action_center_refresh",
        "status": "COMPLETED",
        "progress": 100.0,
        "retry_count": 0,
        "created_at": datetime(2026, 5, 28, 9, 0, 0),
        "completed_at": datetime(2026, 5, 28, 9, 0, 5),
        "error_logs": None
    },
    {
        "job_id": "job-2",
        "job_type": "compliance_reminders",
        "status": "COMPLETED",
        "progress": 100.0,
        "retry_count": 0,
        "created_at": datetime(2026, 5, 28, 10, 0, 0),
        "completed_at": datetime(2026, 5, 28, 10, 0, 12),
        "error_logs": None
    },
    {
        "job_id": "job-3",
        "job_type": "report_generation",
        "status": "FAILED",
        "progress": 45.0,
        "retry_count": 2,
        "created_at": datetime(2026, 5, 28, 11, 30, 0),
        "completed_at": datetime(2026, 5, 28, 11, 30, 15),
        "error_logs": "ConnectionTimeoutError: Failed to reach GST portal endpoint after 3 attempts."
    }
]

MOCK_NOTIFICATIONS: list = []

# -------------------------------------------------------------------------
# OPERATIONS JOBS CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_jobs() -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("jobs").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
    return MOCK_JOBS

def get_job_by_id(job_id: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("jobs").select("*").eq("job_id", job_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
    for j in MOCK_JOBS:
        if j["job_id"] == job_id:
            return j
    return None

def create_job(job_type: str, status: str = "PENDING") -> Dict[str, Any]:
    new_job = {
        "job_id": f"job-{str(uuid.uuid4())[:8]}",
        "job_type": job_type,
        "status": status,
        "progress": 0.0,
        "retry_count": 0,
        "created_at": datetime.now(),
        "completed_at": None,
        "error_logs": None
    }
    if is_supabase_active():
        try:
            res = supabase_client.table("jobs").insert(new_job).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")
    
    MOCK_JOBS.insert(0, new_job)
    return new_job

def update_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("jobs").update(updates).eq("job_id", job_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")
            
    for j in MOCK_JOBS:
        if j["job_id"] == job_id:
            for k, v in updates.items():
                j[k] = v
            return j
    return None

# -------------------------------------------------------------------------
# NOTIFICATIONS LOGGER CRUD ABSTRACTION
# -------------------------------------------------------------------------
def get_notifications_log() -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("notifications_log").select("*").order("sent_at", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
    return MOCK_NOTIFICATIONS

def create_notification_log(channel: str, recipient: str, body: str, status: str, subject: Optional[str] = None) -> Dict[str, Any]:
    new_notif = {
        "id": f"notif-{str(uuid.uuid4())[:8]}",
        "channel": channel,
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "status": status,
        "sent_at": datetime.now()
    }
    if is_supabase_active():
        try:
            res = supabase_client.table("notifications_log").insert(new_notif).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")
            
    MOCK_NOTIFICATIONS.insert(0, new_notif)
    return new_notif


# -------------------------------------------------------------------------
# GST NOTICES PERSISTENCE & MOCK REGISTRY
# -------------------------------------------------------------------------
MOCK_NOTICES: list = []

def get_notices(client_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if is_supabase_active():
        try:
            q = supabase_client.table("gst_notices").select("*").eq("is_deleted", False)
            if client_id:
                q = q.eq("client_id", client_id)
            res = q.order("risk_level", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
    
    if client_id:
        return [n for n in MOCK_NOTICES if n["client_id"] == client_id]
    return MOCK_NOTICES

def get_notice_by_id(notice_id: str) -> Optional[Dict[str, Any]]:
    if is_supabase_active():
        try:
            res = supabase_client.table("gst_notices").select("*").eq("id", notice_id).eq("is_deleted", False).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase query error: {str(e)}. Falling back to in-memory store.")
            
    for n in MOCK_NOTICES:
        if n["id"] == notice_id:
            return n
    return None

def create_notice(notice_data: Dict[str, Any]) -> Dict[str, Any]:
    tax_amount = float(notice_data.get("tax_amount", 0.0))
    interest_est = float(notice_data.get("interest_exposure_est") or (tax_amount * 0.18))
    penalty_est = float(notice_data.get("penalty_exposure_est") or max(10000.0, tax_amount * 0.10))
    total_est = tax_amount + interest_est + penalty_est

    new_notice = {
        "id": notice_data.get("id") or f"notice-{str(uuid.uuid4())[:8]}",
        "client_id": notice_data["client_id"],
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
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
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
    
    ret = None
    if is_supabase_active():
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
            
            res = supabase_client.table("gst_notices").insert(payload).execute()
            if res.data:
                ret = res.data[0]
        except Exception as e:
            print(f"Supabase write error: {str(e)}. Falling back to in-memory store.")
            
    if not ret:
        MOCK_NOTICES.insert(0, new_notice)
        ret = new_notice

    sync_notice_to_action_engine(ret)
    return ret

def update_notice_status(notice_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    ret = None
    if is_supabase_active():
        try:
            res = supabase_client.table("gst_notices").update({"status": new_status, "updated_at": datetime.now().isoformat()}).eq("id", notice_id).execute()
            if res.data:
                ret = res.data[0]
        except Exception as e:
            print(f"Supabase update error: {str(e)}. Falling back to in-memory store.")
            
    if not ret:
        for n in MOCK_NOTICES:
            if n["id"] == notice_id:
                n["status"] = new_status
                n["updated_at"] = datetime.now()
                ret = n
                break
                
    if ret:
        sync_notice_to_action_engine(ret)
    return ret


# -------------------------------------------------------------------------
# CENTRAL ACTION ENGINE SYNCHRONIZATION HELPERS
# -------------------------------------------------------------------------
def sync_reconciliation_to_action_engine(client_id: str, run: Dict[str, Any]):
    try:
        from services.action_engine import action_engine
        
        mismatches = run.get("mismatch_count", 0)
        risk_val = float(run.get("itc_at_risk", 0.0))
        period = run.get("filing_period") or run.get("month") or "2024-03"
        
        act_id = f"act-recon-{client_id}-{period}"
        
        if mismatches == 0 and risk_val == 0.0:
            action_engine.resolve_action_item(act_id)
            return
            
        risk_score = 30.0
        if mismatches > 3 or risk_val > 50000.0:
            risk_score = 90.0
        elif mismatches > 0 or risk_val > 0.0:
            risk_score = 65.0
            
        action_engine.push_action_item({
            "id": act_id,
            "client_id": client_id,
            "source_module": "RECONCILIATION",
            "title": f"Reconciliation Discrepancy: {period}",
            "description": f"Reconciliation check identified {mismatches} mismatches and ₹{risk_val:,.2f} in at-risk ITC for filing period {period}.",
            "risk_score": risk_score,
            "exposure_amount": risk_val,
            "recommended_action": "Run GSTR-2B automated reconciliation audit matching invoices and withhold vendor payment.",
            "due_date": (date.today() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "action_state": "NEW",
            "source_url": "/gst-recon",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.96
        })
    except Exception as e:
        print(f"[WARN] Failed to sync reconciliation run to action engine: {str(e)}")

def sync_notice_to_action_engine(notice: Dict[str, Any]):
    try:
        from services.action_engine import action_engine
        
        status = notice.get("status")
        act_id = f"act-notice-{notice['id']}"
        
        if status in ["RESOLVED", "CLOSED"]:
            action_engine.resolve_action_item(act_id)
            return
            
        action_state = "NEW"
        if status == "DRAFTED":
            action_state = "IN_PROGRESS"
            
        due_date = notice.get("due_date")
        if isinstance(due_date, (date, datetime)):
            due_date = due_date.strftime("%Y-%m-%d")
            
        action_engine.push_action_item({
            "id": act_id,
            "client_id": notice.get("client_id"),
            "client_name": notice.get("client_name"),
            "source_module": "NOTICE",
            "title": f"Notice Reply Required: {notice.get('notice_type', 'Notice')} SCN",
            "description": f"GST notice {notice.get('notice_number')} issued under sections {', '.join(notice.get('section_references', [])) or 'GST regulations'}. Demanded tax amount: ₹{notice.get('tax_amount', 0.0):,.2f}.",
            "risk_score": float(notice.get("risk_score", 60.0)),
            "exposure_amount": float(notice.get("total_exposure_est") or notice.get("tax_amount", 0.0)),
            "recommended_action": notice.get("required_action") or "Draft and submit statutory extension reply or pay liability.",
            "due_date": due_date,
            "action_state": action_state,
            "source_url": "/notices",
            "automation_candidate": False,
            "can_auto_resolve": False,
            "confidence_score": 0.94
        })
    except Exception as e:
        print(f"[WARN] Failed to sync notice to action engine: {str(e)}")



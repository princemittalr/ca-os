import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

# Setup logger
logger = logging.getLogger("demo_engine")

# --- GLOBAL FEATURE FLAGS ---
FEATURE_FLAGS = {
    "AI_ENABLED": True,
    "NOTICES_ENABLED": True,
    "MOCK_MODE_ENABLED": True
}

# --- DEMO TELEMETRY ENGAGEMENT ANALYTICS ---
DEMO_ANALYTICS_LOGS: List[Dict[str, Any]] = []

def record_demo_analytic(event_name: str, metadata: Optional[Dict[str, Any]] = None):
    """
    Log user engagement events inside the interactive pilot sandbox workspace.
    """
    global DEMO_ANALYTICS_LOGS
    event = {
        "timestamp": datetime.now().isoformat(),
        "event_name": event_name,
        "metadata": metadata or {}
    }
    DEMO_ANALYTICS_LOGS.append(event)
    logger.info(f"[PILOT ANALYTICS LOGGED] Event: {event_name} | Metadata: {metadata}")

# --- STANDARDIZED BENCHMARK SEEDS ---
def get_seeded_clients() -> List[Dict[str, Any]]:
    return [
        {
            "id": "client-1",
            "user_id": "mock-user-uuid-12345",
            "business_name": "Apex Auto Components Ltd",
            "legal_name": "Apex Auto Components Limited",
            "trade_name": "Apex Manufacturing",
            "gstin": "27AAAAP9999M1Z9",
            "contact_person": "Vikram Shinde",
            "email": "v.shinde@apexcomponents.com",
            "phone": "+91 98234 56781",
            "state": "Maharashtra",
            "state_code": "27",
            "filing_type": "full",
            "filing_frequency": "monthly",
            "assigned_manager": "Aditya Rao",
            "created_at": datetime(2024, 1, 10, 10, 0)
        },
        {
            "id": "client-2",
            "user_id": "mock-user-uuid-12345",
            "business_name": "Vardhaman Wholesale Traders",
            "legal_name": "Vardhaman Wholesale & Trading Corp",
            "trade_name": "Vardhaman Traders",
            "gstin": "09AABCV7777E1Z5",
            "contact_person": "Amit Jain",
            "email": "amit.jain@vardhamanwholesalers.com",
            "phone": "+91 94444 88888",
            "state": "Uttar Pradesh",
            "state_code": "09",
            "filing_type": "gst_only",
            "filing_frequency": "monthly",
            "assigned_manager": "Neha Sharma",
            "created_at": datetime(2024, 2, 12, 11, 30)
        },
        {
            "id": "client-3",
            "user_id": "mock-user-uuid-12345",
            "business_name": "Indigo Global Freight",
            "legal_name": "Indigo Import Export & Logistics Limited",
            "trade_name": "Indigo Global",
            "gstin": "24AABCI4444D1Z2",
            "contact_person": "Ramesh Patel",
            "email": "shipping@indigoglobal.in",
            "phone": "+91 91234 11111",
            "state": "Gujarat",
            "state_code": "24",
            "filing_type": "full",
            "filing_frequency": "quarterly",
            "assigned_manager": "Rohan Mehta",
            "created_at": datetime(2023, 12, 5, 9, 15)
        },
        {
            "id": "client-4",
            "user_id": "mock-user-uuid-12345",
            "business_name": "TechNova Software Solutions",
            "legal_name": "TechNova Software Solutions Pvt Ltd",
            "trade_name": "TechNova Services",
            "gstin": "27AAACT1234A1Z5",
            "contact_person": "Meera Nair",
            "email": "billing@technova.co.in",
            "phone": "+91 99999 55555",
            "state": "Karnataka",
            "state_code": "29",
            "filing_type": "gst_tds",
            "filing_frequency": "monthly",
            "assigned_manager": "Kunal Sen",
            "created_at": datetime(2024, 3, 1, 14, 0)
        }
    ]

def get_seeded_reconciliations() -> List[Dict[str, Any]]:
    return [
        {
            "reconciliation_id": "recon-apex-01",
            "client_id": "client-1",
            "filing_period": "2024-03",
            "reconciliation_status": "Completed with Mismatches",
            "total_invoices": 40,
            "matched_count": 28,
            "mismatch_count": 12,
            "missing_in_2b_count": 6,
            "missing_in_books_count": 4,
            "itc_at_risk": 450000.0,
            "itc_protected": 245000.0,
            "risk_score": "HIGH",
            "upload_timestamp": datetime.now() - timedelta(hours=2)
        },
        {
            "reconciliation_id": "recon-vardhaman-01",
            "client_id": "client-2",
            "filing_period": "2024-03",
            "reconciliation_status": "Completed with Mismatches",
            "total_invoices": 18,
            "matched_count": 13,
            "mismatch_count": 5,
            "missing_in_2b_count": 2,
            "missing_in_books_count": 3,
            "itc_at_risk": 75000.0,
            "itc_protected": 90000.0,
            "risk_score": "MEDIUM",
            "upload_timestamp": datetime.now() - timedelta(hours=4)
        },
        {
            "reconciliation_id": "recon-indigo-01",
            "client_id": "client-3",
            "filing_period": "2024-03",
            "reconciliation_status": "Fully Matched",
            "total_invoices": 50,
            "matched_count": 50,
            "mismatch_count": 0,
            "missing_in_2b_count": 0,
            "missing_in_books_count": 0,
            "itc_at_risk": 0.0,
            "itc_protected": 890000.0,
            "risk_score": "LOW",
            "upload_timestamp": datetime.now() - timedelta(days=1)
        },
        {
            "reconciliation_id": "recon-technova-01",
            "client_id": "client-4",
            "filing_period": "2024-03",
            "reconciliation_status": "Completed with Mismatches",
            "total_invoices": 22,
            "matched_count": 18,
            "mismatch_count": 4,
            "missing_in_2b_count": 3,
            "missing_in_books_count": 1,
            "itc_at_risk": 120000.0,
            "itc_protected": 180000.0,
            "risk_score": "MEDIUM",
            "upload_timestamp": datetime.now() - timedelta(hours=6)
        }
    ]

def get_seeded_compliance() -> List[Dict[str, Any]]:
    today = date.today()
    return [
        {
            "compliance_id": "comp-apex-gstr3b",
            "client_id": "client-1",  # Apex Auto
            "compliance_type": "GSTR-3B",
            "filing_period": "March 2024",
            "due_date": today - timedelta(days=5),  # Overdue by 5 days -> Escalated!
            "status": "Upcoming",
            "assigned_to": "Aditya Rao",
            "escalation_level": 0,
            "risk_level": "LOW",
            "risk_score": 15.0
        },
        {
            "compliance_id": "comp-vardhaman-tds",
            "client_id": "client-2",  # Vardhaman Traders
            "compliance_type": "TDS Returns",
            "filing_period": "Q4 2023-24",
            "due_date": today,  # Due Today!
            "status": "Upcoming",
            "assigned_to": "Neha Sharma",
            "escalation_level": 0,
            "risk_level": "LOW",
            "risk_score": 15.0
        },
        {
            "compliance_id": "comp-indigo-roc",
            "client_id": "client-3",  # Indigo Freight
            "compliance_type": "ROC Filing",
            "filing_period": "FY 2023-24",
            "due_date": today + timedelta(days=10),  # Upcoming
            "status": "Upcoming",
            "assigned_to": "Rohan Mehta",
            "escalation_level": 0,
            "risk_level": "LOW",
            "risk_score": 15.0
        },
        {
            "compliance_id": "comp-technova-adv",
            "client_id": "client-4",  # TechNova Solutions
            "compliance_type": "Advance Tax",
            "filing_period": "Q4 FY24",
            "due_date": today + timedelta(days=3),  # Upcoming
            "status": "Upcoming",
            "assigned_to": "Kunal Sen",
            "escalation_level": 0,
            "risk_level": "LOW",
            "risk_score": 15.0
        }
    ]

def get_seeded_notices() -> List[Dict[str, Any]]:
    today = date.today()
    return [
        {
            "id": "notice-apex-drc01",
            "client_id": "client-1",
            "client_name": "Apex Auto Components Ltd",
            "notice_number": "GST/APX/2026/DRC-01/992",
            "issuing_authority": "Deputy Commissioner of Tax, Pune Center",
            "section_references": ["Section 73", "Section 16(4)"],
            "notice_type": "DRC-01",
            "tax_amount": 450000.0,
            "due_date": today + timedelta(days=15),
            "hearing_date": today + timedelta(days=10),
            "summary": "Show cause notice under Section 73 issued regarding input tax credit blockages. Substantial GSTR-2B discrepancies identified for books registers.",
            "risk_level": "HIGH",
            "required_action": "Compile books registers, identify mismatched vendor invoices, and submit extension request.",
            "status": "PENDING",
            "file_path": "/uploads/notices/apex_drc01.pdf",
            "raw_ocr_text": "OFFICE OF THE COMMISSIONER OF STATE TAX, MAHARASHTRA... FORM GST DRC-01... SHOW CAUSE NOTICE UNDER SECTION 73... GSTIN: 27AAAAP9999M1Z9...",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "gstin": "27AAAAP9999M1Z9"
        },
        {
            "id": "notice-vardhaman-asmt10",
            "client_id": "client-2",
            "client_name": "Vardhaman Wholesale Traders",
            "notice_number": "GST/VRD/2026/ASMT-10/228",
            "issuing_authority": "State Tax Officer, Lucknow Division",
            "section_references": ["Section 61"],
            "notice_type": "ASMT-10",
            "tax_amount": 75000.0,
            "due_date": today + timedelta(days=7),
            "hearing_date": None,
            "summary": "Discrepancy scrutiny notice under Section 61. Out-of-period input ledger matching indicates value discrepancies.",
            "risk_level": "MEDIUM",
            "required_action": "Verify portal entries, draft formal statutory response, and file DRC-03 if necessary.",
            "status": "DRAFTED",
            "file_path": "/uploads/notices/vardhaman_asmt10.pdf",
            "raw_ocr_text": "COMMISSIONERATE OF STATE TAX, UTTAR PRADESH... FORM GST ASMT-10... SCRUTINY NOTICE UNDER SECTION 61... GSTIN: 09AABCV7777E1Z5...",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "gstin": "09AABCV7777E1Z5"
        }
    ]

def get_seeded_action_items() -> List[Dict[str, Any]]:
    today = date.today()
    return [
        {
            "id": "act-apex-overdue",
            "action_id": "act-apex-overdue",
            "client_id": "client-1",
            "client_name": "Apex Auto Components Ltd",
            "source_module": "COMPLIANCE",
            "category": "COMPLIANCE",
            "priority": "HIGH",
            "title": "Escalated Return: GSTR-3B Overdue 5 Days",
            "description": "Apex Auto Components GSTR-3B tax offset filing is overdue by 5 days. STATUTORY WARNING: Daily interest penalties accumulating rapidly.",
            "recommended_action": "Verify purchase register balance and offset statutory tax offset immediately.",
            "due_date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "deadline": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "risk_score": 98.0,
            "status": "PENDING",
            "action_state": "IN_PROGRESS",
            "source_url": "/compliance",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.99,
            "ai_summary": "Filing breach profile. Late filing delays blocking subsequent supplier credits, exposing client portfolio to scrutiny reviews.",
            "predicted_impact": "Saves ₹25,000 late fees and avoids immediate corporate bank account freezings."
        },
        {
            "id": "act-apex-recon",
            "action_id": "act-apex-recon",
            "client_id": "client-1",
            "client_name": "Apex Auto Components Ltd",
            "source_module": "RECONCILIATION",
            "category": "RECONCILIATION",
            "priority": "HIGH",
            "title": "High Blocked ITC Reconciliation Discrepancy",
            "description": "Automatic matching check flagged ₹4.5L blocked ITC variance for March 2024. Massive value mismatches detected across 6 vendor invoices.",
            "recommended_action": "Launch GSTR-2B Recon Desk to pinpoint supplier filing delays.",
            "due_date": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
            "deadline": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
            "risk_score": 94.0,
            "status": "PENDING",
            "action_state": "NEW",
            "source_url": "/gst-recon",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.97,
            "ai_summary": "High financial discrepancy. Massive ITC leakage detected due to non-filing of GSTR-1 by key suppliers.",
            "predicted_impact": "Recovers ₹4,50,000 in legitimate input credit balance."
        },
        {
            "id": "act-vardhaman-tds",
            "action_id": "act-vardhaman-tds",
            "client_id": "client-2",
            "client_name": "Vardhaman Wholesale Traders",
            "source_module": "COMPLIANCE",
            "category": "COMPLIANCE",
            "priority": "HIGH",
            "title": "Filing Due Today: TDS Return Q4 Submission",
            "description": "Filing deadline for TDS returns Q4 is TODAY. Deductor details and PAN records verification pending validation.",
            "recommended_action": "Execute automatic verification panel and submit return directories.",
            "due_date": today.strftime("%Y-%m-%d"),
            "deadline": today.strftime("%Y-%m-%d"),
            "risk_score": 85.0,
            "status": "PENDING",
            "action_state": "NEW",
            "source_url": "/compliance",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.91,
            "ai_summary": "TDS Return deadline. Incomplete PAN validations risk flat penalty fees of ₹200 per day under statutory sections.",
            "predicted_impact": "Protects CA client from default interest liabilities and structural delays."
        },
        {
            "id": "act-technova-adv",
            "action_id": "act-technova-adv",
            "client_id": "client-4",
            "client_name": "TechNova Software Solutions",
            "source_module": "COMPLIANCE",
            "category": "RISK",
            "priority": "MEDIUM",
            "title": "Upcoming Advance Tax Installment Deadline",
            "description": "Final Advance Tax filing installment is due in 3 days. Corporate tax computation checks must be validated.",
            "recommended_action": "Review draft income projections and initiate payment sequence.",
            "due_date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
            "deadline": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
            "risk_score": 58.0,
            "status": "PENDING",
            "action_state": "NEW",
            "source_url": "/compliance",
            "automation_candidate": True,
            "can_auto_resolve": True,
            "confidence_score": 0.88,
            "ai_summary": "Statutory advance tax timeline. Delays trigger 1% monthly interest interest penalties under Section 234C.",
            "predicted_impact": "Avoids audit interest accumulation and validates corporate tax planning."
        }
    ]

def get_seeded_communications() -> List[Dict[str, Any]]:
    today = date.today()
    return [
        {
            "id": "comm-apex-sharma",
            "client_id": "client-1",
            "vendor_name": "Sharma Components Corp",
            "gstin": "27AAAAS4444F1Z8",
            "issue": "Missing in 2B",
            "subject": "URGENT GST DISCREPANCY: Sharma Components Corp - Invoice INV-902",
            "email_body": "Dear Accounts Team,\n\nOur statutory audit check for Apex Auto Components Ltd indicates that your invoice INV-902 dated 10-03-2024 has not been uploaded to the GST portal and is missing from our GSTR-2B statement. This blocks our legitimate input tax credit (ITC) claim of ₹1,20,000.\n\nPlease upload this invoice immediately in your GSTR-1 return. We look forward to your quick confirmation.\n\nBest Regards,\nAudit Desk\nApex Auto Components Ltd",
            "priority": "HIGH",
            "recommended_deadline": (today + timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "Drafted"
        }
    ]

def reset_demo_workspace():
    """
    Clears active CA-OS database arrays and seeds them with standardized demo datasets.
    Operates recursively on both in-memory arrays and Supabase tables (if active).
    """
    record_demo_analytic("sandbox_reset_triggered")
    
    # 1. Reset In-Memory Lists in services.client_workspace
    import services.client_workspace as cw
    cw.MOCK_CLIENTS.clear()
    cw.MOCK_CLIENTS.extend(get_seeded_clients())
    
    cw.MOCK_RECON_HISTORY.clear()
    cw.MOCK_RECON_HISTORY.extend(get_seeded_reconciliations())
    
    # 2. Reset In-Memory Lists in services.compliance_engine
    import services.compliance_engine as ce
    ce.MOCK_COMPLIANCE.clear()
    ce.MOCK_COMPLIANCE.extend(get_seeded_compliance())
    
    # 3. Reset In-Memory Lists in services.communication
    import services.communication as comm
    comm.MOCK_COMMUNICATIONS = get_seeded_communications()
    
    # 4. Reset In-Memory Lists in services.action_center
    import services.action_center as ac
    ac.MOCK_ACTIONS.clear()
    ac.MOCK_ACTIONS.extend(get_seeded_action_items())
    
    # 5. Reset In-Memory Lists in services.db.manager
    import services.db.manager as dbm
    dbm.MOCK_NOTICES.clear()
    dbm.MOCK_NOTICES.extend(get_seeded_notices())
    
    dbm.MOCK_JOBS.clear()
    dbm.MOCK_JOBS.extend([
        {
            "job_id": "job-demo-1",
            "job_type": "action_center_refresh",
            "status": "COMPLETED",
            "progress": 100.0,
            "retry_count": 0,
            "created_at": datetime.now() - timedelta(minutes=5),
            "completed_at": datetime.now() - timedelta(minutes=5) + timedelta(seconds=2),
            "error_logs": None
        },
        {
            "job_id": "job-demo-2",
            "job_type": "compliance_reminders",
            "status": "COMPLETED",
            "progress": 100.0,
            "retry_count": 0,
            "created_at": datetime.now() - timedelta(minutes=10),
            "completed_at": datetime.now() - timedelta(minutes=10) + timedelta(seconds=8),
            "error_logs": None
        }
    ])
    
    dbm.MOCK_NOTIFICATIONS.clear()
    dbm.MOCK_NOTIFICATIONS.extend([
        {
            "id": "notif-demo-1",
            "channel": "EMAIL",
            "recipient": "v.shinde@apexcomponents.com",
            "subject": "Overdue GSTR-3B Reminder Notification",
            "body": "Statutory Warning: GSTR-3B filing is overdue by 5 days. Avoid further interest accrual.",
            "status": "SENT",
            "sent_at": datetime.now() - timedelta(minutes=4)
        }
    ])

    # 6. Database reset (if Supabase persistent connection is active)
    from config.supabase import is_supabase_active, supabase_client
    if is_supabase_active():
        try:
            logger.info("Supabase active. Seeding persistent database tables...")
            # Truncate tables for default demo scopes (or soft wipe scoped entries)
            # Since standard pilots require clean tables, we can soft-reset via is_deleted flags or deletion queries.
            # We delete existing demo clients and re-insert
            client_ids = ["client-1", "client-2", "client-3", "client-4"]
            for cid in client_ids:
                supabase_client.table("clients").delete().eq("id", cid).execute()
                supabase_client.table("reconciliation_runs").delete().eq("client_id", cid).execute()
                supabase_client.table("compliance_tasks").delete().eq("client_id", cid).execute()
                supabase_client.table("communications").delete().eq("client_id", cid).execute()
                supabase_client.table("action_items").delete().eq("client_id", cid).execute()
                supabase_client.table("gst_notices").delete().eq("client_id", cid).execute()
                
            # Seed them in Supabase
            # Insert clients
            for c in get_seeded_clients():
                payload = {**c, "firm_id": "mock-firm-uuid-12345", "contact_person": c["contact_person"], "is_deleted": False}
                payload["created_at"] = payload["created_at"].isoformat()
                supabase_client.table("clients").insert(payload).execute()
                
            # Insert Reconciliations
            for r in get_seeded_reconciliations():
                payload = {
                    "reconciliation_id": r["reconciliation_id"],
                    "client_id": r["client_id"],
                    "filing_period": r["filing_period"],
                    "reconciliation_status": r["reconciliation_status"],
                    "total_invoices": r["total_invoices"],
                    "matched_count": r["matched_count"],
                    "mismatch_count": r["mismatch_count"],
                    "missing_in_2b_count": r["missing_in_2b_count"],
                    "missing_in_books_count": r["missing_in_books_count"],
                    "itc_at_risk": r["itc_at_risk"],
                    "itc_protected": r["itc_protected"],
                    "risk_score": r["risk_score"],
                    "is_deleted": False
                }
                supabase_client.table("reconciliation_runs").insert(payload).execute()
                
            # Insert Compliance Tasks
            for comp in get_seeded_compliance():
                payload = {
                    "compliance_id": comp["compliance_id"],
                    "client_id": comp["client_id"],
                    "compliance_type": comp["compliance_type"],
                    "filing_period": comp["filing_period"],
                    "due_date": comp["due_date"].isoformat(),
                    "status": comp["status"],
                    "assigned_to": comp["assigned_to"],
                    "escalation_level": comp["escalation_level"],
                    "risk_level": comp["risk_level"],
                    "risk_score": comp["risk_score"],
                    "is_deleted": False
                }
                supabase_client.table("compliance_tasks").insert(payload).execute()
                
            # Insert Notices
            for n in get_seeded_notices():
                payload = {
                    "id": n["id"],
                    "client_id": n["client_id"],
                    "client_name": n["client_name"],
                    "notice_number": n["notice_number"],
                    "issuing_authority": n["issuing_authority"],
                    "section_references": n["section_references"],
                    "notice_type": n["notice_type"],
                    "tax_amount": n["tax_amount"],
                    "due_date": n["due_date"].isoformat(),
                    "hearing_date": n["hearing_date"].isoformat() if n["hearing_date"] else None,
                    "summary": n["summary"],
                    "risk_level": n["risk_level"],
                    "required_action": n["required_action"],
                    "status": n["status"],
                    "file_path": n["file_path"],
                    "raw_ocr_text": n["raw_ocr_text"],
                    "gstin": n["gstin"],
                    "is_deleted": False
                }
                supabase_client.table("gst_notices").insert(payload).execute()
                
            # Insert Action Items
            for a in get_seeded_action_items():
                payload = {
                    "action_id": a["action_id"],
                    "client_id": a["client_id"],
                    "client_name": a["client_name"],
                    "category": a["category"],
                    "priority": a["priority"],
                    "title": a["title"],
                    "description": a["description"],
                    "recommended_action": a["recommended_action"],
                    "deadline": a["deadline"],
                    "risk_score": a["risk_score"],
                    "status": a["status"],
                    "is_deleted": False
                }
                supabase_client.table("action_items").insert(payload).execute()
                
            logger.info("✓ Persistent Database Tables Seeding: OK")
        except Exception as err:
            logger.error(f"Failed to seed Supabase tables: {err}. Proceeding with local mock cache.")
            
    logger.info("✓ Demonstration Sandbox Reset sequence executed successfully!")
    return True

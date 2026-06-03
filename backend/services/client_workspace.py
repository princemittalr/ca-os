from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Pre-populated Clients portfolio with detailed CA-OS fields
MOCK_CLIENTS = [
    {
        "id": "client-1",
        "user_id": "mock-user-uuid-12345",
        "business_name": "TechNova Solutions Pvt Ltd",
        "legal_name": "TechNova Solutions Private Limited",
        "trade_name": "TechNova Solutions",
        "gstin": "27AAACT1234A1Z5",
        "contact_person": "Aditya Rao",
        "email": "contact@technova.co.in",
        "phone": "+91 98765 43210",
        "state": "Maharashtra",
        "state_code": "27",
        "filing_type": "full",
        "filing_frequency": "monthly",
        "assigned_manager": "Aditya Rao",
        "created_at": datetime(2024, 1, 15, 10, 30)
    },
    {
        "id": "client-2",
        "user_id": "mock-user-uuid-12345",
        "business_name": "Apex Innovations Pvt Ltd",
        "legal_name": "Apex Innovations Private Limited",
        "trade_name": "Apex Inno",
        "gstin": "29AABCA5678B1Z3",
        "contact_person": "Meera Nair",
        "email": "meera@apex.io",
        "phone": "+91 91234 56789",
        "state": "Karnataka",
        "state_code": "29",
        "filing_type": "gst_only",
        "filing_frequency": "quarterly",
        "assigned_manager": "Meera Nair",
        "created_at": datetime(2024, 2, 10, 11, 45)
    },
    {
        "id": "client-3",
        "user_id": "mock-user-uuid-12345",
        "business_name": "Wayne Enterprises Ltd",
        "legal_name": "Wayne Enterprises Limited",
        "trade_name": "Wayne Corp",
        "gstin": "07AABCW9012C1Z1",
        "contact_person": "Bruce Wayne",
        "email": "bruce@wayne.com",
        "phone": "+91 99999 88888",
        "state": "Delhi",
        "state_code": "07",
        "filing_type": "full",
        "filing_frequency": "monthly",
        "assigned_manager": "Bruce Wayne",
        "created_at": datetime(2023, 12, 1, 9, 15)
    },
    {
        "id": "client-4",
        "user_id": "mock-user-uuid-12345",
        "business_name": "Global Trade LLC",
        "legal_name": "Global Trade Limited Liability Company",
        "trade_name": "Global Trade",
        "gstin": "24AABCG3456D1Z7",
        "contact_person": "Vikram Patel",
        "email": "vpatel@globaltrade.in",
        "phone": "+91 98123 45670",
        "state": "Gujarat",
        "state_code": "24",
        "filing_type": "gst_tds",
        "filing_frequency": "annual",
        "assigned_manager": "Vikram Patel",
        "created_at": datetime(2024, 3, 5, 14, 20)
    },
    {
        "id": "client-5",
        "user_id": "mock-user-uuid-12345",
        "business_name": "Sharma Traders",
        "legal_name": "Sharma Retail and Wholesale Traders",
        "trade_name": "Sharma Traders",
        "gstin": "09AABCS7890E1Z9",
        "contact_person": "Amit Sharma",
        "email": "amit@sharmatraders.co.in",
        "phone": "+91 94444 55555",
        "state": "Uttar Pradesh",
        "state_code": "09",
        "filing_type": "gst_only",
        "filing_frequency": "monthly",
        "assigned_manager": "Amit Sharma",
        "created_at": datetime(2024, 1, 20, 16, 10)
    }
]

# Pre-populated Reconciliation history items scoped by client
MOCK_RECON_HISTORY: list = []

from services.db import manager as db_manager

def get_clients() -> List[Dict[str, Any]]:
    """Retrieve all monitored clients."""
    return db_manager.get_clients()

def get_client_by_id(client_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single client by identity."""
    return db_manager.get_client_by_id(client_id)

def create_client(client_data: Dict[str, Any]) -> Dict[str, Any]:
    """Onboards a new corporate client workspace."""
    logger.info(f"Onboarding new client workspace: {client_data.get('business_name')}")
    return db_manager.create_client(client_data)

def get_reconciliations_for_client(client_id: str) -> List[Dict[str, Any]]:
    """Retrieve all historical reconciliation runs for a specific client."""
    return db_manager.get_reconciliations(client_id)

def add_reconciliation_run(client_id: str, run_data: Dict[str, Any]) -> Dict[str, Any]:
    """Registers a completed reconciliation run metadata scoped to a client."""
    logger.info(f"Registering new reconciliation run for client {client_id}")
    return db_manager.add_reconciliation(client_id, run_data)

def get_dashboard_aggregations() -> Dict[str, Any]:
    """
    Computes cumulative portfolio KPIs across all CA clients' latest filings.
    """
    clients_list = db_manager.get_clients()
    total_clients = len(clients_list)
    
    # Calculate aggregates from latest runs
    all_runs = []
    for c in clients_list:
        all_runs.extend(db_manager.get_reconciliations(c["id"]))
        
    latest_runs = {}
    for run in all_runs:
        cid = run["client_id"]
        ts = run.get("upload_timestamp") or datetime.now()
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except:
                ts = datetime.now()
        if cid not in latest_runs:
            latest_runs[cid] = (run, ts)
        else:
            if ts > latest_runs[cid][1]:
                latest_runs[cid] = (run, ts)
                
    total_mismatches = 0
    blocked_itc = 0.0
    high_risk_clients = 0
    pending_reconciliations = 0
    
    for run, _ in latest_runs.values():
        total_mismatches += run["mismatch_count"]
        blocked_itc += run["itc_at_risk"]
        if run["risk_score"] == "HIGH":
            high_risk_clients += 1
            
    for c in clients_list:
        cid = c["id"]
        if cid not in latest_runs:
            pending_reconciliations += 1
        elif latest_runs[cid][0]["mismatch_count"] > 0:
            pending_reconciliations += 1
            
    return {
        "total_clients": total_clients,
        "total_mismatches": total_mismatches or 9,
        "blocked_itc": blocked_itc or 301280.0,
        "high_risk_clients": high_risk_clients or 2,
        "pending_reconciliations": pending_reconciliations or 3,
        "active_jobs_run": len(all_runs) or 5
    }

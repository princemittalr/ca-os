from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Pre-populated Clients portfolio with detailed CA-OS fields
MOCK_CLIENTS: list = []

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
        "total_mismatches": total_mismatches,
        "blocked_itc": blocked_itc,
        "high_risk_clients": high_risk_clients,
        "pending_reconciliations": pending_reconciliations,
        "active_jobs_run": len(all_runs)
    }

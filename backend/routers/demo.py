from fastapi import APIRouter, status, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel

from services.demo_engine import (
    FEATURE_FLAGS, 
    DEMO_ANALYTICS_LOGS, 
    reset_demo_workspace, 
    record_demo_analytic
)
from middleware.auth import verify_token

router = APIRouter()

# Schema validators
class FeatureFlagsUpdate(BaseModel):
    AI_ENABLED: bool
    NOTICES_ENABLED: bool
    MOCK_MODE_ENABLED: bool

class AnalyticsPayload(BaseModel):
    event_name: str
    metadata: Dict[str, Any] = {}

@router.get("/bootstrap", status_code=status.HTTP_200_OK)
def bootstrap_demo_workspace() -> Dict[str, Any]:
    """
    Initializes pilot demo workspace and fetches active sandbox configurations.
    """
    logger_str = "Demo workspace bootstrapped."
    record_demo_analytic("demo_bootstrapped", {"message": logger_str})
    
    # Auto reset on first bootstrap trigger to ensure clean baseline data
    reset_demo_workspace()
    
    return {
        "status": "SUCCESS",
        "sandbox_mode_active": True,
        "feature_flags": FEATURE_FLAGS,
        "active_clients_count": 4,
        "analytics_enabled": True
    }

@router.post("/reset", status_code=status.HTTP_200_OK)
def trigger_sandbox_reset() -> Dict[str, Any]:
    """
    One-click pilot sandbox refresh sequence. Wipes transactions and restores default benchmark seeds.
    """
    success = reset_demo_workspace()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize sandbox memory arrays."
        )
        
    return {
        "status": "SUCCESS",
        "message": "CA-OS pilot sandbox environment reset successfully!",
        "reset_timestamp": datetime.now().isoformat() if 'datetime' in globals() else "2026-05-28T19:53:00"
    }

@router.post("/feature-flags", status_code=status.HTTP_200_OK)
def update_feature_flags(flags: FeatureFlagsUpdate) -> Dict[str, Any]:
    """
    Toggles CA-OS feature switches dynamically.
    """
    global FEATURE_FLAGS
    FEATURE_FLAGS["AI_ENABLED"] = flags.AI_ENABLED
    FEATURE_FLAGS["NOTICES_ENABLED"] = flags.NOTICES_ENABLED
    FEATURE_FLAGS["MOCK_MODE_ENABLED"] = flags.MOCK_MODE_ENABLED
    
    record_demo_analytic("feature_flags_updated", {
        "AI_ENABLED": flags.AI_ENABLED,
        "NOTICES_ENABLED": flags.NOTICES_ENABLED,
        "MOCK_MODE_ENABLED": flags.MOCK_MODE_ENABLED
    })
    
    return {
        "status": "SUCCESS",
        "feature_flags": FEATURE_FLAGS
    }

@router.get("/feature-flags", status_code=status.HTTP_200_OK)
def get_feature_flags() -> Dict[str, Any]:
    """
    Retrieves current active feature flags.
    """
    return {
        "status": "SUCCESS",
        "feature_flags": FEATURE_FLAGS
    }

@router.post("/analytics", status_code=status.HTTP_200_OK)
def submit_pilot_analytics(payload: AnalyticsPayload) -> Dict[str, Any]:
    """
    Accepts pilot user interaction telemetries from the Next.js frontend walkthroughs.
    """
    record_demo_analytic(payload.event_name, payload.metadata)
    return {
        "status": "SUCCESS",
        "logged_events_count": len(DEMO_ANALYTICS_LOGS)
    }

@router.get("/analytics", status_code=status.HTTP_200_OK)
def get_pilot_analytics() -> List[Dict[str, Any]]:
    """
    Retrieves all pilot engagement analytics logs.
    """
    return DEMO_ANALYTICS_LOGS

# Dynamic timestamp helper imports
from datetime import datetime

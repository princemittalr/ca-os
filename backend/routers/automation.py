import json
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_validator
from typing import List, cast, Dict, Any, Optional
from supabase import Client
from datetime import datetime, timezone

from middleware.auth import verify_token, RequireRoles
from config.supabase import get_supabase_client, is_supabase_active

router = APIRouter()

# ---------------------------------------------------------------------------
# AGENT CONFIG SCHEMA — Pydantic validation + size guard
# ---------------------------------------------------------------------------
class AgentConfigPayload(BaseModel):
    """Validated agent configuration. All fields optional — partial updates allowed."""
    reminder_days_before: Optional[int] = Field(None, ge=1, le=90)
    escalation_threshold_days: Optional[int] = Field(None, ge=1, le=180)
    notify_email: Optional[bool] = None
    notify_whatsapp: Optional[bool] = None
    custom_message: Optional[str] = Field(None, max_length=500)
    extra: Optional[Dict[str, Any]] = Field(None)

    @field_validator("extra", mode="before")
    @classmethod
    def limit_extra_size(cls, v: Any) -> Any:
        if v is not None:
            serialized = json.dumps(v)
            if len(serialized) > 65_536:  # 64 KB
                raise ValueError("Config payload exceeds 64KB limit.")
        return v


# ---------------------------------------------------------------------------
# AGENT KEY WHITELIST — only these keys are valid
# ---------------------------------------------------------------------------
VALID_AGENT_KEYS = {
    "compliance_reminder",
    "overdue_escalation",
    "vendor_communication",
    "reconciliation_sync",
}

# Default seed configuration for a new firm's first access
DEFAULT_AGENTS = [
    {
        "agent_key": "compliance_reminder",
        "name": "Compliance Reminder Agent",
        "agent_type": "compliance",
        "is_active": True,
        "config": {},
    },
    {
        "agent_key": "overdue_escalation",
        "name": "Overdue Escalation Agent",
        "agent_type": "compliance",
        "is_active": False,
        "config": {},
    },
    {
        "agent_key": "vendor_communication",
        "name": "Vendor Communication Agent",
        "agent_type": "communication",
        "is_active": True,
        "config": {},
    },
    {
        "agent_key": "reconciliation_sync",
        "name": "Reconciliation Sync Agent",
        "agent_type": "reconciliation",
        "is_active": False,
        "config": {},
    },
]


class ToggleRequest(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# HELPER: assert Supabase is live
# ---------------------------------------------------------------------------
def _require_supabase():
    if not is_supabase_active():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable.",
        )


# ---------------------------------------------------------------------------
# GET AGENTS — any authenticated user, firm-scoped
# Seeds default rows on first access so every firm starts with all 4 agents.
# ---------------------------------------------------------------------------
@router.get("/agents")
async def get_agents(current_user: dict = Depends(verify_token)):
    """
    Return all automation agents for the authenticated firm.
    If no rows exist yet, seeds default agent configuration and returns it.
    """
    _require_supabase()
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="firm_id missing from user context.",
        )

    res = (
        get_supabase_client().table("automation_agents")
        .select("*")
        .eq("firm_id", firm_id)
        .order("created_at")
        .execute()
    )

    if res.data:
        return res.data

    # ---- Seed defaults on first access ----
    seeds = [
        {**agent, "firm_id": firm_id}
        for agent in DEFAULT_AGENTS
    ]
    insert_res = (
        get_supabase_client().table("automation_agents")
        .insert(seeds)
        .execute()
    )
    if not insert_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed default automation agents.",
        )
    return insert_res.data


# ---------------------------------------------------------------------------
# TOGGLE AGENT — RequireRoles guard: PARTNER or MANAGER
# ---------------------------------------------------------------------------
@router.post("/{agent_key}/toggle")
async def toggle_agent(
    agent_key: str,
    payload: ToggleRequest,
    current_user: dict = Depends(RequireRoles(["PARTNER", "MANAGER"])),
):
    """
    Enable/disable an automation agent. Firm-scoped.
    """
    _require_supabase()

    # Validate agent_key against whitelist
    if agent_key not in VALID_AGENT_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid agent key '{agent_key}'. "
                f"Allowed keys: {sorted(VALID_AGENT_KEYS)}."
            ),
        )

    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="firm_id missing from user context.",
        )

    # Verify the agent belongs to this firm before mutating
    existing = (
        get_supabase_client().table("automation_agents")
        .select("id")
        .eq("firm_id", firm_id)
        .eq("agent_key", agent_key)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_key}' not found for this firm.",
        )

    data_list = cast(List[Dict[str, Any]], existing.data)
    agent_id = data_list[0]["id"]

    update_res = (
        get_supabase_client().table("automation_agents")
        .update({"is_active": payload.is_active})
        .eq("id", agent_id)
        .eq("firm_id", firm_id)
        .execute()
    )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update agent state.",
        )

    return {
        "status": "SUCCESS",
        "agent_key": agent_key,
        "is_active": payload.is_active,
        "firm_id": firm_id,
    }


# ---------------------------------------------------------------------------
# UPDATE AGENT CONFIG — Persist configuration JSON to Supabase
# ---------------------------------------------------------------------------
@router.put("/agents/{agent_key}/config")
async def update_agent_config(
    agent_key: str,
    payload: AgentConfigPayload,
    current_user: dict = Depends(RequireRoles(["PARTNER", "MANAGER"])),
):
    """
    Persist validated agent config to Supabase automation_agents table.
    Requires PARTNER or MANAGER role.
    """
    _require_supabase()

    if agent_key not in VALID_AGENT_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid agent key '{agent_key}'."
        )

    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=400, detail="firm_id missing from user context.")

    # Exclude unset fields — partial update
    config_data = payload.model_dump(exclude_none=True)

    try:
        res = (
            get_supabase_client().table("automation_agents")
            .update({
                "config": config_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("agent_key", agent_key)
            .eq("firm_id", firm_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent '{agent_key}' not found for this firm."
            )

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save agent config."
        )

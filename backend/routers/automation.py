from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, cast
from supabase import Client

from middleware.auth import verify_token, RequireRoles
from config.supabase import supabase_client as _raw_supabase, is_supabase_active

_db: Client = cast(Client, _raw_supabase)

router = APIRouter()

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
    if not is_supabase_active() or _db is None:
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
        _db.table("automation_agents")
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
        _db.table("automation_agents")
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
# TOGGLE AGENT — PARTNER / SUPER_ADMIN only
# Upserts the is_active flag for a given agent_key, firm-scoped.
# ---------------------------------------------------------------------------
@router.put("/agents/{agent_key}/toggle")
async def toggle_agent(
    agent_key: str,
    payload: ToggleRequest,
    current_user: dict = Depends(RequireRoles(["SUPER_ADMIN", "PARTNER"])),
):
    """
    Toggle the active state of an automation agent.
    Requires PARTNER or SUPER_ADMIN role.
    Agent key must belong to the canonical whitelist.
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
        _db.table("automation_agents")
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

    agent_id = existing.data[0]["id"]

    update_res = (
        _db.table("automation_agents")
        .update({"is_active": payload.is_active})
        .eq("id", agent_id)
        .eq("firm_id", firm_id)          # double-check firm isolation on UPDATE
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

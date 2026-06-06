from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

# In-memory storage for agent active states matching frontend defaults
AGENTS_DB = {
    "a-1": {"is_active": True},
    "a-2": {"is_active": False},
    "a-3": {"is_active": True},
    "a-4": {"is_active": False}
}

class ToggleRequest(BaseModel):
    is_active: bool

@router.get("/agents")
async def get_agents():
    return AGENTS_DB

@router.put("/agents/{agent_id}/toggle")
async def toggle_agent(agent_id: str, payload: ToggleRequest):
    if agent_id not in AGENTS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID '{agent_id}' not found."
        )
    AGENTS_DB[agent_id]["is_active"] = payload.is_active
    return {"status": "SUCCESS", "agent_id": agent_id, "is_active": payload.is_active}

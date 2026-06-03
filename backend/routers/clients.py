from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from models import schemas
from services import client_workspace
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Retrieve cumulative portfolio KPIs across all clients."""
    return client_workspace.get_dashboard_aggregations()

@router.get("", response_model=List[schemas.ClientResponse])
@router.get("/", response_model=List[schemas.ClientResponse])
async def list_clients():
    """List all CA clients."""
    return client_workspace.get_clients()

@router.post("/", response_model=schemas.ClientResponse)
async def create_client(client: schemas.ClientCreate, current_user: dict = Depends(RequireRoles(["SUPER_ADMIN", "PARTNER", "MANAGER"]))):
    """Create a new client workspace."""
    client_dict = client.model_dump()
    return client_workspace.create_client(client_dict)

@router.get("/{client_id}", response_model=schemas.ClientResponse)
async def get_client(client_id: str):
    """Get single client workspace details."""
    c = client_workspace.get_client_by_id(client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c

@router.get("/{client_id}/reconciliations")
async def get_client_reconciliations(client_id: str):
    """Retrieve historical reconciliation runs scoped to a specific client."""
    c = client_workspace.get_client_by_id(client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return client_workspace.get_reconciliations_for_client(client_id)


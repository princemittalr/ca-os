from fastapi import APIRouter, Depends, HTTPException, status
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
    """Create a new client workspace scoped to the authenticated user's firm."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    client_dict = client.model_dump()
    return client_workspace.create_client(client_dict, firm_id=firm_id)

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

@router.put("/{client_id}", response_model=schemas.ClientResponse)
@router.patch("/{client_id}", response_model=schemas.ClientResponse)
async def update_client(client_id: str, client: schemas.ClientUpdate):
    """Update client workspace details."""
    c = client_workspace.get_client_by_id(client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = {k: v for k, v in client.model_dump().items() if v is not None}
    updated = client_workspace.update_client(client_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update client")
    return updated


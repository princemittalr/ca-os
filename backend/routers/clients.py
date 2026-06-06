from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from models import schemas
from services import client_workspace
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

# ---------------------------------------------------------------------------
# DASHBOARD — authenticated, firm-scoped
# ---------------------------------------------------------------------------
@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: dict = Depends(verify_token),
):
    """Retrieve cumulative portfolio KPIs across the authenticated firm's clients."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    return client_workspace.get_dashboard_aggregations(firm_id=firm_id)


# ---------------------------------------------------------------------------
# LIST CLIENTS — any authenticated user within their firm
# ---------------------------------------------------------------------------
@router.get("", response_model=List[schemas.ClientResponse])
@router.get("/", response_model=List[schemas.ClientResponse])
async def list_clients(current_user: dict = Depends(verify_token)):
    """List all CA clients belonging to the authenticated user's firm."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    return client_workspace.get_clients(firm_id=firm_id)


# ---------------------------------------------------------------------------
# CREATE CLIENT — PARTNER / MANAGER / SUPER_ADMIN only
# ---------------------------------------------------------------------------
@router.post("/", response_model=schemas.ClientResponse)
async def create_client(
    client: schemas.ClientCreate,
    current_user: dict = Depends(RequireRoles(["SUPER_ADMIN", "PARTNER", "MANAGER"])),
):
    """Create a new client workspace scoped to the authenticated user's firm."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    client_dict = client.model_dump()
    return client_workspace.create_client(client_dict, firm_id=firm_id)


# ---------------------------------------------------------------------------
# GET SINGLE CLIENT — any authenticated user (firm-scoped)
# ---------------------------------------------------------------------------
@router.get("/{client_id}", response_model=schemas.ClientResponse)
async def get_client(
    client_id: str,
    current_user: dict = Depends(verify_token),
):
    """Get single client workspace details, scoped to the authenticated firm."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    c = client_workspace.get_client_by_id(client_id, firm_id=firm_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


# ---------------------------------------------------------------------------
# GET CLIENT RECONCILIATIONS — any authenticated user (firm-scoped)
# ---------------------------------------------------------------------------
@router.get("/{client_id}/reconciliations")
async def get_client_reconciliations(
    client_id: str,
    current_user: dict = Depends(verify_token),
):
    """Retrieve historical reconciliation runs scoped to a specific client."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    c = client_workspace.get_client_by_id(client_id, firm_id=firm_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return client_workspace.get_reconciliations_for_client(client_id)


# ---------------------------------------------------------------------------
# UPDATE CLIENT — PARTNER / MANAGER / SUPER_ADMIN only
# ---------------------------------------------------------------------------
@router.put("/{client_id}", response_model=schemas.ClientResponse)
@router.patch("/{client_id}", response_model=schemas.ClientResponse)
async def update_client(
    client_id: str,
    client: schemas.ClientUpdate,
    current_user: dict = Depends(RequireRoles(["SUPER_ADMIN", "PARTNER", "MANAGER"])),
):
    """Update client workspace details. Requires PARTNER or above."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    c = client_workspace.get_client_by_id(client_id, firm_id=firm_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = {k: v for k, v in client.model_dump().items() if v is not None}
    updated = client_workspace.update_client(client_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update client")
    return updated


# ---------------------------------------------------------------------------
# SOFT-DELETE CLIENT — PARTNER / SUPER_ADMIN only
# ---------------------------------------------------------------------------
@router.delete("/{client_id}", status_code=status.HTTP_200_OK)
async def delete_client(
    client_id: str,
    current_user: dict = Depends(RequireRoles(["SUPER_ADMIN", "PARTNER"])),
):
    """Soft-delete a client workspace (sets is_deleted = True). Requires PARTNER or above."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firm_id missing from user context.")
    c = client_workspace.get_client_by_id(client_id, firm_id=firm_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    success = client_workspace.soft_delete_client(client_id, firm_id=firm_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete client")
    return {"detail": "Client archived successfully.", "client_id": client_id}

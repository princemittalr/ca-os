from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
import uuid
import asyncio
from io import BytesIO
import logging

# Fix local relative imports
from services import matching_engine
from services.parser import parse_file_to_dataframe, normalize_columns, detect_gst_fields
from services.reconciliation import reconcile_dataframes
from services.exporter import generate_excel_report, generate_pdf_summary
from services import client_workspace
from services.db import manager as db_manager
from middleware.auth import verify_token, RequireRoles
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Max file size limit from settings
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# -------------------------------------------------------------------------
# HELPER: Validate that client_id belongs to the authenticated user's firm
# -------------------------------------------------------------------------
def _assert_client_ownership(client_id: str, firm_id: str) -> None:
    """
    Fetches the client record and confirms it belongs to the caller's firm.
    Raises HTTP 404 if the client is not found or belongs to another firm.
    """
    client = db_manager.get_client_by_id(client_id, firm_id=firm_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found."
        )


def _run_reconciliation_pipeline_sync(
    file_pr_bytes: bytes,
    file_pr_name: str,
    file_2b_bytes: bytes,
    file_2b_name: str,
    client_id: str,
    period: str,
    firm_id: str,
    sync_to_workspace: bool = True
) -> Dict[str, Any]:
    """
    Shared reconciliation pipeline: parse → normalize → match → persist.
    Raises ValueError on bad input, RuntimeError on DB failure.
    """
    for content, name in [(file_pr_bytes, file_pr_name), (file_2b_bytes, file_2b_name)]:
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File '{name}' exceeds size limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")
        
        filename = name or ""
        fn_lower = filename.lower()
        if not fn_lower.endswith(('.xlsx', '.xls', '.csv')):
            raise ValueError(f"Unsupported file format for '{filename}'. Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.")

    # 1. Parse and Normalize
    df_pr = parse_file_to_dataframe(file_pr_bytes, file_pr_name)
    df_2b = parse_file_to_dataframe(file_2b_bytes, file_2b_name)

    df_pr = normalize_columns(df_pr)
    df_2b = normalize_columns(df_2b)

    # 2. Field Detection and Mapping
    mapping_pr = detect_gst_fields(list(df_pr.columns))
    mapping_2b = detect_gst_fields(list(df_2b.columns))

    mapping_pr_clean: Dict[str, str] = {k: v or "" for k, v in mapping_pr.items()}
    mapping_2b_clean: Dict[str, str] = {k: v or "" for k, v in mapping_2b.items()}

    # 3. Reconcile
    results = reconcile_dataframes(
        df_pr=df_pr,
        df_2b=df_2b,
        mapping_pr=mapping_pr_clean,
        mapping_2b=mapping_2b_clean,
        tolerance=1.0
    )

    # 4. Persistence
    reconciliation_id = str(uuid.uuid4())
    db_manager.save_recon_rows(reconciliation_id, results)

    # 5. Optional Workspace Sync (metadata history)
    if sync_to_workspace:
        try:
            summary_stats = results.get("summary", {})
            total_invoices = sum(summary_stats.values())
            matched_count = summary_stats.get("matched", 0)
            mismatch_count = total_invoices - matched_count

            mismatch_list = results.get("mismatches", [])
            itc_at_risk = sum(
                float(m.get("taxable_value", 0))
                for m in mismatch_list
                if m.get("issue") in ["MISSING_IN_2B", "VALUE_MISMATCH"]
            ) * 0.18
            itc_protected = sum(
                float(m.get("taxable_value", 0)) for m in results.get("matches", [])
            ) * 0.18

            client_workspace.add_reconciliation_run(
                client_id=client_id,
                run_data={
                    "filing_period": period,
                    "total_invoices": total_invoices,
                    "matched_count": matched_count,
                    "mismatch_count": mismatch_count,
                    "missing_in_2b_count": summary_stats.get("missing_in_2b", 0),
                    "missing_in_books_count": summary_stats.get("missing_in_books", 0),
                    "itc_at_risk": itc_at_risk,
                    "itc_protected": itc_protected
                }
            )
        except Exception as err:
            logger.warning(f"Failed to record reconciliation metadata in client workspace (non-fatal): {err}")

    return {**results, "reconciliation_id": reconciliation_id}


# -------------------------------------------------------------------------
# POST /gstr2b — Primary reconciliation endpoint
# -------------------------------------------------------------------------
@router.post("/gstr2b")
async def reconcile_gstr2b(
    file_pr: UploadFile = File(...),
    file_2b: UploadFile = File(...),
    client_id: str = Form(...),
    period: str = Form(...),
    current_user: dict = Depends(verify_token)
):
    """
    Accepts two uploaded files (Purchase Register and GSTR-2B).
    Parses them entirely in-memory, normalizes whitespace in column headers,
    runs intelligent column mapping, and performs multi-variable automated reconciliation.
    Results are persisted to Supabase recon_rows for durable export access.
    Scopes the run history to the client workspace.
    """
    firm_id: str = current_user["firm_id"]

    # Ownership check — client must belong to caller's firm
    _assert_client_ownership(client_id, firm_id)

    try:
        contents_pr = await file_pr.read()
        contents_2b = await file_2b.read()

        return await asyncio.to_thread(
            _run_reconciliation_pipeline_sync,
            contents_pr, file_pr.filename or "",
            contents_2b, file_2b.filename or "",
            client_id, period, firm_id,
            sync_to_workspace=True
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"An error occurred while reconciling the files: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An error occurred while reconciling the files. Please try again."
        )


# -------------------------------------------------------------------------
# POST /upload — Alternative upload-and-reconcile route
# -------------------------------------------------------------------------
@router.post("/upload")
async def upload_and_reconcile(
    client_id: str = Form(...),
    period: str = Form(...),
    file_2b: UploadFile = File(...),
    file_pr: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """
    Alternative upload and reconcile route.
    Results are persisted to Supabase recon_rows for durable export access.
    """
    firm_id: str = current_user["firm_id"]

    # Ownership check — client must belong to caller's firm
    _assert_client_ownership(client_id, firm_id)

    try:
        content_2b = await file_2b.read()
        content_pr = await file_pr.read()

        return await asyncio.to_thread(
            _run_reconciliation_pipeline_sync,
            content_pr, file_pr.filename or "",
            content_2b, file_2b.filename or "",
            client_id, period, firm_id,
            sync_to_workspace=True
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Upload and reconcile failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upload and reconcile failed. Please try again.")


# -------------------------------------------------------------------------
# GET /export/reconciliation/excel — Fetch from DB by reconciliation_id
# -------------------------------------------------------------------------
@router.get("/export/reconciliation/excel")
async def export_reconciliation_excel(
    reconciliation_id: str = Query(..., description="UUID returned by the reconciliation endpoint"),
    current_user: dict = Depends(verify_token)
):
    """
    Generates and streams back an Excel reconciliation report.
    Fetches rows from Supabase recon_rows by reconciliation_id — works across server restarts.
    """
    try:
        results = db_manager.get_recon_rows_structured(reconciliation_id)
    except ValueError as ve:
        logger.warning(f"Excel export failed: {str(ve)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation data not found.")

    summary = results.get("summary", {})
    matches = results.get("matches", [])
    mismatches = results.get("mismatches", [])

    excel_content = generate_excel_report(summary, matches, mismatches)

    return StreamingResponse(
        BytesIO(excel_content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=GST_Reconciliation_Working_Papers.xlsx",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


# -------------------------------------------------------------------------
# GET /export/reconciliation/pdf — Fetch from DB by reconciliation_id
# -------------------------------------------------------------------------
@router.get("/export/reconciliation/pdf")
async def export_reconciliation_pdf(
    reconciliation_id: str = Query(..., description="UUID returned by the reconciliation endpoint"),
    current_user: dict = Depends(verify_token)
):
    """
    Generates and streams back a PDF reconciliation summary report.
    Fetches rows from Supabase recon_rows by reconciliation_id — works across server restarts.
    """
    try:
        results = db_manager.get_recon_rows_structured(reconciliation_id)
    except ValueError as ve:
        logger.warning(f"PDF export failed: {str(ve)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation data not found.")

    summary = results.get("summary", {})
    matches = results.get("matches", [])
    mismatches = results.get("mismatches", [])

    pdf_content = generate_pdf_summary(summary, matches, mismatches)

    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=GST_Reconciliation_Executive_Summary.pdf",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


# -------------------------------------------------------------------------
# GET /{reconciliation_id} — Metadata stub
# -------------------------------------------------------------------------
@router.get("/{reconciliation_id}")
async def get_reconciliation(
    reconciliation_id: str,
    current_user: dict = Depends(verify_token)
):
    return {"id": reconciliation_id, "message": "Metadata fetched successfully."}


# -------------------------------------------------------------------------
# GET /{reconciliation_id}/export — Convenience alias for Excel export
# -------------------------------------------------------------------------
@router.get("/{reconciliation_id}/export")
async def export_excel_by_id(
    reconciliation_id: str,
    current_user: dict = Depends(verify_token)
):
    return await export_reconciliation_excel(
        reconciliation_id=reconciliation_id,
        current_user=current_user
    )


# -------------------------------------------------------------------------
# GET /export/{reconciliation_id} — Alternative export layout path
# -------------------------------------------------------------------------
@router.get("/export/{reconciliation_id}")
async def export_convenience_route(
    reconciliation_id: str,
    current_user: dict = Depends(verify_token)
):
    return await export_reconciliation_excel(
        reconciliation_id=reconciliation_id,
        current_user=current_user
    )


# -------------------------------------------------------------------------
# POST /import-boe — BOE customs reconciliation
# -------------------------------------------------------------------------
@router.post("/import-boe")
async def reconcile_import_boe(
    file_boe: UploadFile = File(...),
    file_2b: UploadFile = File(...),
    client_id: str = Form(...),
    period: str = Form(...),
    current_user: dict = Depends(verify_token)
):
    """Reconcile BOE customs data against GSTR-2B for import transactions."""
    firm_id: str = current_user["firm_id"]

    # Ownership check
    _assert_client_ownership(client_id, firm_id)

    try:
        boe_content = await file_boe.read()
        b2b_content = await file_2b.read()

        return await asyncio.to_thread(
            _run_reconciliation_pipeline_sync,
            boe_content, file_boe.filename or "",
            b2b_content, file_2b.filename or "",
            client_id, period, firm_id,
            sync_to_workspace=False
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Import BOE customs reconciliation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Import BOE customs reconciliation failed. Please try again.")

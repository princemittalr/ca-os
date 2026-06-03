from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
import pandas as pd
import json
from io import BytesIO

# Fix local relative imports
from models import schemas
from services import matching_engine, ai_service
from services.parser import parse_file_to_dataframe, normalize_columns, detect_gst_fields
from services.reconciliation import reconcile_dataframes
from services.exporter import generate_excel_report, generate_pdf_summary
from services import client_workspace
from middleware.auth import verify_token, RequireRoles

router = APIRouter()

# Max file size limit of 20MB
MAX_FILE_SIZE = 20 * 1024 * 1024

# Global in-memory cache for latest reconciliation results
latest_reconciliation_results = None

def get_active_results():
    """Retrieve active cached in-memory results, or raise HTTP 404."""
    global latest_reconciliation_results
    if latest_reconciliation_results is not None:
        summary = latest_reconciliation_results.get("summary", {})
        matches = latest_reconciliation_results.get("matches", [])
        mismatches = latest_reconciliation_results.get("mismatches", [])
        return summary, matches, mismatches
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No reconciliation has been run yet. Please upload files and run reconciliation first."
    )

@router.post("/gstr2b")
async def reconcile_gstr2b(
    file_pr: UploadFile = File(...),
    file_2b: UploadFile = File(...),
    client_id: str = "client-1",
    period: str = "2024-03"
):
    """
    Accepts two uploaded files (Purchase Register and GSTR-2B).
    Parses them entirely in-memory, normalizes whitespace in column headers,
    runs intelligent column mapping, and performs multi-variable automated reconciliation.
    Stores the results temporarily in-memory for download.
    Scopes the run history to the client workspace.
    """
    if not file_pr or not file_2b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Purchase Register (Books) and GSTR-2B files are required for reconciliation."
        )
        
    for file in [file_pr, file_2b]:
        fn_lower = file.filename.lower()
        if not fn_lower.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format for '{file.filename}'. Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file."
            )
            
    try:
        contents_pr = await file_pr.read()
        contents_2b = await file_2b.read()
        
        if len(contents_pr) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Purchase Register file exceeds size limit of 20MB."
            )
        if len(contents_2b) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GSTR-2B file exceeds size limit of 20MB."
            )
            
        df_pr = parse_file_to_dataframe(contents_pr, file_pr.filename)
        df_2b = parse_file_to_dataframe(contents_2b, file_2b.filename)
        
        df_pr = normalize_columns(df_pr)
        df_2b = normalize_columns(df_2b)
        
        mapping_pr = detect_gst_fields(list(df_pr.columns))
        mapping_2b = detect_gst_fields(list(df_2b.columns))
        
        results = reconcile_dataframes(
            df_pr=df_pr,
            df_2b=df_2b,
            mapping_pr=mapping_pr,
            mapping_2b=mapping_2b,
            tolerance=1.0
        )
        
        # Save results temporarily in-memory
        global latest_reconciliation_results
        latest_reconciliation_results = results
        
        # Scope run to client workspace and record metadata in history
        try:
            summary_stats = results.get("summary", {})
            total_invoices = sum(summary_stats.values())
            matched_count = summary_stats.get("matched", 0)
            mismatch_count = total_invoices - matched_count
            
            mismatch_list = results.get("mismatches", [])
            itc_at_risk = sum(float(m.get("taxable_value", 0)) for m in mismatch_list if m.get("issue") in ["MISSING_IN_2B", "VALUE_MISMATCH"]) * 0.18
            itc_protected = sum(float(m.get("taxable_value", 0)) for m in results.get("matches", [])) * 0.18
            
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
            print(f"Failed to record reconciliation metadata in client workspace: {err}")
        
        return results
        
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An error occurred while reconciling the files: {str(e)}"
        )

@router.post("/upload")
async def upload_and_reconcile(
    client_id: str,
    period: str,
    file_2b: UploadFile = File(...),
    file_pr: UploadFile = File(...)
):
    """
    Alternative upload and reconcile route. Also caches results in-memory.
    """
    try:
        content_2b = await file_2b.read()
        content_pr = await file_pr.read()
        
        # Standardize uploads
        df_pr = parse_file_to_dataframe(content_pr, file_pr.filename)
        df_2b = parse_file_to_dataframe(content_2b, file_2b.filename)
        
        df_pr = normalize_columns(df_pr)
        df_2b = normalize_columns(df_2b)
        
        mapping_pr = detect_gst_fields(list(df_pr.columns))
        mapping_2b = detect_gst_fields(list(df_2b.columns))
        
        results = reconcile_dataframes(
            df_pr=df_pr,
            df_2b=df_2b,
            mapping_pr=mapping_pr,
            mapping_2b=mapping_2b,
            tolerance=1.0
        )
        
        global latest_reconciliation_results
        latest_reconciliation_results = results
        
        # Register in workspace
        try:
            summary_stats = results.get("summary", {})
            total_invoices = sum(summary_stats.values())
            matched_count = summary_stats.get("matched", 0)
            mismatch_count = total_invoices - matched_count
            
            mismatch_list = results.get("mismatches", [])
            itc_at_risk = sum(float(m.get("taxable_value", 0)) for m in mismatch_list if m.get("issue") in ["MISSING_IN_2B", "VALUE_MISMATCH"]) * 0.18
            itc_protected = sum(float(m.get("taxable_value", 0)) for m in results.get("matches", [])) * 0.18
            
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
            print(f"Failed to record reconciliation metadata in client workspace: {err}")
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/reconciliation/excel")
async def export_reconciliation_excel():
    """Generates and streams back an Excel reconciliation report."""
    summary, matches, mismatches = get_active_results()
    excel_content = generate_excel_report(summary, matches, mismatches)
    
    return StreamingResponse(
        BytesIO(excel_content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=GST_Reconciliation_Working_Papers.xlsx",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/export/reconciliation/pdf")
async def export_reconciliation_pdf():
    """Generates and streams back a PDF reconciliation summary report."""
    summary, matches, mismatches = get_active_results()
    pdf_content = generate_pdf_summary(summary, matches, mismatches)
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=GST_Reconciliation_Executive_Summary.pdf",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/{reconciliation_id}")
async def get_reconciliation(reconciliation_id: str):
    return {"id": reconciliation_id, "message": "Metadata fetched successfully."}

@router.get("/{reconciliation_id}/export")
async def export_excel(reconciliation_id: str):
    return await export_reconciliation_excel()
@router.post("/import-boe")
async def reconcile_import_boe(
    file_boe: UploadFile = File(...),
    file_2b: UploadFile = File(...)
):
    """Reconcile BOE customs data against GSTR-2B for import transactions."""
    try:
        from services.parser import parse_file_to_dataframe, normalize_columns, detect_gst_fields
        from services.reconciliation import reconcile_dataframes

        boe_content = await file_boe.read()
        b2b_content = await file_2b.read()

        df_boe = parse_file_to_dataframe(boe_content, file_boe.filename)
        df_2b = parse_file_to_dataframe(b2b_content, file_2b.filename)

        df_boe = normalize_columns(df_boe)
        df_2b = normalize_columns(df_2b)

        mapping_boe = detect_gst_fields(list(df_boe.columns))
        mapping_2b = detect_gst_fields(list(df_2b.columns))

        results = reconcile_dataframes(
            df_pr=df_boe,
            df_2b=df_2b,
            mapping_pr=mapping_boe,
            mapping_2b=mapping_2b,
            tolerance=1.0
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

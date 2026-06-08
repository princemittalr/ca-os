from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta, timezone
import logging
import uuid as _uuid

from middleware.auth import verify_token, RequireRoles
from middleware.rate_limit import limiter, UPLOAD_LIMIT
from services.db import manager as db_manager
from services.notice_engine import ocr, intelligence

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload")
@limiter.limit(UPLOAD_LIMIT)
async def upload_gst_notice(
    request: Request,
    client_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """
    Ingests, parses, extracts, and summarizes statutory GST notices (PDF or Image).
    Requires authentication. Validates that the target client belongs to the
    authenticated user's firm before processing.
    """
    # 1. Fetch Client Profile Context and enforce firm ownership
    client = db_manager.get_client_by_id(client_id, firm_id=current_user.get("firm_id"))
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID '{client_id}' not found."
        )

    # 2. Extract Text (PyMuPDF or Fallback Scrutiny OCR)
    contents = await file.read()
    filename = file.filename or "notice.pdf"

    raw_text = ""
    if filename.lower().endswith(".pdf"):
        try:
            raw_text = ocr.extract_text_from_pdf(contents)
        except Exception as e:
            logger.error(
                f"OCR text extraction failed for file '{filename}'. "
                f"Reason: PyMuPDF extraction failed: {str(e)}"
            )
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "success": False,
                    "error": "Unable to extract notice text from uploaded file."
                }
            )
    else:
        logger.error(
            f"OCR text extraction failed for file '{filename}'. "
            f"Reason: Unsupported file extension."
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": "Unable to extract notice text from uploaded file."
            }
        )

    if not raw_text or not raw_text.strip():
        logger.error(
            f"OCR text extraction failed for file '{filename}'. "
            f"Reason: Extracted text is empty."
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": "Unable to extract notice text from uploaded file."
            }
        )

    try:
        # 3. Deterministic regex extraction
        det = ocr.parse_deterministic_metadata(raw_text)

        # 4. Semantic LLM summarization
        client_context = {
            "trade_name": client.get("trade_name") or client.get("business_name"),
            "gstin": client.get("gstin")
        }
        ai_data = await intelligence.summarize_notice_with_ai(raw_text, client_context)
    except Exception as e:
        logger.error(f"Notice analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze notice text using AI service."
        )

    # 5. Fuses extractions and calculate deadline thresholds
    try:
        notice_type = ai_data.get("notice_type") or intelligence.classify_notice(raw_text)
        tax_amount = det.get("tax_amount") or ai_data.get("tax_amount", 0.0)

        # Standardize dates
        due_date_parsed = None
        due_str = det.get("due_date") or ai_data.get("response_deadline")
        if due_str and due_str != "N/A":
            try:
                due_date_parsed = date.fromisoformat(due_str)
            except ValueError:
                # Fallback DD-MM-YYYY parsing
                try:
                    parts = due_str.split("-")
                    if len(parts) == 3:
                        if len(parts[0]) == 4:  # YYYY-MM-DD
                            due_date_parsed = date(int(parts[0]), int(parts[1]), int(parts[2]))
                        else:  # DD-MM-YYYY
                            due_date_parsed = date(int(parts[2]), int(parts[1]), int(parts[0]))
                except Exception:
                    due_date_parsed = date.today() + timedelta(days=15)
        else:
            due_date_parsed = date.today() + timedelta(days=15)

        if not due_date_parsed:
            due_date_parsed = date.today() + timedelta(days=15)

        hearing_date_parsed = None
        hearing_str = det.get("hearing_date")
        if hearing_str:
            try:
                hearing_date_parsed = date.fromisoformat(hearing_str)
            except ValueError:
                try:
                    parts = hearing_str.split("-")
                    if len(parts) == 3:
                        if len(parts[0]) == 4:
                            hearing_date_parsed = date(int(parts[0]), int(parts[1]), int(parts[2]))
                        else:
                            hearing_date_parsed = date(int(parts[2]), int(parts[1]), int(parts[0]))
                except Exception:
                    pass

        # Risk prioritize
        days_left = (due_date_parsed - date.today()).days
        risk_score = intelligence.calculate_notice_risk_score(tax_amount, notice_type, days_left)

        risk_level = "LOW"
        if risk_score > 75.0:
            risk_level = "HIGH"
        elif risk_score > 40.0:
            risk_level = "MEDIUM"

        interest_est = tax_amount * 0.18
        penalty_est = max(10000.0, tax_amount * 0.10)
        total_est = tax_amount + interest_est + penalty_est

        # 6. Save Notice Dossier Record (firm_id injected from token — never from client)
        notice_payload = {
            "client_id": client_id,
            "firm_id": current_user["firm_id"],
            "client_name": client.get("business_name") or client.get("legal_name") or "Unknown Client",
            "notice_number": det.get("notice_number") or ai_data.get("notice_number") or f"GST/REF/{_uuid.uuid4().hex[:8].upper()}",
            "issuing_authority": det.get("issuing_authority") or "State Tax Officer, GST Department",
            "section_references": ai_data.get("sections_referenced") or det.get("section_references") or ["Section 73"],
            "notice_type": notice_type,
            "tax_amount": tax_amount,
            "due_date": due_date_parsed,
            "hearing_date": hearing_date_parsed,
            "summary": ai_data.get("summary") or "Scrutiny notice under assess.",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "complexity_score": ai_data.get("complexity_score") or intelligence.classify_complexity(tax_amount, notice_type),
            "recommended_next_action": ai_data.get("recommended_next_action") or "Prepare Reply",
            "interest_exposure_est": interest_est,
            "penalty_exposure_est": penalty_est,
            "total_exposure_est": total_est,
            "required_action": ai_data.get("required_action") or "Submit response documents.",
            "status": "PENDING",
            "file_path": f"/uploads/notices/{filename}",
            "raw_ocr_text": raw_text,
            "gstin": det.get("gstin") or client.get("gstin") or "27AAACT1234A1Z5",
            "supporting_evidence": ai_data.get("supporting_evidence") or [
                "Purchase Register Matching GSTR-2B",
                "Original Purchase Tax Invoices",
                "Vendor Payment Proofs (Bank Statement)"
            ],
            "missing_documents": ai_data.get("missing_documents") or [
                "Supplier GSTR-1 Filing Confirmation",
                "E-way bill copies for transport verification"
            ],
            "questions_for_client": ai_data.get("questions_for_client") or [
                "Have payments to the vendor been made within 180 days of the invoice date?",
                "Can you confirm physical receipt of goods for the disputed invoices?"
            ]
        }
    except Exception as e:
        logger.error(f"Notice payload standardization failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provided notice parameters or data could not be parsed."
        )

    try:
        new_notice = db_manager.create_notice(notice_payload)
        return new_notice
    except Exception as err:
        logger.error(f"Failed to save notice dossier: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save notice dossier to database."
        )


@router.get("")
async def list_gst_notices(
    client_id: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """
    Returns notice dossiers scoped to the authenticated user's firm,
    optionally filtered by client_id.
    """
    firm_id: str = current_user["firm_id"]
    try:
        return db_manager.get_notices(client_id=client_id, firm_id=firm_id)
    except Exception as err:
        logger.error(f"Failed to list notices: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notices list."
        )


@router.get("/{id}")
async def get_gst_notice_details(
    id: str,
    current_user: dict = Depends(verify_token)
):
    """
    Query full metadata and timeline records for a notice dossier.
    Validates firm ownership before returning.
    """
    try:
        notice = db_manager.get_notice_by_id(id, firm_id=current_user.get("firm_id"))
    except Exception as err:
        logger.error(f"Failed to fetch notice details: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notice details."
        )
    if not notice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice Dossier with ID '{id}' not found."
        )

    return notice


@router.post("/{id}/draft-response")
async def compile_statutory_outreach_reply(
    id: str,
    current_user: dict = Depends(verify_token)
):
    """
    Uses active LLM to generate statutory outreach reply responses to the notice.
    Validates firm ownership before generating draft.
    """
    try:
        notice = db_manager.get_notice_by_id(id, firm_id=current_user.get("firm_id"))
    except Exception as err:
        logger.error(f"Failed to fetch notice details for draft: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notice details."
        )
    if not notice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice Dossier with ID '{id}' not found."
        )

    try:
        reply_text = await intelligence.generate_statutory_reply_draft(notice)
        # Update status to DRAFTED
        db_manager.update_notice_status(id, "DRAFTED")
        return {"reply": reply_text}
    except Exception as err:
        logger.error(f"Failed to generate statutory reply draft: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate statutory reply draft."
        )

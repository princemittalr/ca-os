from fastapi import APIRouter, HTTPException, status, Request
from typing import List, Dict, Any
from services.ai import copilot
from services.ai import provider
from middleware.rate_limit import limiter, AI_LIMIT
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/explain-mismatch")
@limiter.limit(AI_LIMIT)
async def explain_mismatch_root_cause(request: Request, payload: Dict[str, Any]):
    try:
        mismatch = payload.get("mismatch") or payload
        client_context = payload.get("client_context")
        return await copilot.generate_reconciliation_explanation(mismatch, client_context)
    except Exception as e:
        logger.error(f"AI explanation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI explanation failed. Please try again.")

@router.post("/daily-briefing")
@limiter.limit(AI_LIMIT)
async def get_daily_copilot_briefing(request: Request, payload: List[Dict[str, Any]]):
    try:
        briefing = await copilot.generate_daily_briefing(payload)
        return {"briefing": briefing}
    except Exception as e:
        logger.error(f"Briefing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Copilot daily briefing generation failed. Please try again.")

@router.post("/draft-outreach")
@limiter.limit(AI_LIMIT)
async def draft_vendor_notice(request: Request, payload: Dict[str, Any]):
    try:
        return await copilot.generate_vendor_notice_draft(payload)
    except Exception as e:
        logger.error(f"Draft failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor outreach notice drafting failed. Please try again.")

@router.get("/usage")
async def get_usage_metrics():
    return provider.get_token_usage()
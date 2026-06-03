import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Dict, Any

# Configure standard logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("observability")

# Cumulative telemetry registry
METRICS_REGISTRY = {
    "total_requests": 0,
    "failed_requests": 0,
    "cumulative_latency": 0.0,
    
    # Process-specific metrics
    "ocr_notices_total": 0,
    "ocr_notices_failures": 0,
    "recon_total": 0,
    "recon_failures": 0,
    
    # AI token statistics pools
    "ai_calls_total": 0,
    "ai_prompt_tokens": 0,
    "ai_completion_tokens": 0
}

class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Observability Telemetry Middleware.
    Tracks throughput counters, latency rates, response codes, and injects headers.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        global METRICS_REGISTRY
        METRICS_REGISTRY["total_requests"] += 1
        
        start_time = time.perf_counter()
        
        # Path scoping to monitor specific litigation/matching processes
        path = request.url.path
        if "/notices/upload" in path:
            METRICS_REGISTRY["ocr_notices_total"] += 1
        elif "/reconcile/gstr2b" in path:
            METRICS_REGISTRY["recon_total"] += 1
            
        try:
            response = await call_next(request)
            
            process_time = time.perf_counter() - start_time
            METRICS_REGISTRY["cumulative_latency"] += process_time
            
            # Inject process time headers in production HTTP answers
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"
            
            # Track failure rates (e.g. status codes >= 400)
            if response.status_code >= 400:
                METRICS_REGISTRY["failed_requests"] += 1
                if "/notices/upload" in path:
                    METRICS_REGISTRY["ocr_notices_failures"] += 1
                elif "/reconcile/gstr2b" in path:
                    METRICS_REGISTRY["recon_failures"] += 1
                    
            logger.info(
                f"[TELEMETRY] Method: {request.method} | Path: {path} | "
                f"Status: {response.status_code} | Latency: {process_time:.4f}s"
            )
            
            return response
            
        except Exception as e:
            # Process exception logging
            process_time = time.perf_counter() - start_time
            METRICS_REGISTRY["cumulative_latency"] += process_time
            METRICS_REGISTRY["failed_requests"] += 1
            
            if "/notices/upload" in path:
                METRICS_REGISTRY["ocr_notices_failures"] += 1
            elif "/reconcile/gstr2b" in path:
                METRICS_REGISTRY["recon_failures"] += 1
                
            logger.error(
                f"[TELEMETRY CRITICAL] Method: {request.method} | Path: {path} | "
                f"Exception: {str(e)} | Latency: {process_time:.4f}s"
            )
            raise e

def get_telemetry_metrics() -> Dict[str, Any]:
    """
    Returns active operational telemetry metrics, merging AI token pool statistics.
    """
    global METRICS_REGISTRY
    
    # Dynamically query AI token logs from provider statistics
    try:
        from services.ai.provider import get_token_usage
        usage = get_token_usage()
        METRICS_REGISTRY["ai_calls_total"] = usage.get("total_calls", 0)
        METRICS_REGISTRY["ai_prompt_tokens"] = usage.get("prompt_tokens", 0)
        METRICS_REGISTRY["ai_completion_tokens"] = usage.get("completion_tokens", 0)
    except Exception:
        pass
        
    avg_latency = 0.0
    if METRICS_REGISTRY["total_requests"] > 0:
        avg_latency = METRICS_REGISTRY["cumulative_latency"] / METRICS_REGISTRY["total_requests"]
        
    return {
        "uptime_status": "OK",
        "api_total_requests": METRICS_REGISTRY["total_requests"],
        "api_failed_requests": METRICS_REGISTRY["failed_requests"],
        "api_avg_latency_seconds": round(avg_latency, 4),
        
        "ocr_notices_processed": METRICS_REGISTRY["ocr_notices_total"],
        "ocr_notices_failed": METRICS_REGISTRY["ocr_notices_failures"],
        "reconciliations_run": METRICS_REGISTRY["recon_total"],
        "reconciliations_failed": METRICS_REGISTRY["recon_failures"],
        
        "ai_token_calls_total": METRICS_REGISTRY["ai_calls_total"],
        "ai_prompt_tokens_consumed": METRICS_REGISTRY["ai_prompt_tokens"],
        "ai_completion_tokens_consumed": METRICS_REGISTRY["ai_completion_tokens"]
    }

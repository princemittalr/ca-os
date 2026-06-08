import time
import logging
import threading
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Dict, Any

# Configure standard logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("observability")

_metrics_lock = threading.Lock()

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
        path = request.url.path
        
        with _metrics_lock:
            METRICS_REGISTRY["total_requests"] += 1
            if "/notices/upload" in path:
                METRICS_REGISTRY["ocr_notices_total"] += 1
            elif "/reconcile/gstr2b" in path:
                METRICS_REGISTRY["recon_total"] += 1
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            
            process_time = time.perf_counter() - start_time
            
            with _metrics_lock:
                METRICS_REGISTRY["cumulative_latency"] += process_time
                if response.status_code >= 400:
                    METRICS_REGISTRY["failed_requests"] += 1
                    if "/notices/upload" in path:
                        METRICS_REGISTRY["ocr_notices_failures"] += 1
                    elif "/reconcile/gstr2b" in path:
                        METRICS_REGISTRY["recon_failures"] += 1
            
            # Inject process time headers in production HTTP answers
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"
            
            logger.info(
                f"[TELEMETRY] Method: {request.method} | Path: {path} | "
                f"Status: {response.status_code} | Latency: {process_time:.4f}s"
            )
            
            return response
            
        except Exception as e:
            # Process exception logging
            process_time = time.perf_counter() - start_time
            with _metrics_lock:
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
    with _metrics_lock:
        snapshot = dict(METRICS_REGISTRY)
    
    # Dynamically query AI token logs from provider statistics
    try:
        from services.ai.provider import get_token_usage
        usage = get_token_usage()
        snapshot["ai_calls_total"] = usage.get("total_calls", 0)
        snapshot["ai_prompt_tokens"] = usage.get("prompt_tokens", 0)
        snapshot["ai_completion_tokens"] = usage.get("completion_tokens", 0)
    except Exception:
        pass
        
    avg_latency = 0.0
    if snapshot["total_requests"] > 0:
        avg_latency = snapshot["cumulative_latency"] / snapshot["total_requests"]
        
    return {
        "uptime_status": "OK",
        "api_total_requests": snapshot["total_requests"],
        "api_failed_requests": snapshot["failed_requests"],
        "api_avg_latency_seconds": round(avg_latency, 4),
        
        "ocr_notices_processed": snapshot["ocr_notices_total"],
        "ocr_notices_failed": snapshot["ocr_notices_failures"],
        "reconciliations_run": snapshot["recon_total"],
        "reconciliations_failed": snapshot["recon_failures"],
        
        "ai_token_calls_total": snapshot["ai_calls_total"],
        "ai_prompt_tokens_consumed": snapshot["ai_prompt_tokens"],
        "ai_completion_tokens_consumed": snapshot["ai_completion_tokens"]
    }

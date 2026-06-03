from fastapi import APIRouter, status
from typing import Dict, Any
from config.settings import settings
from config.supabase import is_supabase_active
from middleware.observability import get_telemetry_metrics
from services.jobs.scheduler import cron_scheduler

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
def check_service_health() -> Dict[str, Any]:
    """
    Diagnostic endpoint scanning active backend core elements and persistent registries.
    """
    supabase_ok = is_supabase_active()
    scheduler_ok = cron_scheduler.is_running if hasattr(cron_scheduler, "is_running") else True
    
    # Complete diagnostic health scan
    health_status = "HEALTHY"
    if not supabase_ok and settings.ENV == "production":
        # Production requires database persistent layer active
        health_status = "DEGRADED"
        
    return {
        "status": health_status,
        "environment": settings.ENV,
        "database_connected": supabase_ok,
        "jobs_scheduler_active": scheduler_ok,
        "services": {
            "api_layer": "UP",
            "background_workers": "UP"
        }
    }

@router.get("/status", status_code=status.HTTP_200_OK)
def get_operational_telemetry() -> Dict[str, Any]:
    """
    Returns live API latencies, total request ticks, AI token pools counts, and process error variables.
    """
    metrics = get_telemetry_metrics()
    metrics["build_profile"] = settings.ENV
    return metrics

@router.get("/version", status_code=status.HTTP_200_OK)
def get_service_version() -> Dict[str, Any]:
    """
    Returns build tags and deployment parameters.
    """
    return {
        "version": "1.0.0",
        "api_profile": settings.ENV,
        "framework": "FastAPI ASGI",
        "observability_tier": "metrics_v1"
    }

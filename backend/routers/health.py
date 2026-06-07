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

    # Fix: scheduler has no is_running attribute — check thread
    scheduler_ok = (
        cron_scheduler.thread is not None
        and cron_scheduler.thread.is_alive()
    )

    health_status = "HEALTHY"
    issues = []

    if not supabase_ok:
        health_status = "DEGRADED"
        issues.append("database_unreachable")

    if not scheduler_ok:
        # Scheduler down is WARNING, not DEGRADED
        issues.append("scheduler_not_running")
        if health_status == "HEALTHY":
            health_status = "WARNING"

    response = {
        "status": health_status,
        "environment": settings.ENV,
        "database_connected": supabase_ok,
        "jobs_scheduler_active": scheduler_ok,
        "services": {
            "api_layer": "UP",
            "background_workers": "UP" if scheduler_ok else "DOWN"
        }
    }

    if issues:
        response["issues"] = issues

    # Only expose debug info in non-production
    if settings.ENV != "production":
        response["debug"] = settings.DEBUG

    return response

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

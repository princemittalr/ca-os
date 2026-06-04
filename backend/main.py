from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from config.settings import settings
from middleware.observability import ObservabilityMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.errors import global_exception_handler, http_exception_handler, validation_exception_handler
from services.jobs.scheduler import cron_scheduler

from config.env_validator import validate_environment
validate_environment()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start periodic scheduler
    cron_scheduler.start()
    yield
    # Shutdown: Stop periodic scheduler
    cron_scheduler.stop()

app = FastAPI(
    title="Reckon AI API",
    description="Backend API for Reckon AI - CA Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from middleware.rate_limit import limiter, rate_limit_exceeded_handler

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore
app.add_middleware(SlowAPIMiddleware)

# Configure hardened Production CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register request logger and observability latency telemetry
app.add_middleware(ObservabilityMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Register structured global error boundaries
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to Reckon AI API"}

# Import routers here and include them
from routers import upload, reconcile, clients, communication, compliance, action_center, auth, jobs, ai, notices, health, demo, audit, notifications
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(reconcile.router, prefix="/api/reconcile", tags=["reconcile"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(communication.router, prefix="/api/communications", tags=["communications"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["compliance"])
app.include_router(action_center.router, prefix="/api/action-center", tags=["action-center"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(notices.router, prefix="/api/notices", tags=["notices"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


# Lifespan events (startup/shutdown) are handled via FastAPI lifespan context manager

# Direct export mappings to ensure exact path conformance
from routers.reconcile import export_reconciliation_excel, export_reconciliation_pdf
app.get("/api/export/reconciliation/excel", tags=["export"])(export_reconciliation_excel)
app.get("/api/export/reconciliation/pdf", tags=["export"])(export_reconciliation_pdf)

# from app.routers import auth, clients, reconcile, compliance, notifications, support, audit
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
# app.include_router(reconcile.router, prefix="/api/reconcile", tags=["reconcile"])
# app.include_router(compliance.router, prefix="/api/compliance", tags=["compliance"])
# app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
# app.include_router(support.router, prefix="/api/support", tags=["support"])
# app.include_router(audit.router, prefix="/api/audit", tags=["audit"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

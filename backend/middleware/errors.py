import logging
import uuid
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from config.settings import settings

# Configure error boundary logger
logger = logging.getLogger("errors")

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Structured global error boundary catching unhandled standard Python exceptions.
    Prevents raw stack trace leakages in production outputs.
    """
    logger.error(
        f"[FATAL EXCEPTION] Path: {request.url.path} | Error: {str(exc)}", 
        exc_info=True
    )
    request_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "A critical system error occurred. Please contact administrator.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "details": str(exc) if settings.DEBUG else None,
            "request_id": request_id
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Formats standard Starlette/FastAPI HTTPExceptions uniformly.
    """
    logger.warning(
        f"[HTTP ERROR] Path: {request.url.path} | Status: {exc.status_code} | Detail: {exc.detail}"
    )
    request_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
            "details": None,
            "request_id": request_id
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Intercepts and reformats standard RequestValidationErrors into a clean nested schema.
    """
    logger.warning(
        f"[VALIDATION FAILED] Path: {request.url.path} | Errors: {exc.errors()}"
    )
    request_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "validation_error",
            "message": "Provided query parameters or request body failed schema validations.",
            "error_code": "VALIDATION_ERROR",
            "details": exc.errors(),
            "request_id": request_id
        }
    )

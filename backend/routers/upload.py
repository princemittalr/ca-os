from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from services.parser import parse_file_to_dataframe, normalize_columns, detect_gst_fields
from services.file_security import validate_and_secure_upload
from middleware.rate_limit import limiter, UPLOAD_LIMIT
from services.audit_logger import log_audit_event, get_client_ip
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/gstr2b")
@limiter.limit(UPLOAD_LIMIT)
async def upload_gstr2b(request: Request, file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    contents = await file.read()

    filename = file.filename or "gstr2b.xlsx"
    # Security validation
    file_meta = validate_and_secure_upload(contents, filename)

    try:
        df = parse_file_to_dataframe(contents, filename)
        df = normalize_columns(df)
        columns_list = list(df.columns)
        detected = detect_gst_fields(columns_list)

        return {
            "filename": file_meta["secure_filename"],
            "original_filename": file_meta["original_filename"],
            "rows": len(df),
            "columns": columns_list,
            "detected_fields": detected,
            "size_bytes": file_meta["size_bytes"]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Parse error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to parse the uploaded file. Please verify its content and format.")
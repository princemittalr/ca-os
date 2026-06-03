import uuid
import os
import magic
from fastapi import HTTPException, UploadFile

# Allowed file types
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.pdf'}
ALLOWED_MIME_TYPES = {
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'text/plain',  # some CSV files
}

# Blocked dangerous extensions
BLOCKED_EXTENSIONS = {
    '.exe', '.dll', '.bat', '.sh', '.js', '.py',
    '.zip', '.tar', '.gz', '.rar', '.cmd', '.ps1'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Secure upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'secure')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def validate_and_secure_upload(contents: bytes, filename: str) -> dict:
    """
    Full security validation pipeline for uploaded files.
    Returns secure filename and metadata.
    """
    # 1. Size check
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds 10MB limit. Size: {len(contents)/(1024*1024):.2f}MB"
        )

    # 2. Extension check
    ext = os.path.splitext(filename.lower())[1]

    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed."
        )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: CSV, XLSX, XLS, PDF"
        )

    # 3. MIME type validation
    try:
        mime = magic.from_buffer(contents, mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file content. MIME type '{mime}' not permitted."
            )
    except HTTPException:
        raise
    except Exception:
        pass  # magic unavailable, skip MIME check

    # 4. Randomize filename with UUID
    secure_name = f"{uuid.uuid4().hex}{ext}"

    return {
        "original_filename": filename,
        "secure_filename": secure_name,
        "size_bytes": len(contents),
        "extension": ext,
    }


def save_secure_file(contents: bytes, secure_filename: str) -> str:
    """Save file to secure isolated directory."""
    filepath = os.path.join(UPLOAD_DIR, secure_filename)
    with open(filepath, 'wb') as f:
        f.write(contents)
    return filepath
import re
import bleach
from fastapi import HTTPException

# ── GSTIN Validation ─────────────────────────────────────────
GSTIN_PATTERN = re.compile(
    r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
)

def validate_gstin(gstin: str) -> str:
    gstin = gstin.strip().upper()
    if not GSTIN_PATTERN.match(gstin):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid GSTIN format: {gstin}. Must be 15 characters."
        )
    return gstin

# ── PAN Validation ───────────────────────────────────────────
PAN_PATTERN = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$')

def validate_pan(pan: str) -> str:
    pan = pan.strip().upper()
    if not PAN_PATTERN.match(pan):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid PAN format: {pan}. Must be 10 characters."
        )
    return pan

# ── Invoice Number Validation ────────────────────────────────
def validate_invoice_number(invoice_no: str) -> str:
    invoice_no = invoice_no.strip()
    if len(invoice_no) < 1 or len(invoice_no) > 100:
        raise HTTPException(
            status_code=422,
            detail="Invoice number must be between 1-100 characters."
        )
    # Remove dangerous characters
    sanitized = re.sub(r'[<>"\';\\]', '', invoice_no)
    return sanitized

# ── Text Sanitization (XSS Prevention) ──────────────────────
ALLOWED_TAGS = []  # No HTML tags allowed in API inputs

def sanitize_text(text: str, max_length: int = 500) -> str:
    if not text:
        return text
    # Strip HTML tags using bleach
    cleaned = bleach.clean(text, tags=ALLOWED_TAGS, strip=True)
    # Truncate
    return cleaned[:max_length]

# ── Numeric Amount Validation ────────────────────────────────
def validate_amount(amount: float, field_name: str = "amount") -> float:
    if amount < 0:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} cannot be negative."
        )
    if amount > 999999999:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} exceeds maximum allowed value."
        )
    return round(amount, 2)

# ── Filing Period Validation ─────────────────────────────────
PERIOD_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')

def validate_filing_period(period: str) -> str:
    period = period.strip()
    if not PERIOD_PATTERN.match(period):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid filing period: {period}. Format: YYYY-MM"
        )
    return period

# ── General String Sanitizer ─────────────────────────────────
def sanitize_string(value: str, max_length: int = 255) -> str:
    if not value:
        return value
    cleaned = bleach.clean(str(value), tags=[], strip=True)
    cleaned = cleaned.strip()
    return cleaned[:max_length]
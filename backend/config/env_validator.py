import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED_SECRETS = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GROQ_API_KEY",
]

OPTIONAL_SECRETS = [
    "SUPABASE_ANON_KEY",
    "AI_RATE_LIMIT",
    "AUTH_RATE_LIMIT",
    "UPLOAD_RATE_LIMIT",
]

def validate_environment():
    """Validate all required environment variables on startup."""
    missing = []
    warnings = []

    for key in REQUIRED_SECRETS:
        val = os.getenv(key)
        if not val or val in ("mock_key", "mock_url", ""):
            missing.append(key)

    for key in OPTIONAL_SECRETS:
        val = os.getenv(key)
        if not val:
            warnings.append(key)

    if warnings:
        for w in warnings:
            print(f"[WARN] Optional env var missing: {w}")

    if missing:
        print(f"[CRITICAL] Missing required environment variables: {missing}")
        print("[CRITICAL] Server cannot start safely. Add missing vars to .env")
        sys.exit(1)

    print("[SUCCESS] Environment validation passed. All secrets loaded.")

def get_secret(key: str, default: str = None) -> str:
    """Safe secret getter with validation."""
    val = os.getenv(key, default)
    if val in ("mock_key", "mock_url"):
        return default
    return val
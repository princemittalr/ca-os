import os
import sys
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

REQUIRED_SECRETS = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "SECRET_KEY",
]

OPTIONAL_SECRETS = [
    # AI providers — platform works without them (AI features degrade gracefully)
    "GROQ_API_KEY",
    "OPENAI_API_KEY",
    # Rate limit overrides
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
        if not val or val in ("mock_key", ""):
            warnings.append(key)

    if warnings:
        for w in warnings:
            print(f"[WARN] Optional env var not set: {w}")

    if missing:
        print(f"[CRITICAL] Missing required environment variables: {missing}")
        print("[CRITICAL] Server cannot start safely. Add missing vars to .env")
        sys.exit(1)

    # ── Startup env summary ──────────────────────────────────────────────────
    env_name    = os.getenv("ENV", "development")
    debug_flag  = os.getenv("DEBUG", "false").lower()
    demo_flag   = os.getenv("ENABLE_DEMO_MODE", "false").lower()
    cors_raw    = os.getenv("CORS_ORIGINS", "")
    cors_count  = len([o for o in cors_raw.split(",") if o.strip()]) if cors_raw else "default"
    print("[SUCCESS] Environment validation passed. All required secrets loaded.")
    print(f"[INFO] ENV={env_name} | DEBUG={debug_flag} | DEMO={demo_flag} | CORS_ORIGINS={cors_count}")

def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Safe secret getter with validation."""
    val = os.getenv(key, default)
    if val in ("mock_key", "mock_url"):
        return default
    return val
import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Load local environment variables if present
load_dotenv()

SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Singleton client reference
supabase_client: Optional[Client] = None

# Enforce credentials existence on startup
if (not SUPABASE_URL or SUPABASE_URL == "mock_url" or
    not SUPABASE_ANON_KEY or SUPABASE_ANON_KEY == "mock_key" or
    not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "mock_key"):
    missing = []
    if not SUPABASE_URL or SUPABASE_URL == "mock_url": missing.append("SUPABASE_URL")
    if not SUPABASE_ANON_KEY or SUPABASE_ANON_KEY == "mock_key": missing.append("SUPABASE_ANON_KEY")
    if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "mock_key": missing.append("SUPABASE_SERVICE_ROLE_KEY")
    raise RuntimeError(
        f"Required Supabase credentials missing or set to mock defaults: {', '.join(missing)}. "
        f"Application startup failed."
    )

try:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[SUCCESS] Supabase Persistent Infrastructure Client Singleton Initialized.")
except Exception as e:
    raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

def is_supabase_active() -> bool:
    """
    Returns True if the persistent database client is active.
    """
    return supabase_client is not None

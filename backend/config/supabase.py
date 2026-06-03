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

# Service role key should ONLY be used in the backend for elevated access
active_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

if SUPABASE_URL and active_key:
    try:
        supabase_client = create_client(SUPABASE_URL, active_key)
        print("[SUCCESS] Supabase Persistent Infrastructure Client Singleton Initialized.")
    except Exception as e:
        print(f"[WARN] Failed to initialize Supabase client: {str(e)}")
else:
    print("[WARN] Supabase credentials not found in environment. Operating in zero-friction MOCK fallback mode.")

def is_supabase_active() -> bool:
    """
    Returns True if the persistent database client is active.
    """
    return supabase_client is not None

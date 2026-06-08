import os
from typing import Optional, Any
from dotenv import load_dotenv

load_dotenv()

# Singleton client reference - starts as None to prevent import-time crashes
supabase_client: Optional[Any] = None

def _validate_credentials() -> tuple[str, str, str]:
    """
    Validate and return (url, anon_key, service_role_key).
    Raises RuntimeError if credentials are missing or set to mock defaults.
    """
    url = os.getenv("SUPABASE_URL", "")
    anon = os.getenv("SUPABASE_ANON_KEY", "")
    service = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Identify invalid/mock credentials
    mock_vals = {"", "mock_url", "mock_key"}
    missing = []
    if url in mock_vals: missing.append("SUPABASE_URL")
    if anon in mock_vals: missing.append("SUPABASE_ANON_KEY")
    if service in mock_vals: missing.append("SUPABASE_SERVICE_ROLE_KEY")
    
    if missing:
        raise RuntimeError(
            f"Required Supabase credentials missing or set to mock defaults: {', '.join(missing)}"
        )
    return url, anon, service

def get_supabase_client():
    """
    Lazy singleton initializer.
    Safe to import at module level; initialization only occurs on the first call.
    Returns the initialized Supabase Client.
    """
    global supabase_client
    if supabase_client is not None:
        return supabase_client
        
    from supabase import create_client
    url, anon, service = _validate_credentials()
    
    try:
        supabase_client = create_client(url, service)
        print("[SUPABASE] Persistent Infrastructure Client Singleton Initialized.")
        return supabase_client
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

def is_supabase_active() -> bool:
    """
    Returns True if the persistent database client has been initialized.
    """
    return supabase_client is not None

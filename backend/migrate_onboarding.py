import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load local environment variables from parent directory if present, or backend directory
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL == "mock_url" or SUPABASE_SERVICE_ROLE_KEY == "mock_key":
    print("Supabase credentials not set or set to mock defaults. Skipping DB migration.")
    exit(0)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("Connected to Supabase.")
except Exception as e:
    print(f"Failed to connect to Supabase: {e}")
    exit(1)

def migrate():
    print("Running onboarding migration for existing users...")
    try:
        # Get all users
        res = supabase.table("users").select("id, onboarding_complete").execute()
        users = res.data
        if not users:
            print("No users found to migrate.")
            return

        print(f"Found {len(users)} users.")
        count = 0
        for u in users:
            if isinstance(u, dict):
                if not u.get("onboarding_complete"):
                    user_id = u.get("id")
                    if user_id:
                        print(f"Updating user {user_id} to onboarding_complete = True...")
                        supabase.table("users").update({"onboarding_complete": True}).eq("id", user_id).execute()
                        count += 1
        print(f"Migration completed successfully. Updated {count} users.")
    except Exception as e:
        err_msg = str(e)
        if "Could not find the table" in err_msg and "users" in err_msg:
            print("Table 'users' does not exist in Supabase schema cache. Skipping migration (schema may not be fully initialized).")
            return
        print(f"Migration failed: {e}")
        exit(1)

if __name__ == "__main__":
    migrate()

"""
migrate_onboarding.py

Backfill migration for existing users:
1. Finds all auth.users with no public.users row → creates them
2. Finds all public.users with onboarding_complete = NULL/False → sets True
   (only for users that existed before onboarding was implemented)

Run once: python migrate_onboarding.py
"""
import os
import sys
import uuid
from config.supabase import get_supabase_client
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

try:
    supabase = get_supabase_client()
    print("[MIGRATE] Connected to Supabase.")
except Exception as e:
    print(f"[MIGRATE] Failed to connect to Supabase: {e}")
    sys.exit(1)


def migrate():
    print("[MIGRATE] Starting onboarding migration for existing users...")

    # ── Step 1: Get all existing public.users rows ─────────────────────────
    try:
        existing_res = supabase.table("users").select("id, onboarding_complete").execute()
        existing_users = existing_res.data or []
        existing_ids = {u["id"] for u in existing_users if isinstance(u, dict)}
        print(f"[MIGRATE] Found {len(existing_users)} existing public.users rows.")
    except Exception as e:
        err_msg = str(e)
        if "relation" in err_msg and "does not exist" in err_msg:
            print("[MIGRATE] Table 'users' does not exist. Run the SQL migration first.")
            sys.exit(1)
        print(f"[MIGRATE] Failed to query public.users: {e}")
        sys.exit(1)

    # ── Step 2: Get all auth.users via admin API ───────────────────────────
    # This requires service role key (which get_supabase_client uses)
    try:
        auth_res = supabase.auth.admin.list_users()
        auth_users = auth_res if isinstance(auth_res, list) else getattr(auth_res, 'users', [])
        print(f"[MIGRATE] Found {len(auth_users)} auth.users.")
    except Exception as e:
        print(f"[MIGRATE] Failed to list auth users: {e}")
        print("[MIGRATE] Skipping Step 2 (orphan user creation). Proceeding to Step 3.")
        auth_users = []

    # ── Step 3: Create public.users rows for orphan auth users ────────────
    created_count = 0
    for auth_user in auth_users:
        user_id = getattr(auth_user, 'id', None) or (auth_user.get('id') if isinstance(auth_user, dict) else None)
        if not user_id or user_id in existing_ids:
            continue

        meta = getattr(auth_user, 'user_metadata', {}) or {}
        if isinstance(auth_user, dict):
            meta = auth_user.get('user_metadata') or auth_user.get('raw_user_meta_data') or {}

        full_name = meta.get('full_name', '')
        firm_name = meta.get('firm_name', '')
        firm_id = meta.get('firm_id') or str(uuid.uuid4())  # Generate new if missing

        try:
            supabase.table("users").insert({
                "id": user_id,
                "full_name": full_name,
                "firm_name": firm_name,
                "firm_id": firm_id,
                "onboarding_complete": True  # Existing users skip onboarding
            }).execute()
            print(f"[MIGRATE] Created public.users row for auth user {user_id} (firm_id={firm_id})")
            created_count += 1
            existing_ids.add(user_id)
        except Exception as insert_err:
            print(f"[MIGRATE] Failed to create row for {user_id}: {insert_err}")

    print(f"[MIGRATE] Step 2 complete. Created {created_count} missing user rows.")

    # ── Step 4: Mark all existing incomplete users as onboarding complete ──
    updated_count = 0
    for u in existing_users:
        if not isinstance(u, dict):
            continue
        if u.get("onboarding_complete") is True:
            continue  # Already complete — skip
        user_id = u.get("id")
        if not user_id:
            continue
        try:
            supabase.table("users").update({"onboarding_complete": True}).eq("id", user_id).execute()
            print(f"[MIGRATE] Marked onboarding_complete=True for user {user_id}")
            updated_count += 1
        except Exception as upd_err:
            print(f"[MIGRATE] Failed to update {user_id}: {upd_err}")

    print(f"[MIGRATE] Step 3 complete. Updated {updated_count} users to onboarding_complete=True.")
    print(f"[MIGRATE] Migration finished. Created={created_count}, Updated={updated_count}.")


if __name__ == "__main__":
    migrate()
from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("", response_model=List[str])
async def list_staff_members():
    """
    Get all staff members from database.
    """
    from config.supabase import supabase_client, is_supabase_active
    if not is_supabase_active() or supabase_client is None:
        return []
    try:
        res = supabase_client.table("users").select("full_name").execute()
        staff = [u["full_name"] for u in res.data if u.get("full_name")]
        return staff
    except Exception as e:
        print(f"Error fetching staff from db: {str(e)}")
        return []

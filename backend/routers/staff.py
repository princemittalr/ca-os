from fastapi import APIRouter, Depends
from typing import List, Dict, Any, cast
from middleware.auth import verify_token

router = APIRouter()

@router.get("", response_model=List[str])
async def list_staff_members(current_user: dict = Depends(verify_token)):
    """
    Get all staff members from database.
    """
    from config.supabase import get_supabase_client, is_supabase_active
    if not is_supabase_active():
        return []
    try:
        res = get_supabase_client().table("users")\
            .select("full_name")\
            .eq("firm_id", current_user["firm_id"])\
            .execute()
        data_list = cast(List[Dict[str, Any]], res.data or [])
        return [u["full_name"] for u in data_list if u.get("full_name")]
    except Exception as e:
        print(f"Error fetching staff: {str(e)}")
        return []


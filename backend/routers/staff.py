from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("", response_model=List[str])
async def list_staff_members():
    """
    Get all staff members.
    """
    return ["Aditya Rao", "Neha Sharma", "Rohan Mehta", "Kunal Sen"]

from database import supabase
from datetime import date
import uuid

FIRM_ID = "00000000-0000-0000-0000-000000000001"

clients = [
    {"firm_id": FIRM_ID, "business_name": "TechNova Solutions Pvt Ltd", "gstin": "27AABCT1332L1ZX", "email": "contact@technova.com", "state": "Maharashtra", "state_code": "27", "contact_person": "Rahul Mehta", "phone": "9876543210", "assigned_manager": "Aditya Rao"},
    {"firm_id": FIRM_ID, "business_name": "Apex Innovations Ltd", "gstin": "29AABCA1234L1ZX", "email": "finance@apex.com", "state": "Karnataka", "state_code": "29", "contact_person": "Priya Sharma", "phone": "9845012345", "assigned_manager": "Aditya Rao"},
    {"firm_id": FIRM_ID, "business_name": "Wayne Enterprises India Pvt Ltd", "gstin": "07AABCW5678L1ZX", "email": "accounts@wayne.in", "state": "Delhi", "state_code": "07", "contact_person": "Bruce Wayne", "phone": "9911223344", "assigned_manager": "Aditya Rao"},
    {"firm_id": FIRM_ID, "business_name": "Bharat Steel Works Ltd", "gstin": "24AABCB9012L1ZX", "email": "gst@bharatsteel.com", "state": "Gujarat", "state_code": "24", "contact_person": "Vikram Patel", "phone": "9723456789", "assigned_manager": "Aditya Rao"},
    {"firm_id": FIRM_ID, "business_name": "Sunrise Pharma Pvt Ltd", "gstin": "06AABCS3456L1ZX", "email": "compliance@sunrisepharma.in", "state": "Haryana", "state_code": "06", "contact_person": "Neha Gupta", "phone": "9812345678", "assigned_manager": "Aditya Rao"},
]

res = supabase.table("clients").insert(clients).execute()
print(f"✅ Inserted {len(res.data)} clients!")
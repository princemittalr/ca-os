from database import supabase
from datetime import date, timedelta
import uuid

FIRM_ID = "00000000-0000-0000-0000-000000000001"

# Get client IDs from DB
clients_res = supabase.table("clients").select("id, business_name").execute()
clients = clients_res.data
print(f"Found {len(clients)} clients")

if not clients:
    print("❌ No clients found. Run seed.py first.")
    exit()

c1, c2, c3, c4, c5 = clients[0], clients[1], clients[2], clients[3], clients[4]

# ── Compliance Tasks ──────────────────────────────────────────
compliance_tasks = [
    {"client_id": c1["id"], "compliance_type": "GSTR-3B", "filing_period": "2024-06", "due_date": str(date.today() - timedelta(days=5)), "status": "Overdue", "assigned_to": "Aditya Rao", "risk_level": "HIGH", "risk_score": 85.0},
    {"client_id": c2["id"], "compliance_type": "GSTR-1", "filing_period": "2024-06", "due_date": str(date.today() - timedelta(days=2)), "status": "Overdue", "assigned_to": "Aditya Rao", "risk_level": "HIGH", "risk_score": 78.0},
    {"client_id": c3["id"], "compliance_type": "GSTR-3B", "filing_period": "2024-06", "due_date": str(date.today() + timedelta(days=2)), "status": "Due Today", "assigned_to": "Aditya Rao", "risk_level": "MEDIUM", "risk_score": 60.0},
    {"client_id": c4["id"], "compliance_type": "TDS Return", "filing_period": "Q1-2024", "due_date": str(date.today() + timedelta(days=7)), "status": "Upcoming", "assigned_to": "Aditya Rao", "risk_level": "LOW", "risk_score": 25.0},
    {"client_id": c5["id"], "compliance_type": "GSTR-1", "filing_period": "2024-06", "due_date": str(date.today() + timedelta(days=10)), "status": "Upcoming", "assigned_to": "Aditya Rao", "risk_level": "LOW", "risk_score": 20.0},
    {"client_id": c1["id"], "compliance_type": "ITR", "filing_period": "FY2023-24", "due_date": str(date.today() - timedelta(days=15)), "status": "Overdue", "assigned_to": "Aditya Rao", "risk_level": "HIGH", "risk_score": 92.0},
]

# ── Action Items ──────────────────────────────────────────────
action_items = [
    {
        "client_id": c1["id"], "client_name": c1["business_name"],
        "category": "RECONCILIATION", "priority": "HIGH",
        "title": "GSTR-2B Mismatch — 3 Invoices Unresolved",
        "description": "TechNova has 3 invoices missing in GSTR-2B worth ₹45,000 ITC at risk.",
        "recommended_action": "Contact suppliers immediately and verify GSTR-1 filing status.",
        "deadline": str(date.today() + timedelta(days=3)),
        "risk_score": 88.0, "status": "PENDING", "confidence_score": 0.92,
        "ai_summary": "High ITC exposure detected. Supplier outreach required within 3 days.",
        "predicted_impact": "₹45,000 ITC blockage if unresolved before month end."
    },
    {
        "client_id": c2["id"], "client_name": c2["business_name"],
        "category": "COMPLIANCE", "priority": "HIGH",
        "title": "GSTR-1 Filing Overdue — 2 Days",
        "description": "Apex Innovations GSTR-1 for June 2024 is overdue by 2 days.",
        "recommended_action": "File GSTR-1 immediately to avoid late fee of ₹200/day.",
        "deadline": str(date.today()),
        "risk_score": 78.0, "status": "PENDING", "confidence_score": 0.95,
        "ai_summary": "Late filing penalty accruing. Immediate action required.",
        "predicted_impact": "₹200/day penalty + potential notice from GST department."
    },
    {
        "client_id": c4["id"], "client_name": c4["business_name"],
        "category": "RISK", "priority": "HIGH",
        "title": "ITC Reversal Risk — Section 16(4)",
        "description": "Bharat Steel ITC claims may be reversed under Sec 16(4) deadline.",
        "recommended_action": "Verify all ITC claims before September 30 deadline.",
        "deadline": str(date.today() + timedelta(days=5)),
        "risk_score": 91.0, "status": "PENDING", "confidence_score": 0.88,
        "ai_summary": "Statutory deadline approaching for ITC reversal risk.",
        "predicted_impact": "₹8.9 lakh ITC reversal if deadline missed."
    },
    {
        "client_id": c3["id"], "client_name": c3["business_name"],
        "category": "VENDOR", "priority": "MEDIUM",
        "title": "Vendor Outreach — CGST Value Mismatch",
        "description": "Wayne Enterprises has CGST mismatch with supplier Ramesh Traders.",
        "recommended_action": "Send formal outreach notice to Ramesh Traders for amendment.",
        "deadline": str(date.today() + timedelta(days=7)),
        "risk_score": 55.0, "status": "PENDING", "confidence_score": 0.80,
        "ai_summary": "Value discrepancy requires vendor communication.",
        "predicted_impact": "₹32,500 ITC blocked until vendor files amendment."
    },
    {
        "client_id": c5["id"], "client_name": c5["business_name"],
        "category": "COMPLIANCE", "priority": "MEDIUM",
        "title": "GSTR-3B Reconciliation Pending",
        "description": "Sunrise Pharma GSTR-3B not reconciled with purchase register.",
        "recommended_action": "Run automated reconciliation before filing deadline.",
        "deadline": str(date.today() + timedelta(days=10)),
        "risk_score": 45.0, "status": "PENDING", "confidence_score": 0.75,
        "ai_summary": "Reconciliation required before filing.",
        "predicted_impact": "Possible excess ITC claim of ₹1.2 lakh if unreconciled."
    },
]

# Insert
r1 = supabase.table("compliance_tasks").insert(compliance_tasks).execute()
print(f"✅ Inserted {len(r1.data)} compliance tasks!")

r2 = supabase.table("action_items").insert(action_items).execute()
print(f"✅ Inserted {len(r2.data)} action items!")
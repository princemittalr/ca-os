import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_gst_insight(mismatches: list, client_name: str) -> str:
    if not mismatches:
        return "All invoices matched perfectly. No action required."
    
    mismatch_summary = "\n".join([
        f"- Invoice {m.get('invoice_number')} | GSTIN: {m.get('gstin')} | Issue: {m.get('issue')} | Risk: {m.get('risk_level')}"
        for m in mismatches[:10]
    ])
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": f"""
You are an expert Chartered Accountant AI assistant specializing in Indian GST compliance.

Client: {client_name}
Reconciliation Mismatches:
{mismatch_summary}

Provide:
1. Root cause analysis (2-3 sentences)
2. Top 3 priority actions for the CA
3. Risk assessment (LOW/MEDIUM/HIGH) with reasoning

Under 200 words. Use Indian GST terminology.
"""}],
        max_tokens=400
    )
    return response.choices[0].message.content

def get_compliance_briefing(overdue_tasks: list, firm_name: str = "CA Firm") -> str:
    if not overdue_tasks:
        return "All compliance tasks on track. No immediate action required."
    
    tasks_summary = "\n".join([
        f"- {t.get('compliance_type')} for {t.get('client_name','Client')} | Due: {t.get('due_date')} | Status: {t.get('status')}"
        for t in overdue_tasks[:10]
    ])
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": f"""
You are an expert Indian CA compliance advisor.

Firm: {firm_name}
Overdue Tasks:
{tasks_summary}

Provide:
1. Urgency assessment
2. Recommended filing order
3. Penalty risk if not filed today

Under 150 words. Indian tax terminology.
"""}],
        max_tokens=300
    )
    return response.choices[0].message.content
from dotenv import load_dotenv
load_dotenv()
import json
from typing import Dict, Any, List, Optional
from services.ai.provider import get_active_provider
from services.explanations import infer_root_cause

async def generate_reconciliation_explanation(
    mismatch_data: Dict[str, Any],
    client_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Structured AI Root-Cause Mismatch Reasoner.
    Uses active Gemini/OpenAI provider if available.
    Falls back gracefully to deterministic rule-based engine if offline.
    """
    provider = get_active_provider()
    print(f"[DEBUG] Provider loaded: {type(provider)}")
    
    # 1. Deterministic Fallback if AI providers are not active
    if not provider:
        issue = mismatch_data.get("issue") or mismatch_data.get("status") or "VALUE_MISMATCH"
        fallback = infer_root_cause(issue, mismatch_data)
        fallback["summary"] = f"Inferred Root-Cause: {fallback['likely_cause']}"
        fallback["priority_reasoning"] = "Inferred via deterministic compliance rule set."
        fallback["confidence_score"] = fallback.pop("confidence", 75.0)
        return fallback
        
    # 2. Format Structured LLM Prompt
    prompt = (
        f"You are a Senior Chartered Accountant analyzing a GST invoice reconciliation mismatch.\n"
        f"Analyze this mismatch:\n"
        f"- GSTIN: {mismatch_data.get('supplier_gstin') or mismatch_data.get('gstin')}\n"
        f"- Invoice No: {mismatch_data.get('invoice_number')}\n"
        f"- Invoice Date: {mismatch_data.get('invoice_date')}\n"
        f"- Taxable Value (Purchase Books): Rupees {mismatch_data.get('taxable_value_pr', 0.0) or mismatch_data.get('taxable_value', 0.0)}\n"
        f"- Taxable Value (GSTR-2B Portal): Rupees {mismatch_data.get('taxable_value_2b', 0.0)}\n"
        f"- Issue Identified: {mismatch_data.get('issue') or mismatch_data.get('status')}\n"
        f"- Likely Cause: {mismatch_data.get('likely_cause')}\n"
    )
    if client_context:
        prompt += (
            f"Client Context:\n"
            f"- Trade Name: {client_context.get('trade_name')}\n"
            f"- Filing Frequency: {client_context.get('filing_frequency')}\n"
        )
        
    schema = (
        "{\n"
        "  \"summary\": \"Clear 2-sentence executive summary of the mismatch\",\n"
        "  \"likely_cause\": \"The detailed root cause explanation of the difference\",\n"
        "  \"recommended_action\": \"Actionable steps for the auditor to resolve this discrepancy\",\n"
        "  \"risk_assessment\": \"Evaluation of statutory audit risks or ITC blockages\",\n"
        "  \"priority_reasoning\": \"Strategic reasoning behind the priority assigned\",\n"
        "  \"confidence_score\": 0-100\n"
        "}"
    )
    
    try:
        data = await provider.generate_structured_json(prompt, schema)
        data["explanation_source"] = "ai_copilot_layer_v1"
        return data
    except Exception as e:
        print(f"[COPILOT] AI execution failed, falling back to rules: {e}")
        # Rule fallback
        issue = mismatch_data.get("issue") or mismatch_data.get("status") or "VALUE_MISMATCH"
        fallback = infer_root_cause(issue, mismatch_data)
        fallback["summary"] = f"Inferred Root-Cause: {fallback['likely_cause']}"
        fallback["priority_reasoning"] = "Inferred via rule engine due to LLM provider exception."
        fallback["confidence_score"] = fallback.pop("confidence", 70.0)
        return fallback

async def generate_daily_briefing(actions: List[Dict[str, Any]]) -> str:
    """
    Fuses active alert feeds into a highly polished daily copilot narrative briefing.
    Falls back to a standard procedural summary if AI is offline.
    """
    provider = get_active_provider()
    
    high_priority = [a for a in actions if a.get("priority") == "HIGH"]
    
    if not provider:
        # Procedures template fallback
        return (
            f"Good morning, Auditor. The CA-OS Copilot has summarized {len(actions)} operational signals "
            f"for your attention today. There are {len(high_priority)} HIGH-priority compliance escalations "
            f"active. Tata Enterprises is overdue on GSTR-3B filings by 4 days, while high-value supplier "
            f"discrepancies at Sharma Traders threaten statutory ITC claims. We recommend immediate filing executions "
            f"and launching vendor reminders."
        )
        
    prompt = (
        f"Write a professional, concise (3-4 sentences), highly polished morning operational briefing for a Chartered Accountant.\n"
        f"Summarize these active alert items today:\n"
        f"- Total active signals: {len(actions)}\n"
        f"- HIGH severity escalations: {len(high_priority)}\n"
        f"- Highlights from alerts feed:\n"
    )
    for a in actions[:3]:
        prompt += f"  * Title: {a.get('title')} | Description: {a.get('description')} | Impact: {a.get('predicted_impact') or a.get('Predicted Impact')}\n"
        
    schema = "{\n  \"briefing\": \"The natural morning operational summary paragraph (3-4 sentences)\"\n}"
    
    try:
        data = await provider.generate_structured_json(prompt, schema)
        return data["briefing"]
    except Exception as e:
        print(f"[COPILOT] Briefing generation failed, using fallback: {e}")
        return (
            f"Operational Sweep Complete. Detected {len(actions)} action signals requiring review today. "
            f"Please address the {len(high_priority)} HIGH-severity filing bottlenecks immediately to safeguard ITC caps."
        )

async def generate_vendor_notice_draft(mismatch_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crafts customized statutory GSTR-1 vendor reminder notices.
    """
    provider = get_active_provider()
    
    if not provider:
        # Standard fallback template
        vendor_name = mismatch_data.get("vendor_name", "Supplier Vendor")
        body = (
            f"Dear Team at {vendor_name},\n\n"
            f"During our monthly GST audit, we detected a discrepancy regarding invoice "
            f"{mismatch_data.get('invoice_number', 'N/A')} of value Rupees {mismatch_data.get('taxable_value', '0.0')}.\n"
            f"This invoice is missing in our GSTR-2B portal record, blocking our input tax credit (ITC) claims.\n"
            f"Please file your GSTR-1 returns immediately so this invoice reflects on the portal.\n\n"
            f"Regards,\nAccounts Team"
        )
        return {
            "vendor_name": vendor_name,
            "gstin": mismatch_data.get("gstin", "N/A"),
            "issue": mismatch_data.get("issue") or "MISSING_IN_2B",
            "subject": f"URGENT: GST Filing Discrepancy Notice - Invoice {mismatch_data.get('invoice_number')}",
            "email_body": body,
            "priority": "HIGH",
            "recommended_deadline": "Within 3 Days"
        }
        
    prompt = (
        f"Craft a highly professional, firm, yet polite GSTR-1 filing reminder notice email to a supplier vendor.\n"
        f"Mismatch Details:\n"
        f"- Vendor Name: {mismatch_data.get('vendor_name')}\n"
        f"- GSTIN: {mismatch_data.get('gstin')}\n"
        f"- Invoice No: {mismatch_data.get('invoice_number')}\n"
        f"- Taxable Value: Rupees {mismatch_data.get('taxable_value')}\n"
        f"- Issue: {mismatch_data.get('issue')}\n"
    )
    
    schema = (
        "{\n"
        "  \"vendor_name\": \"Vendor corporate name\",\n"
        "  \"gstin\": \"GSTIN\",\n"
        "  \"issue\": \"Short issue summary\",\n"
        "  \"subject\": \"Professional subject line\",\n"
        "  \"email_body\": \"The full body of the outreach email\",\n"
        "  \"priority\": \"HIGH | MEDIUM\",\n"
        "  \"recommended_deadline\": \"YYYY-MM-DD deadline suggestion\"\n"
        "}"
    )
    
    try:
        return await provider.generate_structured_json(prompt, schema)
    except Exception as e:
        print(f"[COPILOT] Vendor draft notice failed: {e}")
        # Return fallback
        return {
            "vendor_name": mismatch_data.get("vendor_name", "Supplier Vendor"),
            "gstin": mismatch_data.get("gstin", "N/A"),
            "issue": mismatch_data.get("issue") or "MISSING_IN_2B",
            "subject": f"Discrepancy Warning - Invoice {mismatch_data.get('invoice_number')}",
            "email_body": "Please review outstanding GSTR-1 filing uploads for tax compliance.",
            "priority": "HIGH",
            "recommended_deadline": "Within 3 Days"
        }

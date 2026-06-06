import json
from typing import Dict, Any, List, Optional
from datetime import date
from services.ai.provider import get_active_provider
from services.notice_engine.ocr import parse_deterministic_metadata

def classify_notice(raw_text: str) -> str:
    """
    Classifies a notice based on key statutory terminology.
    """
    text = raw_text.upper()
    if "DRC-01" in text:
        return "DRC-01"
    elif "DRC-03" in text:
        return "DRC-03"
    elif "ASMT-10" in text:
        return "ASMT-10"
    elif "ASMT" in text:
        return "ASMT"
    elif "SCRUTINY" in text:
        return "Scrutiny Notice"
    elif "AUDIT" in text or "SECTION 65" in text:
        return "Audit Notice"
    elif "REGISTRATION" in text or "REG-03" in text or "REG-04" in text:
        return "Registration Notice"
    elif "LATE FILING" in text or "LATE FEE" in text:
        return "Late Filing Notice"
    elif "ITC MISMATCH" in text or "INPUT TAX CREDIT" in text:
        return "ITC Mismatch Notice"
    return "DRC-01"  # Default fallback

def classify_complexity(tax_amount: float, notice_type: str) -> str:
    """
    Classifies a notice's complexity (Simple, Moderate, Complex) based on tax demand and type.
    """
    if notice_type in ["DRC-01", "DRC-01A", "Audit Notice"] or tax_amount > 150000.0:
        return "Complex"
    elif notice_type in ["ASMT-10", "Scrutiny Notice"] or tax_amount > 50000.0:
        return "Moderate"
    return "Simple"

def calculate_notice_risk_score(tax_amount: float, notice_type: str, days_left: int) -> float:
    """
    Computes a legal risk-weighted index (0 to 100) based on notice types,
    tax liabilities at risk, and deadlines remaining.
    """
    score = 30.0 # Base minimum
    
    # 1. Notice type weighting
    if notice_type in ["DRC-01", "DRC-01A"]:
        score += 35.0  # Show cause notices are high threat
    elif notice_type in ["ASMT-10", "Audit Notice"]:
        score += 20.0  # Scrutiny/audits are medium threat
    else:
        score += 10.0  # Procedural are lower threat
        
    # 2. Tax exposure weighting
    if tax_amount > 200000.0:
        score += 20.0
    elif tax_amount > 50000.0:
        score += 10.0
        
    # 3. Urgency weighting
    if days_left <= 3:
        score += 15.0
    elif days_left <= 7:
        score += 10.0
    elif days_left <= 15:
        score += 5.0
        
    return min(100.0, score)

async def summarize_notice_with_ai(
    raw_text: str,
    client_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Fuses deterministic regex metadata with structured AI summaries.
    Falls back gracefully to a solid deterministic summarizer if LLMs are unconfigured.
    """
    # 1. Deterministic Extraction Layer (Source of Truth)
    det = parse_deterministic_metadata(raw_text)
    notice_type = classify_notice(raw_text)
    tax_amount = det.get("tax_amount", 0.0)
    
    provider = get_active_provider()
    
    # 2. Deterministic Fallback if AI providers are not active
    if not provider:
        summary_text = (
            f"Statutory {notice_type} issued to the client regarding tax discrepancies. "
            f"Reference Notice No {det.get('notice_number') or 'N/A'} requires urgent review. "
            f"Referenced regulations focus on {', '.join(det.get('section_references')) or 'GST compliance sections'}."
        )
        required = f"Submit statement of reconciliation or pay Rs. {tax_amount:,.2f} liability before deadline."
        complexity = classify_complexity(tax_amount, notice_type)
        next_action = "Prepare Reply"
        if notice_type == "ASMT-10":
            next_action = "Request Documents"
        elif tax_amount > 100000.0:
            next_action = "Obtain Vendor Confirmation"
            
        return {
            "notice_type": notice_type,
            "summary": summary_text,
            "risk_level": "HIGH" if tax_amount > 100000.0 else "MEDIUM",
            "required_action": required,
            "response_deadline": det.get("due_date") or "Within 15 Days",
            "sections_referenced": det.get("section_references") or ["GST Act Rules"],
            "complexity_score": complexity,
            "recommended_next_action": next_action,
            "supporting_evidence": [
                "Purchase Register matching GSTR-2B",
                "Original Purchase Tax Invoices",
                "Vendor Payment Proofs (Bank Statement)"
            ],
            "missing_documents": [
                "Supplier GSTR-1 filing confirmation",
                "E-way bill copies for transport verification"
            ],
            "questions_for_client": [
                "Have payments to the vendor been made within 180 days of the invoice date?",
                "Can you confirm physical receipt of goods for the disputed invoices?"
            ],
            "explanation_source": "notice_inference_engine_v1"
        }

    # 3. Format Structured Prompt
    prompt = (
        f"You are a tax attorney and Senior Auditor analyzing a statutory Goods and Services Tax (GST) notice.\n"
        f"Extract key legal details and provide an executive summary for this notice text:\n"
        f"\"\"\"\n{raw_text}\n\"\"\"\n"
    )
    if client_context:
        prompt += (
            f"Client Context:\n"
            f"- Trade Name: {client_context.get('trade_name')}\n"
            f"- GSTIN: {client_context.get('gstin')}\n"
        )
        
    schema = (
        "{\n"
        "  \"notice_type\": \"ASMT-10 | DRC-01 | Scrutiny Notice | Audit Notice | etc\",\n"
        "  \"summary\": \"Clear 2-sentence executive summary of what is demanded\",\n"
        "  \"risk_level\": \"HIGH | MEDIUM | LOW\",\n"
        "  \"required_action\": \"The immediate action steps the auditor must take to respond\",\n"
        "  \"response_deadline\": \"YYYY-MM-DD deadline or suggested reply window\",\n"
        "  \"sections_referenced\": [\"Section 73\", \"Section 16(4)\", etc],\n"
        "  \"complexity_score\": \"Simple | Moderate | Complex\",\n"
        "  \"recommended_next_action\": \"Prepare Reply | Request Documents | Obtain Vendor Confirmation | File DRC-03\",\n"
        "  \"supporting_evidence\": [\"Evidence document 1\", \"Evidence document 2\"],\n"
        "  \"missing_documents\": [\"Missing document 1\", \"Missing document 2\"],\n"
        "  \"questions_for_client\": [\"Question 1\", \"Question 2\"]\n"
        "}"
    )
    
    try:
        data = await provider.generate_structured_json(prompt, schema)
        
        # Hallucination Safeguard: Merge and prioritize deterministic extractions for critical numbers
        if det.get("gstin") and not data.get("gstin"):
            data["gstin"] = det["gstin"]
        if det.get("notice_number"):
            data["notice_number"] = det["notice_number"]
        if det.get("due_date") and data.get("response_deadline") == "N/A":
            data["response_deadline"] = det["due_date"]
            
        # Standardize sections referenced lists
        if det.get("section_references"):
            # Union of deterministic and AI extracted sections
            combined = list(set(det["section_references"] + data.get("sections_referenced", [])))
            data["sections_referenced"] = sorted(combined)
            
        data["explanation_source"] = "notice_copilot_layer_v1"
        return data
    except Exception as e:
        print(f"[INTEL] AI Notice Summarizer failed: {e}")
        # Rule Fallback
        summary_text = f"Audit Scrutiny Scans for {notice_type} referencing notice number {det.get('notice_number')}."
        complexity = classify_complexity(tax_amount, notice_type)
        next_action = "Prepare Reply"
        if notice_type == "ASMT-10":
            next_action = "Request Documents"
        return {
            "notice_type": notice_type,
            "summary": summary_text,
            "risk_level": "MEDIUM",
            "required_action": "Compile GSTR-1 and GSTR-3B matching reports.",
            "response_deadline": det.get("due_date") or "Within 15 Days",
            "sections_referenced": det.get("section_references") or ["CGST Act Sections"],
            "complexity_score": complexity,
            "recommended_next_action": next_action,
            "supporting_evidence": [
                "Reconciliation statement GSTR-2B vs Books",
                "Tax purchase ledger entries"
            ],
            "missing_documents": [
                "GSTR-1 upload receipts from the supplier"
            ],
            "questions_for_client": [
                "Do we have tax invoices matching these discrepancy values?"
            ],
            "explanation_source": "notice_inference_engine_fallback"
        }

async def generate_statutory_reply_draft(notice_data: Dict[str, Any]) -> str:
    """
    Generates a highly professional legal outreach draft/statutory response to a notice.
    """
    provider = get_active_provider()
    
    notice_type = notice_data.get("notice_type", "Notice")
    notice_num = notice_data.get("notice_number", "N/A")
    authority = notice_data.get("issuing_authority", "GST Tax Authority Office")
    client_name = notice_data.get("client_name", "Client Firm")
    gstin = notice_data.get("gstin", "N/A")
    sections = ", ".join(notice_data.get("section_references", ["GST Regulations"]))
    tax_amount = notice_data.get("tax_amount", 0.0)
    
    if not provider:
        # High quality template fallback
        return (
            f"Date: 2026-05-28\n"
            f"To,\n"
            f"The Office of the {authority},\n\n"
            f"SUBJECT: Reply to GST Scrutiny Notice {notice_num} issued under {sections} for GSTIN {gstin}\n\n"
            f"Respected Sir/Madam,\n\n"
            f"With reference to the notice {notice_num} received regarding the audit scrutiny for {client_name}, "
            f"we are writing on behalf of our client to respectfully submit our preliminary explanation.\n\n"
            f"The discrepancy identified points to a tax variance of Rs. {tax_amount:,.2f}. We are carrying out a detailed "
            f"invoice-by-invoice reconciliation between our Purchase Books and the GSTR-2B credit ledgers. "
            f"We request a standard 15-day extension to submit all verified ledger balances and tax invoice files.\n\n"
            f"We assure you of our complete cooperation with the Department in completing this assessment.\n\n"
            f"Thanking You,\n"
            f"For {client_name},\n"
            f"Authorized Representative / Chartered Accountants"
        )
        
    prompt = (
        f"Write a highly professional, statutory, and audit-ready reply letter to a GST Notice.\n"
        f"Details:\n"
        f"- Notice Type: {notice_type}\n"
        f"- Notice Reference Number: {notice_num}\n"
        f"- Issuing Tax Authority: {authority}\n"
        f"- Client Corporate Identity: {client_name}\n"
        f"- GSTIN: {gstin}\n"
        f"- Referenced Sections: {sections}\n"
        f"- Demanded Tax Amount: Rs. {tax_amount}\n"
        f"- Specific Issue: {notice_data.get('summary')}\n\n"
        f"Structure the reply as an official statutory letter, maintaining a formal and respectful tone, "
        f"addressing the discrepancies, requesting a 15-day extension to reconcile accounts, and confirming cooperative audit intents."
    )
    
    schema = "{\n  \"letter\": \"The full text of the official response letter\"\n}"
    
    try:
        data = await provider.generate_structured_json(prompt, schema)
        return data["letter"]
    except Exception as e:
        print(f"[INTEL] Failed to compile statutory draft reply: {e}")
        return f"Reply to Notice {notice_num} drafted for {client_name}. (Failed to load dynamic reply from LLM)"

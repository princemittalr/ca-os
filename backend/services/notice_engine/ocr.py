import re
import fitz  # PyMuPDF
from typing import Dict, Any, List

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts raw text page-by-page from a PDF using PyMuPDF (fitz).
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_list = []
        for page in doc:
            text_list.append(page.get_text())
        return "\n".join(text_list)
    except Exception as e:
        print(f"[OCR] PyMuPDF extraction failed: {e}")
        raise e

def generate_mock_ocr_fallback(filename: str) -> str:
    """
    An intelligent mock OCR text generator for images/screenshots.
    Simulates a scanned GST notice text layer.
    """
    fn = filename.lower()
    if "drc" in fn or "drc01" in fn:
        return (
            "OFFICE OF THE DEPUTY COMMISSIONER OF CENTRAL TAX, AUDIT COMMISSIONERATE, MUMBAI\n"
            "FORM GST DRC-01\n"
            "SHOW CAUSE NOTICE UNDER SECTION 73 OF CGST ACT, 2017\n"
            "Reference No: GST/TNV/2026/DRC-01/992\n"
            "Date of Issue: 2026-05-20\n"
            "GSTIN: 27AAACT1234A1Z5\n"
            "To,\n"
            "TechNova Solutions Pvt Ltd,\n"
            "Subject: Discrepancy in Input Tax Credit claimed in GSTR-3B vs GSTR-2B for FY 2025-26\n"
            "Discrepancy Amount: Taxable Value INR 1,02,780.00 with IGST Rs. 18,500.00\n"
            "You are hereby required to file your reply in Form GST DRC-03 within 30 days of this notice.\n"
            "Response Deadline: 2026-06-20\n"
            "Personal Hearing Date: 2026-06-12\n"
            "Statutory Section: Section 73 read with Section 16(4) of Central Goods and Services Tax Act."
        )
    elif "asmt" in fn or "asmt10" in fn:
        return (
            "GOVERNMENT OF UTTAR PRADESH, DEPARTMENT OF STATE TAX\n"
            "FORM GST ASMT-10\n"
            "NOTICE FOR SCRUTINY OF RETURNS UNDER SECTION 61\n"
            "Reference No: GST/SHR/2026/ASMT-10/773\n"
            "Date of Issue: 2026-05-15\n"
            "GSTIN: 09AABCS7890E1Z9\n"
            "To,\n"
            "Sharma Traders,\n"
            "Subject: Scrutiny of returns filed for Q3 FY 2025-26 - Scrutiny of records under Section 61\n"
            "Discrepancies identified: Difference in outward supplies reported in GSTR-1 vs GSTR-3B\n"
            "Taxable value variance Rs 2,50,000.00. Short payment CGST Rs. 22,500.00, SGST Rs. 22,500.00. Total Rs 45,000.00.\n"
            "Please submit your explanation in Form GST ASMT-11 within fifteen days.\n"
            "Response Deadline: 2026-05-30"
        )
    else:
        # Default mock notice text
        return (
            "GOVERNMENT OF INDIA, DEPARTMENT OF REVENUE, CENTRAL BOARD OF INDIRECT TAXES\n"
            "GST COMPLIANCE AUDIT NOTICE UNDER SECTION 65\n"
            "Reference No: GST/GEN/2026/AUDIT-65/12\n"
            "Date of Issue: 2026-05-24\n"
            "GSTIN: 29AABCA5678B1Z3\n"
            "To,\n"
            "Apex Innovations Pvt Ltd,\n"
            "Discrepancy: Mismatch detected in ITC claim threshold values.\n"
            "Tax Amount At Risk: Rs. 92,000.00\n"
            "Please submit audit documents within 15 days.\n"
            "Response Deadline: 2026-06-08\n"
            "Filing Section: Section 65 of CGST Act, 2017."
        )

def parse_deterministic_metadata(text: str) -> Dict[str, Any]:
    """
    Applies standard regex patterns to parse core notice metadata deterministically.
    """
    metadata = {
        "gstin": None,
        "notice_number": None,
        "issuing_authority": None,
        "section_references": [],
        "tax_amount": 0.0,
        "due_date": None,
        "hearing_date": None
    }
    
    # 1. GSTIN (15-character statutory format)
    gstin_match = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b", text)
    if gstin_match:
        metadata["gstin"] = gstin_match.group(0)
        
    # 2. Notice / Reference Number
    notice_match = re.search(r"(?:Reference No|Ref No|Notice No|Reference|Ref):?\s*([A-Z0-9/\-_]+)", text, re.IGNORECASE)
    if notice_match:
        metadata["notice_number"] = notice_match.group(1).strip()
    else:
        # Fallback keyword match
        ref_match = re.search(r"\b(?:GST/[A-Z0-9/\-_]+|DRC-\d+|ASMT-\d+)\b", text)
        if ref_match:
            metadata["notice_number"] = ref_match.group(0)

    # 3. Issuing Authority
    authority_keywords = [
        "DEPUTY COMMISSIONER OF CENTRAL TAX",
        "ASSISTANT COMMISSIONER OF CENTRAL TAX",
        "STATE TAX OFFICER",
        "DEPARTMENT OF STATE TAX",
        "OFFICE OF THE",
        "GOVERNMENT OF UTTAR PRADESH",
        "GOVERNMENT OF INDIA"
    ]
    for kw in authority_keywords:
        if kw in text.upper():
            # Extract line containing keyword
            for line in text.split("\n"):
                if kw in line.upper():
                    metadata["issuing_authority"] = line.strip()
                    break
            if metadata["issuing_authority"]:
                break
                
    if not metadata["issuing_authority"]:
        metadata["issuing_authority"] = "GST Tax Authority Office"

    # 4. Section References (e.g. Section 73, Section 74, Section 16(4), Section 61)
    sections = re.findall(r"\bSection\s*\d+(?:\(\d+\))?(?:\([a-zA-Z]\))?\b", text, re.IGNORECASE)
    if sections:
        # Deduplicate while preserving order
        unique_sects = []
        for s in sections:
            # Standardize styling
            std = s.title()
            if std not in unique_sects:
                unique_sects.append(std)
        metadata["section_references"] = unique_sects

    # 5. Tax Amount (IGST, CGST, SGST, short payment amounts)
    # Match patterns like "Rs. 18,500.00", "INR 1,02,780.00", "Rs 45,000.00"
    amount_matches = re.findall(r"(?:Rs\.?|INR|Rupees|₹)\s*([\d,]+\.\d{2}|[\d,]+)", text, re.IGNORECASE)
    amounts = []
    for am in amount_matches:
        try:
            val = float(am.replace(",", ""))
            amounts.append(val)
        except ValueError:
            continue
            
    if amounts:
        # Filter typical false positives (e.g. very small values or year numbers)
        filtered_amounts = [a for a in amounts if a > 100.0 and a != 2017.0 and a != 2018.0 and a != 2026.0]
        if filtered_amounts:
            metadata["tax_amount"] = max(filtered_amounts) # Pick highest exposure liability amount

    # 6. Response Deadline / Due Date
    # Match dates in format YYYY-MM-DD or DD-MM-YYYY
    date_matches = re.findall(r"\b\d{4}-\d{2}-\d{2}\b|\b\d{2}-\d{2}-\d{4}\b", text)
    deadlines = []
    hearings = []
    
    for dt in date_matches:
        # Check contexts in text around the date
        idx = text.find(dt)
        context = text[max(0, idx-60):min(len(text), idx+60)].lower()
        if "hearing" in context or "personal hearing" in context:
            hearings.append(dt)
        elif "deadline" in context or "due date" in context or "reply within" in context or "within" in context:
            deadlines.append(dt)
            
    if deadlines:
        metadata["due_date"] = deadlines[0]
    elif date_matches:
        metadata["due_date"] = date_matches[-1] # Fallback to latest date
        
    if hearings:
        metadata["hearing_date"] = hearings[0]

    return metadata

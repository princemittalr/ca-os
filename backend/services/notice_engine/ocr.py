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
    raise RuntimeError(
        "Mock OCR fallback is disabled in production."
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

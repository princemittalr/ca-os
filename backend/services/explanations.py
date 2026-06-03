from typing import Dict, Any, List

def infer_root_cause(issue: str, details: Dict[str, Any]) -> Dict[str, Any]:
    """
    Modular, rule-based inference engine that matches GST mismatches to likely causes,
    recommended actions, risk severity levels, confidence ratings, and AI audit paths.
    
    Designed to be easily extended for future Gemini/OpenAI live integrations.
    """
    # Base fallback template
    explanation = {
        "likely_cause": "Unidentified accounting or upload discrepancy.",
        "recommended_action": "Perform a manual visual check of the physical invoice copy.",
        "risk_level": "MEDIUM",
        "confidence": 60.0,
        "explanation_source": "ca_os_inference_engine_v1",
        "inference_rule": "rule_gst_fallback_audit",
        "audit_metadata": {
            "engine_version": "1.0",
            "rule_set": "gst_matching_core",
            "invoice_number": details.get("invoice_number"),
            "gstin": details.get("gstin")
        }
    }
    
    if issue == "MISSING_IN_2B":
        explanation["likely_cause"] = "Vendor may not have filed GSTR-1 or invoice not uploaded."
        explanation["recommended_action"] = "Contact vendor and verify filing status before claiming ITC."
        explanation["risk_level"] = "HIGH"
        explanation["confidence"] = 90.0
        explanation["inference_rule"] = "rule_missing_in_gstr2b_portal"
        
    elif issue == "VALUE_MISMATCH":
        explanation["likely_cause"] = "Taxable value differs between books and GST portal."
        explanation["recommended_action"] = "Verify invoice amendments or accounting entry errors."
        explanation["risk_level"] = "MEDIUM"
        explanation["confidence"] = 95.0
        explanation["inference_rule"] = "rule_taxable_value_tolerance_exceeded"
        
    elif issue == "PARTIAL_MATCH":
        explanation["likely_cause"] = "Invoice numbering format mismatch detected."
        explanation["recommended_action"] = "Review invoice formatting consistency."
        explanation["risk_level"] = "LOW"
        explanation["confidence"] = 85.0
        explanation["inference_rule"] = "rule_invoice_fuzzy_match_format_discrepancy"
        
    elif issue == "MISSING_IN_BOOKS":
        explanation["likely_cause"] = "Invoice present in portal but not recorded in purchase register."
        explanation["recommended_action"] = "Record this invoice in Purchase Books or check for duplication."
        explanation["risk_level"] = "MEDIUM"
        explanation["confidence"] = 92.0
        explanation["inference_rule"] = "rule_missing_in_purchase_register_books"
        
    return explanation

def enrich_mismatches_with_explanations(mismatches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enriches a list of mismatch dictionary objects with root-cause, actionable CA intelligence.
    """
    enriched = []
    for m in mismatches:
        issue = m.get("issue")
        explanation = infer_root_cause(issue, m)
        
        # Merge the matching results with the explanation dict
        enriched_item = {**m, **explanation}
        enriched.append(enriched_item)
        
    return enriched

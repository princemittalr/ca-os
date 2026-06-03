import re
from typing import Dict, List, Any, Tuple
import pandas as pd
from rapidfuzz import fuzz

def normalize_invoice_number(s: str) -> str:
    """
    Normalizes invoice number by stripping non-alphanumeric characters,
    making it uppercase, and removing leading/trailing spaces.
    Example: 'INV-2024-001/A' -> 'INV2024001A'
    """
    if pd.isna(s) or not str(s).strip():
        return ""
    # Strip spaces, dashes, slashes, dots, hashes, backslashes
    return re.sub(r'[\s\-\/\\\.#_]', '', str(s).upper().strip())

def compare_tax_values(val1: float, val2: float, tolerance: float = 1.0) -> bool:
    """
    Compares two taxable values within a given tolerance (default +/- 1 rupee).
    """
    try:
        f_val1 = float(val1)
        f_val2 = float(val2)
        return abs(f_val1 - f_val2) <= tolerance
    except (ValueError, TypeError):
        return False

def fuzzy_invoice_match(inv1: str, inv2: str) -> float:
    """
    Returns string similarity score (0 to 100) using rapidfuzz ratio.
    """
    if not inv1 or not inv2:
        return 0.0
    return float(fuzz.ratio(inv1, inv2))

def is_valid_gstin(gstin: str) -> bool:
    """
    Validates standard Indian 15-character GSTIN regex.
    """
    if pd.isna(gstin) or not str(gstin).strip():
        return False
    gstin_str = str(gstin).upper().strip()
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, gstin_str))

from services.explanations import enrich_mismatches_with_explanations

def reconcile_dataframes(
    df_pr: pd.DataFrame, 
    df_2b: pd.DataFrame, 
    mapping_pr: Dict[str, str], 
    mapping_2b: Dict[str, str], 
    tolerance: float = 1.0
) -> Dict[str, Any]:
    """
    Decoupled reconciliation logic. Matches df_pr (Purchase Register) and df_2b (GSTR-2B)
    using GSTIN, Invoice Number, and Taxable Value.
    
    Returns standard JSON structure:
    {
      "summary": { "matched": x, "missing_in_2b": y, "missing_in_books": z, "value_mismatch": w, "partial_match": p },
      "mismatches": [ { "invoice_number": "", "gstin": "", "issue": "", "reason": "" } ]
    }
    """
    # 1. Validation checks
    # A. Empty files
    if df_pr.empty:
        raise ValueError("Purchase Register file contains no data rows.")
    if df_2b.empty:
        raise ValueError("GSTR-2B file contains no data rows.")
        
    # B. Missing mapping keys & missing columns in DataFrame
    required_keys = ["gstin", "invoice_number", "taxable_value"]
    for key in required_keys:
        pr_col = mapping_pr.get(key)
        if not pr_col:
            raise ValueError(f"Could not automatically detect the '{key}' column in Purchase Register file. Please check column headers.")
        if pr_col not in df_pr.columns:
            raise ValueError(f"Identified column '{pr_col}' for '{key}' is missing in Purchase Register DataFrame.")
            
        twob_col = mapping_2b.get(key)
        if not twob_col:
            raise ValueError(f"Could not automatically detect the '{key}' column in GSTR-2B file. Please check column headers.")
        if twob_col not in df_2b.columns:
            raise ValueError(f"Identified column '{twob_col}' for '{key}' is missing in GSTR-2B DataFrame.")
            
    # C. Valid GSTIN presence check
    pr_gstin_col = mapping_pr["gstin"]
    twob_gstin_col = mapping_2b["gstin"]
    
    has_valid_pr = any(is_valid_gstin(val) for val in df_pr[pr_gstin_col].dropna())
    has_valid_2b = any(is_valid_gstin(val) for val in df_2b[twob_gstin_col].dropna())
    
    if not has_valid_pr:
        raise ValueError("No valid standard 15-character Indian GSTINs detected in the Purchase Register. Please check the supplier column.")
    if not has_valid_2b:
        raise ValueError("No valid standard 15-character Indian GSTINs detected in the GSTR-2B. Please check the supplier column.")

    # 2. Matching Engine Implementation
    # Prepare standard keys
    pr_inv_col = mapping_pr["invoice_number"]
    pr_val_col = mapping_pr["taxable_value"]
    
    twob_inv_col = mapping_2b["invoice_number"]
    twob_val_col = mapping_2b["taxable_value"]
    
    # Build a lookup from GSTR-2B rows grouped by normalized GSTIN
    gstr2b_lookup = {}
    for idx, row in df_2b.iterrows():
        raw_gstin = str(row[twob_gstin_col]).upper().strip() if pd.notna(row[twob_gstin_col]) else ""
        raw_inv = str(row[twob_inv_col]).strip() if pd.notna(row[twob_inv_col]) else ""
        
        try:
            raw_val = float(row[twob_val_col]) if pd.notna(row[twob_val_col]) else 0.0
        except (ValueError, TypeError):
            raw_val = 0.0
            
        norm_inv = normalize_invoice_number(raw_inv)
        if not raw_gstin or not norm_inv:
            continue
            
        if raw_gstin not in gstr2b_lookup:
            gstr2b_lookup[raw_gstin] = []
            
        gstr2b_lookup[raw_gstin].append({
            "invoice_number": raw_inv,
            "norm_invoice": norm_inv,
            "taxable_value": raw_val,
            "matched": False
        })

    mismatches = []
    matches = []
    summary = {
        "matched": 0,
        "missing_in_2b": 0,
        "missing_in_books": 0,
        "value_mismatch": 0,
        "partial_match": 0
    }
    
    # Track matched keys in PR to identify duplicates or extra matches if necessary
    # Match PR (Purchase Register / Books) against GSTR-2B
    for idx, row in df_pr.iterrows():
        raw_gstin = str(row[pr_gstin_col]).upper().strip() if pd.notna(row[pr_gstin_col]) else ""
        raw_inv = str(row[pr_inv_col]).strip() if pd.notna(row[pr_inv_col]) else ""
        
        try:
            raw_val = float(row[pr_val_col]) if pd.notna(row[pr_val_col]) else 0.0
        except (ValueError, TypeError):
            raw_val = 0.0
            
        norm_inv = normalize_invoice_number(raw_inv)
        if not raw_gstin or not norm_inv:
            continue
            
        # Case A: GSTIN not present at all in GSTR-2B
        if raw_gstin not in gstr2b_lookup:
            summary["missing_in_2b"] += 1
            mismatches.append({
                "invoice_number": raw_inv,
                "gstin": raw_gstin,
                "taxable_value": raw_val,
                "issue": "MISSING_IN_2B",
                "reason": "Invoice present in Books, but supplier GSTIN is entirely missing in GSTR-2B."
            })
            continue
            
        # Case B: GSTIN exists, let's seek invoice matches
        candidates = gstr2b_lookup[raw_gstin]
        
        # 1. Try Strict Match (exact normalized invoice number)
        exact_match = None
        for cand in candidates:
            if not cand["matched"] and cand["norm_invoice"] == norm_inv:
                exact_match = cand
                break
                
        if exact_match:
            exact_match["matched"] = True
            diff = abs(raw_val - exact_match["taxable_value"])
            if diff <= tolerance:
                # Perfect Match
                summary["matched"] += 1
                matches.append({
                    "invoice_number": raw_inv,
                    "gstin": raw_gstin,
                    "taxable_value": raw_val,
                    "issue": "MATCHED",
                    "reason": "Invoice matched strictly, taxable values are aligned."
                })
            else:
                # Value Mismatch on Strict Invoice Match
                summary["value_mismatch"] += 1
                mismatches.append({
                    "invoice_number": raw_inv,
                    "gstin": raw_gstin,
                    "taxable_value": raw_val,
                    "issue": "VALUE_MISMATCH",
                    "reason": f"Invoice number matched strictly, but tax value differs: Books = ₹{raw_val:,.2f}, GSTR-2B = ₹{exact_match['taxable_value']:,.2f} (Diff: ₹{diff:,.2f})."
                })
            continue
            
        # 2. Try Fuzzy Match of Invoice Number (under same GSTIN)
        best_score = 0.0
        best_cand = None
        
        for cand in candidates:
            if not cand["matched"]:
                score = fuzzy_invoice_match(norm_inv, cand["norm_invoice"])
                if score > best_score:
                    best_score = score
                    best_cand = cand
                    
        # Apply 80% threshold for fuzzy match
        if best_score >= 80.0 and best_cand:
            best_cand["matched"] = True
            diff = abs(raw_val - best_cand["taxable_value"])
            
            if diff <= tolerance:
                # Partial Match (Invoices fuzzy matched, values aligned)
                summary["partial_match"] += 1
                mismatches.append({
                    "invoice_number": raw_inv,
                    "gstin": raw_gstin,
                    "taxable_value": raw_val,
                    "issue": "PARTIAL_MATCH",
                    "reason": f"Fuzzy matched invoice number with '{best_cand['invoice_number']}' (Score: {best_score:.1f}%). Tax values match."
                })
            else:
                # Value Mismatch on a Fuzzy Invoice Match
                summary["value_mismatch"] += 1
                mismatches.append({
                    "invoice_number": raw_inv,
                    "gstin": raw_gstin,
                    "taxable_value": raw_val,
                    "issue": "VALUE_MISMATCH",
                    "reason": f"Fuzzy matched with '{best_cand['invoice_number']}' (Score: {best_score:.1f}%), but value differs: Books = ₹{raw_val:,.2f}, GSTR-2B = ₹{best_cand['taxable_value']:,.2f}."
                })
            continue
            
        # 3. No match at all under this GSTIN
        summary["missing_in_2b"] += 1
        mismatches.append({
            "invoice_number": raw_inv,
            "gstin": raw_gstin,
            "taxable_value": raw_val,
            "issue": "MISSING_IN_2B",
            "reason": "Invoice present in Books, but absent in GSTR-2B under this supplier."
        })

    # Case C: Find missing in Books (in GSTR-2B but unmatched)
    for gstin, candidates in gstr2b_lookup.items():
        for cand in candidates:
            if not cand["matched"]:
                summary["missing_in_books"] += 1
                mismatches.append({
                    "invoice_number": cand["invoice_number"],
                    "gstin": gstin,
                    "taxable_value": cand["taxable_value"],
                    "issue": "MISSING_IN_BOOKS",
                    "reason": f"Invoice present in GSTR-2B, but entirely missing in Purchase Books (Value: ₹{cand['taxable_value']:,.2f})."
                })

    enriched_mismatches = enrich_mismatches_with_explanations(mismatches)
    enriched_matches = enrich_mismatches_with_explanations(matches)
    return {
        "summary": summary,
        "mismatches": enriched_mismatches,
        "matches": enriched_matches
    }


import re
from typing import List, Dict, Any, Tuple
from rapidfuzz import fuzz

def normalize_invoice(s: str) -> str:
    """Normalize invoice number by removing spaces, dashes, slashes, dots, hashes and making uppercase."""
    if not s:
        return ""
    return re.sub(r'[\s\-\/\\\.#]', '', str(s).upper().strip())

def normalize_gstin(s: str) -> str:
    if not s:
        return ""
    return str(s).upper().strip()

def run_reconciliation(invoices_2b: List[Dict[str, Any]], invoices_pr: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Core reconciliation logic matching GSTR-2B with Purchase Register (Books).
    
    invoices_2b: List of dicts representing 2B data
    invoices_pr: List of dicts representing PR (Books) data
    """
    
    # Step 2: Build lookup from 2B invoices
    lookup_2b = {}
    for inv in invoices_2b:
        gstin = normalize_gstin(inv.get('supplier_gstin', ''))
        inv_no = normalize_invoice(inv.get('invoice_number', ''))
        if gstin and inv_no:
            key = f"{gstin}||{inv_no}"
            lookup_2b[key] = inv

    results = []
    matched_2b_keys = set()
    
    total_invoices = len(invoices_pr)
    matched_count = 0
    mismatch_count = 0
    missing_in_2b_count = 0
    itc_at_risk = 0.0
    itc_protected = 0.0

    # Step 3: Match PR against 2B
    for pr in invoices_pr:
        gstin = normalize_gstin(pr.get('supplier_gstin', ''))
        inv_no = normalize_invoice(pr.get('invoice_number', ''))
        key = f"{gstin}||{inv_no}"
        
        pr_taxable = float(pr.get('taxable_value', 0.0))
        pr_itc = pr_taxable * 0.18  # Assuming 18% standard rate for simplification
        
        result_row = {
            'supplier_gstin': pr.get('supplier_gstin'),
            'invoice_number': pr.get('invoice_number'),
            'invoice_date': pr.get('invoice_date'),
            'taxable_value_pr': pr_taxable,
            'taxable_value_2b': 0.0,
            'difference': 0.0,
            'status': '',
            'suggested_action': '',
        }
        
        # EXACT MATCH
        if key in lookup_2b:
            b2b = lookup_2b[key]
            b2b_taxable = float(b2b.get('taxable_value', 0.0))
            diff = abs(pr_taxable - b2b_taxable)
            
            result_row['taxable_value_2b'] = b2b_taxable
            result_row['difference'] = diff
            
            if diff <= 1.0:
                result_row['status'] = "matched"
                result_row['suggested_action'] = "None required"
                matched_count += 1
                itc_protected += pr_itc
            else:
                result_row['status'] = "value_mismatch"
                result_row['suggested_action'] = "Review invoice value difference"
                mismatch_count += 1
                itc_at_risk += pr_itc
                
            matched_2b_keys.add(key)
            results.append(result_row)
            continue
            
        # FUZZY MATCH
        candidates = [i for k, i in lookup_2b.items() if k.startswith(f"{gstin}||") and k not in matched_2b_keys]
        matched_fuzzy = False
        
        if candidates:
            best_score = 0
            best_candidate = None
            best_key = None
            
            for candidate in candidates:
                cand_inv_no = normalize_invoice(candidate.get('invoice_number', ''))
                score = fuzz.ratio(inv_no, cand_inv_no)
                if score > best_score:
                    best_score = score
                    best_candidate = candidate
                    best_key = f"{gstin}||{cand_inv_no}"
            
            if best_score >= 85 and best_candidate:
                b2b_taxable = float(best_candidate.get('taxable_value', 0.0))
                diff = abs(pr_taxable - b2b_taxable)
                
                result_row['taxable_value_2b'] = b2b_taxable
                result_row['difference'] = diff
                result_row['status'] = "value_mismatch" if diff > 1.0 else "matched" 
                # Even if amounts match, if it was a fuzzy match, we might want to flag it, but let's stick to value_mismatch for diffs
                if diff <= 1.0:
                    result_row['status'] = "matched"
                    matched_count += 1
                    itc_protected += pr_itc
                else:
                    mismatch_count += 1
                    itc_at_risk += pr_itc
                    
                result_row['suggested_action'] = f"Fuzzy matched with {best_candidate.get('invoice_number')} (Score: {best_score:.1f})"
                
                matched_2b_keys.add(best_key)
                matched_fuzzy = True
                results.append(result_row)
                
        if not matched_fuzzy:
            # NO MATCH
            result_row['status'] = "missing_in_2b"
            result_row['difference'] = pr_taxable
            result_row['suggested_action'] = "Follow up with supplier to file GSTR-1"
            missing_in_2b_count += 1
            itc_at_risk += pr_itc
            results.append(result_row)

    # Step 4: Find missing in books
    missing_in_books_count = 0
    for key, inv in lookup_2b.items():
        if key not in matched_2b_keys:
            b2b_taxable = float(inv.get('taxable_value', 0.0))
            result_row = {
                'supplier_gstin': inv.get('supplier_gstin'),
                'invoice_number': inv.get('invoice_number'),
                'invoice_date': inv.get('invoice_date'),
                'taxable_value_pr': 0.0,
                'taxable_value_2b': b2b_taxable,
                'difference': b2b_taxable,
                'status': "missing_in_books",
                'suggested_action': "Record invoice in Purchase Register",
            }
            results.append(result_row)
            missing_in_books_count += 1
            total_invoices += 1  # Since it's in 2B but not PR, it adds to total processed

    # Summary
    summary = {
        'total_invoices': total_invoices,
        'matched_count': matched_count,
        'mismatch_count': mismatch_count,
        'missing_in_2b_count': missing_in_2b_count,
        'missing_in_books_count': missing_in_books_count,
        'itc_at_risk': itc_at_risk,
        'itc_protected': itc_protected
    }

    return results, summary

import io
import pandas as pd
from typing import Dict, List, Optional, Any

def parse_file_to_dataframe(contents: bytes, filename: str) -> pd.DataFrame:
    """
    Parses a file's raw bytes (Excel or CSV) in-memory into a pandas DataFrame.
    """
    fn_lower = filename.lower()
    
    if fn_lower.endswith('.csv'):
        # For CSV files, read from bytes
        return pd.read_csv(io.BytesIO(contents))
    elif fn_lower.endswith(('.xlsx', '.xls')):
        # For Excel files, read using openpyxl or xlrd
        return pd.read_excel(io.BytesIO(contents))
    else:
        raise ValueError("Unsupported file format. Only Excel (.xlsx, .xls) and CSV (.csv) files are supported.")

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalizes DataFrame column names by stripping leading/trailing whitespace.
    """
    df.columns = [str(col).strip() for col in df.columns]
    return df

def detect_gst_fields(columns: List[str]) -> Dict[str, Optional[str]]:
    """
    Intelligently detects GST-specific fields from the list of columns.
    Looks for gstin, invoice_number, and taxable_value using common naming patterns.
    """
    detected = {
        "gstin": None,
        "invoice_number": None,
        "taxable_value": None
    }
    
    # Common variations of column headers for matching (lowercased, spaces stripped)
    gstin_patterns = ["gstin", "suppliergstin", "suppliergst", "recipientgstin", "gstin/uin", "supplier'sgstin"]
    invoice_no_patterns = ["invoicenumber", "invoiceno", "invnumber", "invno", "documentnumber", "docno", "docnumber", "voucher", "voucherno", "vouchernumber"]
    taxable_val_patterns = ["taxablevalue", "taxableamount", "taxableamt", "assessablevalue", "taxablevalue(₹)", "taxablevalue(rs)", "taxablevalue(rs.)"]

    for col in columns:
        col_clean = col.lower().replace(" ", "").replace("_", "").replace("-", "").replace(".", "")
        
        # 1. GSTIN detection
        if not detected["gstin"]:
            # Check if any pattern is in the cleaned column name or vice-versa
            if any(pat in col_clean for pat in gstin_patterns) or col_clean == "gst":
                detected["gstin"] = col
                continue
                
        # 2. Invoice number detection
        if not detected["invoice_number"]:
            if any(pat in col_clean for pat in invoice_no_patterns):
                detected["invoice_number"] = col
                continue
                
        # 3. Taxable value detection
        if not detected["taxable_value"]:
            if any(pat in col_clean for pat in taxable_val_patterns) or "taxable" in col_clean:
                detected["taxable_value"] = col
                continue
                
    return detected

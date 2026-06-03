import google.generativeai as genai
from typing import Dict, Any, List
import os
import asyncio

# Configure Gemini
# Using a mock API key behavior for now since real key will be provided via env later
api_key = os.environ.get("GEMINI_API_KEY", "mock_key")
if api_key != "mock_key":
    genai.configure(api_key=api_key)

async def generate_insight(row: Dict[str, Any]) -> str:
    """Generate 2-sentence AI insight for a single mismatch row."""
    if api_key == "mock_key":
        return "AI analysis unavailable (Mock Key). Please review value difference."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are a GST expert in India. Analyze this invoice mismatch and provide a 2-sentence insight.
        Sentence 1: The likely cause. Sentence 2: The next step. Be specific.
        
        Status: {row.get('status')}
        GSTIN: {row.get('supplier_gstin')}
        Invoice: {row.get('invoice_number')}
        2B Value: {row.get('taxable_value_2b')}
        Books Value: {row.get('taxable_value_pr')}
        Diff: {row.get('difference')}
        """
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating insight: {e}")
        return "Insight generation failed."

async def generate_insights_for_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process top 10 rows with highest difference to generate AI insights."""
    # Filter rows with issues
    issue_rows = [r for r in rows if r['status'] in ['value_mismatch', 'missing_in_2b']]
    
    # Sort by difference descending and take top 10
    top_issues = sorted(issue_rows, key=lambda x: x.get('difference', 0), reverse=True)[:10]
    
    # For now, we will process sequentially to avoid rate limits, or we could use asyncio.gather
    for row in top_issues:
        row['ai_insight'] = await generate_insight(row)
        
    return rows

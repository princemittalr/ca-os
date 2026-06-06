from io import BytesIO
from typing import Dict, List, Any
import datetime

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Predefined professional communication templates conforming to CGST rules
TEMPLATES = {
    "MISSING_IN_2B": {
        "subject": "URGENT: GSTR-2B Invoice Mismatch - Action Required for ITC Claim - {vendor_name}",
        "priority": "HIGH",
        "email_body": (
            "Dear Accounts Team at {vendor_name},\n\n"
            "We are writing on behalf of our client to notify you of a discrepancy identified during our monthly "
            "automated GST reconciliation for the filing period {period}.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Invoice Number: {invoice_number}\n"
            "Taxable Value: {taxable_value}\n"
            "Observation: This invoice is recorded in our purchase register but is entirely MISSING in our GSTR-2B "
            "portal records, indicating that it has not been uploaded in your GSTR-1 return yet.\n\n"
            "COMPLIANCE & ITC IMPLICATIONS:\n"
            "Under Section 16(2)(aa) of the CGST Act 2017, we are legally barred from claiming Input Tax Credit (ITC) "
            "on this invoice until you upload it in your GSTR-1. This is causing significant working capital blockage "
            "and potential tax interest liabilities for our firm.\n\n"
            "REQUIRED ACTION:\n"
            "Kindly upload this invoice in your upcoming GSTR-1 return immediately, or file an amendment if required, "
            "so that it reflects in our GSTR-2B. We request you to resolve this on priority before {recommended_deadline}.\n\n"
            "Please confirm once uploaded with the filing ARN.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        )
    },
    "VALUE_MISMATCH": {
        "subject": "NOTICE: GST Taxable Value Discrepancy - Action Required - {vendor_name}",
        "priority": "MEDIUM",
        "email_body": (
            "Dear Accounts Team at {vendor_name},\n\n"
            "We are writing on behalf of our client to report a taxable value mismatch detected during our GST portal "
            "reconciliation for the filing period {period}.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Invoice Number: {invoice_number}\n"
            "Our Books Value: {taxable_value}\n"
            "Observation: There is a discrepancy between the invoice amount recorded in our purchase register and the "
            "corresponding value reported by you in the GSTR-1 portal.\n\n"
            "COMPLIANCE & ITC IMPLICATIONS:\n"
            "Mismatches in taxable values trigger system warnings under GSTR-3B matching, risking credit reversals and "
            "GST audit notices from the tax department.\n\n"
            "REQUIRED ACTION:\n"
            "Please verify this transaction against your physical invoice copies and accounting records. If there has been "
            "a booking error on your side, kindly amend the invoice in your GSTR-1 or issue an appropriate Debit/Credit "
            "Note by {recommended_deadline}.\n\n"
            "Thank you for your prompt cooperation.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        )
    },
    "PARTIAL_MATCH": {
        "subject": "INQUIRY: Invoice Numbering Format Discrepancy - {vendor_name}",
        "priority": "LOW",
        "email_body": (
            "Dear Accounts Team at {vendor_name},\n\n"
            "During our routine monthly GST reconciliation for {period}, we observed an invoice numbering format variance.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Our Purchase Books: {invoice_number}\n"
            "Taxable Value: {taxable_value}\n"
            "Observation: The invoice numbering format mismatches with GSTR-2B portal uploads (e.g. slashes vs dashes or prefix differences).\n\n"
            "IMPLICATIONS:\n"
            "Although the value matches, numbering discrepancies prevent automated ledger clearance, resulting in manual audit overhead.\n\n"
            "REQUIRED ACTION:\n"
            "Kindly check the formatting in your billing system to ensure invoice identifiers remain standardized in future filings. "
            "Please confirm if the numbers belong to the same transaction.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        )
    },
    "GSTR1_NOT_FILED": {
        "subject": "URGENT: GSTR-1 Filing Default - Input Tax Credit Blocked - {vendor_name}",
        "priority": "HIGH",
        "email_body": (
            "Dear Management at {vendor_name},\n\n"
            "We are writing on behalf of our client to express concern regarding your GSTR-1 filing status for the period {period}.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Filing GSTIN: {gstin}\n"
            "Filing Period: {period}\n"
            "Observation: Our reconciliation dashboard indicates that you have defaulted on your GSTR-1 portal return filing.\n\n"
            "COMPLIANCE & ITC IMPLICATIONS:\n"
            "Your delay in filing GSTR-1 directly blocks our ability to claim legitimate Input Tax Credit (ITC) for the transactions "
            "completed in this period. Under CGST rules, we cannot avail credit unless you file your returns.\n\n"
            "REQUIRED ACTION:\n"
            "Kindly file your GSTR-1 return for the period {period} immediately and clear any outstanding tax liabilities. We request "
            "you to complete the filing by {recommended_deadline} to prevent us from withholding further vendor payments.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        )
    },
    "GSTIN_MISMATCH": {
        "subject": "CORRECTION: Supplier GSTIN Record Discrepancy - {vendor_name}",
        "priority": "LOW",
        "email_body": (
            "Dear Accounts Team at {vendor_name},\n\n"
            "During our monthly auditor compliance check for {period}, we observed a GSTIN mismatch.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Registered Name: {vendor_name}\n"
            "Reported GSTIN: {gstin}\n"
            "Observation: The GSTIN recorded in our master records does not align with the portal tax filings.\n\n"
            "REQUIRED ACTION:\n"
            "Kindly verify and send us your correct 15-character standard GST Registration certificate (GST REG-06) "
            "before {recommended_deadline} so we can update our ERP master data.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        )
    }
}

# In-memory communication store pre-populated with detailed CA follow-up workflows
MOCK_COMMUNICATIONS = [
    {
        "id": "comm-1",
        "client_id": "client-1",
        "vendor_name": "Sharma Traders",
        "gstin": "09AABCS7890E1Z9",
        "issue": "MISSING_IN_2B",
        "subject": "URGENT: GSTR-2B Invoice Mismatch - Action Required for ITC Claim - Sharma Traders",
        "email_body": (
            "Dear Accounts Team at Sharma Traders,\n\n"
            "We are writing on behalf of our client to notify you of a discrepancy identified during our monthly "
            "automated GST reconciliation for the filing period March 2024.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Invoice Number: SH/2024/77\n"
            "Taxable Value: ₹185,000\n"
            "Observation: This invoice is recorded in our purchase register but is entirely MISSING in our GSTR-2B "
            "portal records, indicating that it has not been uploaded in your GSTR-1 return yet.\n\n"
            "COMPLIANCE & ITC IMPLICATIONS:\n"
            "Under Section 16(2)(aa) of the CGST Act 2017, we are legally barred from claiming Input Tax Credit (ITC) "
            "on this invoice until you upload it in your GSTR-1. This is causing significant working capital blockage "
            "and potential tax interest liabilities for our firm.\n\n"
            "REQUIRED ACTION:\n"
            "Kindly upload this invoice in your upcoming GSTR-1 return immediately, or file an amendment if required, "
            "so that it reflects in our GSTR-2B. We request you to resolve this on priority before 2026-06-10.\n\n"
            "Please confirm once uploaded with the filing ARN.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        ),
        "priority": "HIGH",
        "recommended_deadline": "2026-06-10",
        "status": "Drafted",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    },
    {
        "id": "comm-2",
        "client_id": "client-1",
        "vendor_name": "Vertex Solutions Pvt Ltd",
        "gstin": "29AABCA5678B1Z3",
        "issue": "VALUE_MISMATCH",
        "subject": "NOTICE: GST Taxable Value Discrepancy - Action Required - Vertex Solutions Pvt Ltd",
        "email_body": (
            "Dear Accounts Team at Vertex Solutions Pvt Ltd,\n\n"
            "We are writing on behalf of our client to report a taxable value mismatch detected during our GST portal "
            "reconciliation for the filing period March 2024.\n\n"
            "RECONCILIATION OBSERVATIONS:\n"
            "Invoice Number: IN-34305\n"
            "Our Books Value: ₹215,500\n"
            "Observation: There is a discrepancy between the invoice amount recorded in our purchase register and the "
            "corresponding value reported by you in the GSTR-1 portal.\n\n"
            "COMPLIANCE & ITC IMPLICATIONS:\n"
            "Mismatches in taxable values trigger system warnings under GSTR-3B matching, risking credit reversals and "
            "GST audit notices from the tax department.\n\n"
            "REQUIRED ACTION:\n"
            "Please verify this transaction against your physical invoice copies and accounting records. If there has been "
            "a booking error on your side, kindly amend the invoice in your GSTR-1 or issue an appropriate Debit/Credit "
            "Note by 2026-06-12.\n\n"
            "Thank you for your prompt cooperation.\n\n"
            "Regards,\n"
            "Audit & Compliance Team\n"
            "Reckon CA Operating Workspace Partner"
        ),
        "priority": "MEDIUM",
        "recommended_deadline": "2026-06-12",
        "status": "Sent",
        "created_at": (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M")
    }
]

def generate_draft(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core outreach drafting compiler. Compiles templates professionally based on input mismatch rows.
    """
    issue_code = data.get("issue", "MISSING_IN_2B").upper()
    vendor_name = data.get("vendor_name") or "Supplier Firm"
    gstin = data.get("gstin") or "—"
    inv_no = data.get("invoice_number") or "—"
    tax_val = float(data.get("taxable_value", 0.0))
    formatted_tax = f"₹{tax_val:,.2f}"
    
    deadline = data.get("recommended_deadline") or (datetime.date.today() + datetime.timedelta(days=10)).strftime("%Y-%m-%d")
    period = data.get("filing_period") or "March 2024"
    
    template_config = TEMPLATES.get(issue_code, TEMPLATES["MISSING_IN_2B"])
    
    # Compile
    subject = template_config["subject"].format(vendor_name=vendor_name)
    body = template_config["email_body"].format(
        vendor_name=vendor_name,
        gstin=gstin,
        invoice_number=inv_no,
        taxable_value=formatted_tax,
        period=period,
        recommended_deadline=deadline
    )
    
    new_draft = {
        "id": f"comm-{len(MOCK_COMMUNICATIONS) + 1}",
        "client_id": data.get("client_id") or "client-1",
        "vendor_name": vendor_name,
        "gstin": gstin,
        "issue": issue_code,
        "subject": subject,
        "email_body": body,
        "priority": template_config["priority"],
        "recommended_deadline": deadline,
        "status": "Drafted",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    
    MOCK_COMMUNICATIONS.append(new_draft)
    return new_draft

def get_communications_by_client(client_id: str) -> List[Dict[str, Any]]:
    """Retrieve all outreach communication drafts scoped to a specific client."""
    return [c for c in MOCK_COMMUNICATIONS if c["client_id"] == client_id]

def update_communication_status(comm_id: str, new_status: str) -> bool:
    """Updates the status workflow indicator for a communication draft."""
    for c in MOCK_COMMUNICATIONS:
        if c["id"] == comm_id:
            c["status"] = new_status
            return True
    return False


# ----------------------------------------------------
# REPORTLAB OFFICIAL OUTREACH NOTICE PDF COMPILER
# ----------------------------------------------------
class NoticeCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_page_layouts(page_count)
            super().showPage()
        super().save()

    def draw_page_layouts(self, total_pages):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#4B5563"))
        
        # Header (Top of Page)
        self.drawString(36, 756, "OFFICIAL TAX COMPLIANCE LEGISLATIVE NOTICE")
        self.setStrokeColor(colors.HexColor("#D1D5DB"))
        self.setLineWidth(0.5)
        self.line(36, 748, 576, 748)
        
        # Footer (Bottom of Page)
        self.line(36, 48, 576, 48)
        self.drawString(36, 36, "CA-OS WORKSPACE AUDIT COMPLIANCE OUTREACH PROGRAM")
        self.drawRightString(576, 36, f"Letter Page {self._pageNumber} of {total_pages}")
        self.restoreState()


def compile_notice_letter_pdf(notice_data: Dict[str, Any]) -> bytes:
    """
    Compiles ReportLab PDF for official vendor mismatch notices.
    """
    pdf_stream = BytesIO()
    doc = SimpleDocTemplate(
        pdf_stream,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'NoticeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1B365D'),
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'NoticeSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#FF7A45'),
        textTransform='uppercase',
        spaceAfter=12
    )
    
    body_style = ParagraphStyle(
        'NoticeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1F2937')
    )
    
    grid_lbl = ParagraphStyle('GridLbl', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#4B5563'))
    grid_val = ParagraphStyle('GridVal', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.HexColor('#111827'))

    story = []
    
    story.append(Paragraph("TAX COMPLIANCE DEMAND", subtitle_style))
    story.append(Paragraph("Compliance Outreach Notice Letter", title_style))
    story.append(Spacer(1, 10))
    
    # Metadata Grid
    v_name = notice_data.get("vendor_name") or "Recipient Vendor"
    gstin = notice_data.get("gstin") or "—"
    issue = notice_data.get("issue", "MISSING_IN_2B").replace("_", " ")
    priority = notice_data.get("priority", "HIGH")
    deadline = notice_data.get("recommended_deadline") or "—"
    
    meta_rows = [
        [
            Paragraph("RECIPIENT VENDOR BUSINESS", grid_lbl),
            Paragraph("RECIPIENT GSTIN JURISDICTION", grid_lbl),
            Paragraph("ISSUE SEVERITY LEVEL", grid_lbl)
        ],
        [
            Paragraph(v_name, grid_val),
            Paragraph(gstin, grid_val),
            Paragraph(f"<font color='#C5221F'><b>{priority}</b></font>" if priority == "HIGH" else f"<b>{priority}</b>", grid_val)
        ],
        [
            Paragraph("DISCREPANCY VARIANCE", grid_lbl),
            Paragraph("DEMANDED RESOLVE DEADLINE", grid_lbl),
            Paragraph("VERIFICATION SYSTEM", grid_lbl)
        ],
        [
            Paragraph(issue, grid_val),
            Paragraph(deadline, grid_val),
            Paragraph("CA-OS Audit Automations", grid_val)
        ]
    ]
    
    meta_table = Table(meta_rows, colWidths=[200, 180, 160])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW', (0,1), (-1,1), 0.5, colors.HexColor('#E5E7EB')),
        ('BOTTOMPADDING', (0,1), (-1,1), 6),
        ('TOPPADDING', (0,2), (-1,2), 6),
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # Main Body text formatted
    body_text = notice_data.get("email_body") or ""
    # Convert newlines to breaks
    formatted_body = body_text.replace("\n", "<br/>")
    
    story.append(Paragraph(formatted_body, body_style))
    story.append(Spacer(1, 25))
    
    # Legal auditor footer seals (KeepTogether)
    seal_rows = [
        [
            Paragraph("<b>LEGISLATIVE NOTE & CGST JURISDICTION RULES</b><br/>"
                      "This compliance letter serves as an official request from the principal auditor "
                      "to verify GSTR registration records and portal uploads. Discrepancies left unresolved "
                      "will block input tax credit claims under Section 16(2)(aa) of the CGST Act 2017.", ParagraphStyle('SealN', parent=body_style, fontSize=7, leading=9, textColor=colors.HexColor('#4B5563'))),
            Paragraph("<b>AUDITOR PRINCIPAL CERTIFICATE</b><br/><br/>"
                      "Authorized CA Signatory:<br/>"
                      "____________________________", ParagraphStyle('SealS', parent=body_style, fontSize=7, leading=9))
        ]
    ]
    
    seal_table = Table(seal_rows, colWidths=[360, 180])
    seal_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('LINEAFTER', (0,0), (0,0), 0.5, colors.HexColor('#E5E7EB'))
    ]))
    
    story.append(KeepTogether([seal_table]))
    
    # Compile
    doc.build(story, canvasmaker=NoticeCanvas)
    pdf_stream.seek(0)
    return pdf_stream.getvalue()

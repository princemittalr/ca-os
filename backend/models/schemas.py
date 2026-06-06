from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# --- User Schemas ---
class UserBase(BaseModel):
    full_name: Optional[str] = None
    firm_name: Optional[str] = None
    icai_number: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    designation: Optional[str] = None

class UserCreate(UserBase):
    id: str  # from Supabase auth

class UserResponse(UserBase):
    id: str
    onboarding_complete: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Client Schemas ---
class ClientBase(BaseModel):
    business_name: str
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    gstin: str
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    filing_type: Optional[str] = None
    filing_frequency: Optional[str] = "monthly"  # monthly, quarterly, annual
    assigned_manager: Optional[str] = None

class ClientCreate(ClientBase):
    
    @field_validator('gstin')
    def gstin_must_be_valid(cls, v):
        from services.input_validator import validate_gstin
        return validate_gstin(v)

    @field_validator('business_name')
    def name_must_be_clean(cls, v):
        from services.input_validator import sanitize_string
        return sanitize_string(v, max_length=255)

class ClientUpdate(BaseModel):
    business_name: Optional[str] = None
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    filing_type: Optional[str] = None
    filing_frequency: Optional[str] = None
    assigned_manager: Optional[str] = None

class ClientResponse(ClientBase):
    id: str
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Reconciliation Schemas ---
class ReconciliationBase(BaseModel):
    month: str

class ReconciliationCreate(ReconciliationBase):
    client_id: str

class ReconciliationResponse(ReconciliationBase):
    id: str
    client_id: str
    status: str
    total_invoices: int
    matched_count: int
    mismatch_count: int
    missing_in_2b_count: int
    missing_in_books_count: int
    itc_at_risk: float
    itc_protected: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Recon Row Schemas ---
class ReconRowBase(BaseModel):
    supplier_gstin: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    taxable_value_2b: Optional[float] = 0.0
    taxable_value_pr: Optional[float] = 0.0
    igst_2b: Optional[float] = 0.0
    igst_pr: Optional[float] = 0.0
    cgst_2b: Optional[float] = 0.0
    cgst_pr: Optional[float] = 0.0
    sgst_2b: Optional[float] = 0.0
    sgst_pr: Optional[float] = 0.0
    difference: Optional[float] = 0.0
    status: str
    suggested_action: Optional[str] = None
    ai_insight: Optional[str] = None

class ReconRowCreate(ReconRowBase):
    reconciliation_id: str

class ReconRowResponse(ReconRowBase):
    id: str
    reconciliation_id: str
    is_reviewed: bool
    is_flagged: bool
    
    class Config:
        from_attributes = True

# --- Compliance Schemas ---
class ComplianceTaskBase(BaseModel):
    filing_type: str
    period: str
    due_date: date
    status: str = 'pending'
    penalty_risk: float = 0.0
    notes: Optional[str] = None

class ComplianceTaskCreate(ComplianceTaskBase):
    client_id: str

class ComplianceTaskResponse(ComplianceTaskBase):
    id: str
    client_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    action_url: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Support Ticket Schemas ---
class SupportTicketBase(BaseModel):
    category: str
    subject: str
    description: str
    priority: str = 'medium'

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketResponse(SupportTicketBase):
    id: str
    user_id: str
    ticket_number: str
    status: str
    created_at: datetime
    agent: Optional[str] = None
    timeline: Optional[List[Dict[str, Any]]] = []
    replies: Optional[List[Dict[str, Any]]] = []
    
    class Config:
        from_attributes = True

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Communication Schemas ---
class CommunicationGenerateRequest(BaseModel):
    vendor_name: str
    gstin: str
    issue: str
    invoice_number: Optional[str] = None
    taxable_value: Optional[float] = 0.0
    recommended_deadline: Optional[str] = None

class CommunicationResponse(BaseModel):
    vendor_name: str
    gstin: str
    issue: str
    subject: str
    email_body: str
    priority: str
    recommended_deadline: str
    status: str


# --- Compliance Command Center Schemas ---
class ComplianceCreate(BaseModel):
    client_id: str
    compliance_type: str
    filing_period: str
    due_date: date
    assigned_to: Optional[str] = None

class ComplianceResponse(BaseModel):
    compliance_id: str
    client_id: str
    compliance_type: str
    filing_period: str
    due_date: date
    status: str
    assigned_to: Optional[str] = None
    escalation_level: int
    risk_level: str
    risk_score: float
    filed_date: Optional[str] = None

class ComplianceSummaryResponse(BaseModel):
    upcoming_filings: int
    overdue_filings: int
    high_risk_clients: int
    filings_completed_this_month: int


# --- Action Center / AI Copilot Schemas ---
class ActionItemResponse(BaseModel):
    action_id: str
    client_id: str
    client_name: str
    category: str  # COMPLIANCE | RECONCILIATION | NOTICE | VENDOR | RISK
    priority: str  # HIGH | MEDIUM | LOW
    title: str
    description: str
    recommended_action: str
    deadline: str
    risk_score: float
    status: str    # PENDING | RESOLVED
    confidence_score: float
    ai_summary: str
    predicted_impact: str
    exposure_amount: Optional[float] = 0.0
    assigned_to: Optional[str] = None
    
    # Stateful Action Engine Extensions
    id: Optional[str] = None
    source_module: Optional[str] = None
    due_date: Optional[str] = None
    action_state: Optional[str] = "NEW"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None
    event_history: Optional[List[Dict[str, Any]]] = []
    source_url: Optional[str] = None
    automation_candidate: Optional[bool] = False
    can_auto_resolve: Optional[bool] = False

class ActionCenterSummaryResponse(BaseModel):
    total_actions: int
    high_priority_count: int
    pending_itc_exposure: float
    daily_summary: str


# --- Authentication Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    firm_name: str
    role: Optional[str] = "PARTNER" # PARTNER | MANAGER | ARTICLE | CLIENT_VIEWER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    firm_id: str
    role: str
    full_name: str

class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

# --- Background Jobs & Notifications Schemas ---
class JobResponse(BaseModel):
    job_id: str
    job_type: str
    status: str  # PENDING | RUNNING | COMPLETED | FAILED
    progress: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int
    error_logs: Optional[str] = None

class JobTriggerRequest(BaseModel):
    job_type: str

class NotificationLogResponse(BaseModel):
    id: str
    channel: str  # EMAIL | SMS | WHATSAPP | PUSH
    recipient: str
    subject: Optional[str] = None
    body: str
    status: str  # SENT | FAILED
    sent_at: datetime


# --- GST Notice Intelligence Schemas ---
class NoticeBase(BaseModel):
    client_id: str
    client_name: str
    notice_number: str
    issuing_authority: Optional[str] = None
    section_references: List[str] = []
    notice_type: str  # ASMT-10 | DRC-01 | DRC-03 | ITC Mismatch | Late Filing | Scrutiny Notice | Audit Notice | Registration Notice
    tax_amount: float = 0.0
    due_date: Optional[date] = None
    hearing_date: Optional[date] = None
    summary: Optional[str] = None
    risk_level: str = "MEDIUM"  # LOW | MEDIUM | HIGH
    required_action: Optional[str] = None
    status: str = "PENDING"  # PENDING | DRAFTED | RESPONDED | RESOLVED
    file_path: Optional[str] = None
    raw_ocr_text: Optional[str] = None

class NoticeCreate(NoticeBase):
    pass

class NoticeResponse(NoticeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoticeTimelineMilestone(BaseModel):
    title: str
    date: str
    description: str
    completed: bool



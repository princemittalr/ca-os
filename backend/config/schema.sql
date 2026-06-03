-- =========================================================================
-- CA-OS SYSTEM DATABASE PERSISTENT SCHEMA MIGRATION
-- Production-grade multi-tenant Chartered Accountant platform migration.
-- =========================================================================

-- Enable UUID extension for high security primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. CLIENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL, -- CA firm tenant identifier
    business_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    trade_name VARCHAR(255),
    gstin VARCHAR(15) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    state VARCHAR(100),
    state_code VARCHAR(2),
    filing_type VARCHAR(50) DEFAULT 'full',
    filing_frequency VARCHAR(50) DEFAULT 'monthly', -- monthly | quarterly | annual
    assigned_manager VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. RECONCILIATION RUNS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    reconciliation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    filing_period VARCHAR(7) NOT NULL, -- YYYY-MM
    reconciliation_status VARCHAR(100) NOT NULL,
    total_invoices INT DEFAULT 0,
    matched_count INT DEFAULT 0,
    mismatch_count INT DEFAULT 0,
    missing_in_2b_count INT DEFAULT 0,
    missing_in_books_count INT DEFAULT 0,
    itc_at_risk NUMERIC(15, 2) DEFAULT 0.00,
    itc_protected NUMERIC(15, 2) DEFAULT 0.00,
    risk_score VARCHAR(50) DEFAULT 'LOW', -- LOW | MEDIUM | HIGH
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 3. MISMATCH RECORDS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mismatch_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID REFERENCES reconciliation_runs(reconciliation_id) ON DELETE CASCADE,
    supplier_gstin VARCHAR(15) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE,
    taxable_value_2b NUMERIC(15, 2) DEFAULT 0.00,
    taxable_value_pr NUMERIC(15, 2) DEFAULT 0.00,
    difference NUMERIC(15, 2) DEFAULT 0.00,
    issue_type VARCHAR(100) NOT NULL, -- MISSING_IN_2B | VALUE_MISMATCH | etc.
    likely_cause TEXT,
    recommended_action TEXT,
    risk_level VARCHAR(50) DEFAULT 'LOW',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 4. COMPLIANCE TASKS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_tasks (
    compliance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    compliance_type VARCHAR(100) NOT NULL, -- GSTR-1 | GSTR-3B | TDS | MCA | ITR
    filing_period VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Upcoming', -- Upcoming | Due Today | Overdue | Filed | Escalated
    assigned_to VARCHAR(255),
    escalation_level INT DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'LOW',
    risk_score NUMERIC(5, 2) DEFAULT 15.00,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 5. COMMUNICATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    issue VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    email_body TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'HIGH', -- HIGH | MEDIUM | LOW
    recommended_deadline DATE,
    status VARCHAR(50) DEFAULT 'Drafted', -- Drafted | Sent | Vendor Responded | Resolved
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 6. ACTION ITEMS TABLE (AI COPILOT)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_items (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- COMPLIANCE | RECONCILIATION | NOTICE | VENDOR | RISK
    priority VARCHAR(50) DEFAULT 'HIGH', -- HIGH | MEDIUM | LOW
    title VARCHAR(255) NOT NULL,
    description TEXT,
    recommended_action TEXT,
    deadline DATE,
    risk_score NUMERIC(5, 2) DEFAULT 15.00,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING | RESOLVED
    confidence_score NUMERIC(4, 3) DEFAULT 0.90,
    ai_summary TEXT,
    predicted_impact TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 7. AUDIT LOGS TABLE (FUTURE COMPATIBILITY)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID,
    actor_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- AUTOMATIC TIMESTAMP UPDATERS (UPDATED_AT)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_reconciliations_modtime BEFORE UPDATE ON reconciliation_runs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_mismatch_modtime BEFORE UPDATE ON mismatch_records FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_compliance_modtime BEFORE UPDATE ON compliance_tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_communications_modtime BEFORE UPDATE ON communications FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_action_items_modtime BEFORE UPDATE ON action_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- -------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS) TEMPLATE PLACEHOLDERS
-- -------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RECKON AI — CANONICAL DATABASE SCHEMA
-- Single source of truth. Replaces database.sql + backend/config/schema.sql.
-- Production-grade multi-tenant Chartered Accountant platform.
--
-- Multi-tenancy model: every table is scoped to a CA firm via firm_id.
-- RLS policies use get_user_firm_id() to enforce firm isolation.
-- audit_logs are service-role-only — no user-level INSERT is permitted.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 0: FIRM-SCOPED RLS HELPER FUNCTION
-- SECURITY DEFINER: runs as table owner, avoids recursive RLS on users table.
-- STABLE: result cached per transaction for performance.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =============================================================================
-- SECTION 1: FIRMS TABLE (Tenant Root)
-- Each CA firm is a top-level tenant. All data hangs off firm_id.
-- =============================================================================
CREATE TABLE IF NOT EXISTS firms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 2: USERS TABLE (extends Supabase auth.users)
-- Each user belongs to exactly one firm.
-- firm_id is set by the on_auth_user_created trigger at signup.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    full_name           TEXT,
    firm_name           TEXT,
    icai_number         TEXT,
    phone               TEXT,
    city                TEXT,
    state               TEXT,
    designation         TEXT,
    role                TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'manager' | 'member'
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 3: CLIENTS TABLE
-- Represents GST clients managed by a CA firm.
-- Uniqueness: one GSTIN per firm (not per user).
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    business_name     TEXT NOT NULL,
    legal_name        TEXT,
    trade_name        TEXT,
    gstin             TEXT NOT NULL,
    contact_person    TEXT,
    email             TEXT,
    phone             TEXT,
    state             TEXT,
    state_code        TEXT,
    filing_type       TEXT NOT NULL DEFAULT 'full',       -- 'gst_only' | 'gst_tds' | 'full'
    filing_frequency  TEXT NOT NULL DEFAULT 'monthly',   -- 'monthly' | 'quarterly' | 'annual'
    assigned_manager  TEXT,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, gstin)
);


-- =============================================================================
-- SECTION 4: RECONCILIATION RUNS TABLE
-- Each run represents one GSTR-2B vs Purchase Register reconciliation attempt.
-- Canonical name: reconciliation_runs (matches manager.py).
-- =============================================================================
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    reconciliation_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id               UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    filing_period         TEXT NOT NULL,                 -- 'YYYY-MM'
    reconciliation_status TEXT NOT NULL DEFAULT 'processing',
    total_invoices        INT NOT NULL DEFAULT 0,
    matched_count         INT NOT NULL DEFAULT 0,
    mismatch_count        INT NOT NULL DEFAULT 0,
    missing_in_2b_count   INT NOT NULL DEFAULT 0,
    missing_in_books_count INT NOT NULL DEFAULT 0,
    itc_at_risk           NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    itc_protected         NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    risk_score            TEXT NOT NULL DEFAULT 'LOW',   -- 'LOW' | 'MEDIUM' | 'HIGH'
    upload_timestamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 5: MISMATCH RECORDS TABLE
-- Individual invoice-level mismatches within a reconciliation run.
-- Canonical name: mismatch_records (matches manager.py).
-- =============================================================================
CREATE TABLE IF NOT EXISTS mismatch_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    reconciliation_id   UUID NOT NULL REFERENCES reconciliation_runs(reconciliation_id) ON DELETE CASCADE,
    supplier_gstin      TEXT NOT NULL,
    invoice_number      TEXT NOT NULL,
    invoice_date        DATE,
    taxable_value_2b    NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_value_pr    NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst_2b             NUMERIC(15, 2),
    igst_pr             NUMERIC(15, 2),
    cgst_2b             NUMERIC(15, 2),
    cgst_pr             NUMERIC(15, 2),
    sgst_2b             NUMERIC(15, 2),
    sgst_pr             NUMERIC(15, 2),
    difference          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    issue_type          TEXT NOT NULL,                   -- 'MISSING_IN_2B' | 'VALUE_MISMATCH' | etc.
    likely_cause        TEXT,
    recommended_action  TEXT,
    ai_insight          TEXT,
    risk_level          TEXT NOT NULL DEFAULT 'LOW',     -- 'LOW' | 'MEDIUM' | 'HIGH'
    status              TEXT NOT NULL DEFAULT 'open',
    suggested_action    TEXT,
    is_reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
    is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 6: COMPLIANCE TASKS TABLE
-- Filing deadlines and compliance obligations per client.
-- =============================================================================
CREATE TABLE IF NOT EXISTS compliance_tasks (
    compliance_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    compliance_type   TEXT NOT NULL,                     -- 'GSTR-1' | 'GSTR-3B' | 'TDS' | 'MCA' | 'ITR'
    filing_period     TEXT NOT NULL,                     -- 'YYYY-MM' or quarter label
    due_date          DATE NOT NULL,
    filed_date        DATE,
    status            TEXT NOT NULL DEFAULT 'Upcoming',  -- 'Upcoming' | 'Due Today' | 'Overdue' | 'Filed' | 'Escalated'
    assigned_to       TEXT,
    escalation_level  INT NOT NULL DEFAULT 0,
    risk_level        TEXT NOT NULL DEFAULT 'LOW',
    risk_score        NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    penalty_risk      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes             TEXT,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 7: COMMUNICATIONS TABLE
-- Vendor outreach emails drafted and sent by the CA firm.
-- =============================================================================
CREATE TABLE IF NOT EXISTS communications (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id              UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    vendor_name          TEXT NOT NULL,
    gstin                TEXT,
    issue                TEXT NOT NULL,
    subject              TEXT NOT NULL,
    email_body           TEXT NOT NULL,
    priority             TEXT NOT NULL DEFAULT 'HIGH',   -- 'HIGH' | 'MEDIUM' | 'LOW'
    recommended_deadline DATE,
    status               TEXT NOT NULL DEFAULT 'Drafted', -- 'Drafted' | 'Sent' | 'Vendor Responded' | 'Resolved'
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 8: ACTION ITEMS TABLE (AI Copilot)
-- Prioritised work queue surfaced by the AI action engine.
-- =============================================================================
CREATE TABLE IF NOT EXISTS action_items (
    action_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id              UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name          TEXT,
    category             TEXT NOT NULL,                  -- 'COMPLIANCE' | 'RECONCILIATION' | 'NOTICE' | 'VENDOR' | 'RISK'
    priority             TEXT NOT NULL DEFAULT 'HIGH',   -- 'HIGH' | 'MEDIUM' | 'LOW'
    title                TEXT NOT NULL,
    description          TEXT,
    recommended_action   TEXT,
    deadline             DATE,
    risk_score           NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    status               TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
    assigned_to          TEXT,
    confidence_score     NUMERIC(4, 3) NOT NULL DEFAULT 0.90,
    ai_summary           TEXT,
    predicted_impact     TEXT,
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 9: GST NOTICES TABLE
-- GST department notices requiring CA firm response.
-- is_deleted enables soft-delete as required by spec.
-- =============================================================================
CREATE TABLE IF NOT EXISTS gst_notices (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id                 UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name             TEXT NOT NULL,
    notice_number           TEXT NOT NULL,
    issuing_authority       TEXT NOT NULL DEFAULT 'GST Tax Authority',
    section_references      TEXT[] NOT NULL DEFAULT '{}',
    notice_type             TEXT NOT NULL DEFAULT 'ASMT-10',  -- 'ASMT-10' | 'SCN' | 'DRC-01' | etc.
    gstin                   TEXT,
    tax_amount              NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_exposure_est   NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    penalty_exposure_est    NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_exposure_est      NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    due_date                DATE,
    hearing_date            DATE,
    summary                 TEXT,
    risk_level              TEXT NOT NULL DEFAULT 'MEDIUM',  -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    risk_score              NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    complexity_score        TEXT NOT NULL DEFAULT 'Moderate',
    recommended_next_action TEXT NOT NULL DEFAULT 'Prepare Reply',
    required_action         TEXT,
    status                  TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
    file_path               TEXT,
    raw_ocr_text            TEXT NOT NULL DEFAULT '',
    supporting_evidence     JSONB NOT NULL DEFAULT '[]',
    missing_documents       JSONB NOT NULL DEFAULT '[]',
    questions_for_client    JSONB NOT NULL DEFAULT '[]',
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,   -- soft-delete required by spec
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 10: JOBS TABLE
-- Async background job tracking (reconciliation uploads, exports, etc.).
-- =============================================================================
CREATE TABLE IF NOT EXISTS jobs (
    job_id       TEXT PRIMARY KEY,
    firm_id      UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    job_type     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    progress     NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    retry_count  INT NOT NULL DEFAULT 0,
    error_logs   TEXT,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 11: NOTIFICATIONS LOG TABLE
-- Outbound notification delivery log (email, SMS, webhook).
-- Distinct from the user inbox `notifications` table.
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id    UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    channel    TEXT NOT NULL,        -- 'email' | 'sms' | 'webhook'
    recipient  TEXT NOT NULL,
    subject    TEXT,
    body       TEXT NOT NULL,
    status     TEXT NOT NULL,        -- 'sent' | 'failed' | 'queued'
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 12: USER NOTIFICATIONS TABLE (Inbox)
-- Per-user notification inbox. Dual-scoped: user_id + firm_id.
-- user_id ensures only the intended user sees the notification.
-- firm_id allows firm-level broadcast and RLS enforcement.
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id    UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT,                 -- 'reconciliation' | 'compliance' | 'system' | 'account'
    title      TEXT NOT NULL,
    message    TEXT,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 13: SUPPORT TICKETS TABLE
-- User-submitted support requests.
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id       UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_number TEXT,
    category      TEXT,
    subject       TEXT NOT NULL,
    description   TEXT,
    priority      TEXT NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'critical'
    status        TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'in_progress' | 'resolved' | 'closed'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 14: AUDIT LOGS TABLE
-- Immutable audit trail. Written exclusively via service role key.
-- No user-level INSERT policy — prevents tampering via user JWTs.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id     UUID REFERENCES firms(id) ON DELETE SET NULL,  -- nullable for system-level events
    actor_id    TEXT NOT NULL DEFAULT 'system',               -- auth.uid() or 'system'
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    details     JSONB NOT NULL DEFAULT '{}',
    ip_address  TEXT NOT NULL DEFAULT 'unknown',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 15: AUTOMATION AGENTS TABLE
-- AI automation agent registry per firm.
-- =============================================================================
CREATE TABLE IF NOT EXISTS automation_agents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id      UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    agent_key    VARCHAR(50) NOT NULL,  -- stable key: 'compliance_reminder' | 'overdue_escalation' | 'vendor_communication' | 'reconciliation_sync'
    name         TEXT NOT NULL,
    agent_type   TEXT NOT NULL,         -- 'reconciliation' | 'compliance' | 'communication'
    config       JSONB NOT NULL DEFAULT '{}',
    is_active    BOOLEAN NOT NULL DEFAULT FALSE,
    last_run_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, agent_key)         -- each firm has at most one row per agent type
);


-- =============================================================================
-- SECTION 16: AUTO-TIMESTAMP TRIGGERS
-- Keeps updated_at current on every row update.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_firms_modtime
    BEFORE UPDATE ON firms
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_clients_modtime
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_reconciliation_runs_modtime
    BEFORE UPDATE ON reconciliation_runs
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_mismatch_records_modtime
    BEFORE UPDATE ON mismatch_records
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_compliance_tasks_modtime
    BEFORE UPDATE ON compliance_tasks
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_communications_modtime
    BEFORE UPDATE ON communications
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_action_items_modtime
    BEFORE UPDATE ON action_items
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_gst_notices_modtime
    BEFORE UPDATE ON gst_notices
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_jobs_modtime
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_support_tickets_modtime
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_automation_agents_modtime
    BEFORE UPDATE ON automation_agents
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- =============================================================================
-- SECTION 17: USER SIGNUP TRIGGER
-- Fires AFTER INSERT on auth.users (Supabase auth).
-- Creates a new firm per signup (solo CA firm model).
-- For team/invite flows, skip the firms INSERT and use the invited firm_id.
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_firm_id UUID;
BEGIN
    -- Create a new firm for this user (one firm per solo signup)
    INSERT INTO firms (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'firm_name', 'My CA Firm'))
    RETURNING id INTO new_firm_id;

    -- Create the user profile linked to the new firm
    INSERT INTO users (id, firm_id, full_name, firm_name, onboarding_complete)
    VALUES (
        NEW.id,
        new_firm_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'firm_name', ''),
        FALSE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- =============================================================================
-- SECTION 18: PERFORMANCE INDEXES
-- Indexes on firm_id for every tenant-scoped table (critical for RLS perf).
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_firm_id               ON users(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm_id             ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm_gstin          ON clients(firm_id, gstin);
CREATE INDEX IF NOT EXISTS idx_recon_runs_firm_id          ON reconciliation_runs(firm_id);
CREATE INDEX IF NOT EXISTS idx_recon_runs_client_period    ON reconciliation_runs(client_id, filing_period);
CREATE INDEX IF NOT EXISTS idx_mismatch_records_firm_id    ON mismatch_records(firm_id);
CREATE INDEX IF NOT EXISTS idx_mismatch_records_recon_id   ON mismatch_records(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_firm_id    ON compliance_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_client_id  ON compliance_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_firm_id      ON communications(firm_id);
CREATE INDEX IF NOT EXISTS idx_action_items_firm_id        ON action_items(firm_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status         ON action_items(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_gst_notices_firm_id         ON gst_notices(firm_id);
CREATE INDEX IF NOT EXISTS idx_gst_notices_client_id       ON gst_notices(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_firm_id                ON jobs(firm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_firm_id   ON notifications_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id       ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_firm_id       ON notifications(firm_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_firm_id     ON support_tickets(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_id          ON audit_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id         ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_automation_agents_firm_id        ON automation_agents(firm_id);
CREATE INDEX IF NOT EXISTS idx_automation_agents_firm_key       ON automation_agents(firm_id, agent_key);


-- =============================================================================
-- SECTION 19: ENABLE ROW LEVEL SECURITY
-- Must be done before policy creation.
-- =============================================================================
ALTER TABLE firms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mismatch_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_notices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_agents   ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 20: DROP LEGACY USER-SCOPED POLICIES
-- Remove all old policies that used auth.uid() = user_id directly.
-- =============================================================================

-- users table (old policies)
DROP POLICY IF EXISTS "Users can view own profile"          ON users;
DROP POLICY IF EXISTS "Users can update own profile"        ON users;

-- clients table (old user_id policies)
DROP POLICY IF EXISTS "Users can view own clients"          ON clients;
DROP POLICY IF EXISTS "Users can insert own clients"        ON clients;
DROP POLICY IF EXISTS "Users can update own clients"        ON clients;
DROP POLICY IF EXISTS "Users can delete own clients"        ON clients;

-- reconciliations table (old name — kept for safety in case it still exists)
DROP POLICY IF EXISTS "Users can view own reconciliations"  ON reconciliations;
DROP POLICY IF EXISTS "Users can insert own reconciliations" ON reconciliations;
DROP POLICY IF EXISTS "Users can update own reconciliations" ON reconciliations;
DROP POLICY IF EXISTS "Users can delete own reconciliations" ON reconciliations;

-- recon_rows table (old name)
DROP POLICY IF EXISTS "Users can view own recon_rows"       ON recon_rows;
DROP POLICY IF EXISTS "Users can insert own recon_rows"     ON recon_rows;
DROP POLICY IF EXISTS "Users can update own recon_rows"     ON recon_rows;
DROP POLICY IF EXISTS "Users can delete own recon_rows"     ON recon_rows;

-- compliance_tasks (old policies)
DROP POLICY IF EXISTS "Users can view own compliance tasks"   ON compliance_tasks;
DROP POLICY IF EXISTS "Users can insert own compliance tasks" ON compliance_tasks;
DROP POLICY IF EXISTS "Users can update own compliance tasks" ON compliance_tasks;
DROP POLICY IF EXISTS "Users can delete own compliance tasks" ON compliance_tasks;

-- notifications (old policies)
DROP POLICY IF EXISTS "Users can view own notifications"    ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications"  ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications"  ON notifications;

-- support_tickets (old policies)
DROP POLICY IF EXISTS "Users can view own support tickets"  ON support_tickets;
DROP POLICY IF EXISTS "Users can insert own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own support tickets" ON support_tickets;

-- audit_logs (old policies — these are being removed intentionally; service role only)
DROP POLICY IF EXISTS "Users can view own audit logs"       ON audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs"     ON audit_logs;


-- =============================================================================
-- SECTION 21: FIRM-SCOPED RLS POLICIES
-- All policies use get_user_firm_id() — never direct auth.uid() = user_id.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- firms table: a user can only see their own firm
-- ---------------------------------------------------------------------------
CREATE POLICY "firm_select_own"
    ON firms FOR SELECT
    USING (id = get_user_firm_id());

CREATE POLICY "firm_update_own"
    ON firms FOR UPDATE
    USING (id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- users table: user-scoped (see/update own row only); firm_id enforced by trigger
-- ---------------------------------------------------------------------------
CREATE POLICY "users_select_own"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- clients table: full firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "clients_select_firm"
    ON clients FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "clients_insert_firm"
    ON clients FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "clients_update_firm"
    ON clients FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "clients_delete_firm"
    ON clients FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- reconciliation_runs table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "recon_runs_select_firm"
    ON reconciliation_runs FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "recon_runs_insert_firm"
    ON reconciliation_runs FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "recon_runs_update_firm"
    ON reconciliation_runs FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "recon_runs_delete_firm"
    ON reconciliation_runs FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- mismatch_records table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "mismatch_records_select_firm"
    ON mismatch_records FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "mismatch_records_insert_firm"
    ON mismatch_records FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "mismatch_records_update_firm"
    ON mismatch_records FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "mismatch_records_delete_firm"
    ON mismatch_records FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- compliance_tasks table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "compliance_tasks_select_firm"
    ON compliance_tasks FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "compliance_tasks_insert_firm"
    ON compliance_tasks FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "compliance_tasks_update_firm"
    ON compliance_tasks FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "compliance_tasks_delete_firm"
    ON compliance_tasks FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- communications table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "communications_select_firm"
    ON communications FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "communications_insert_firm"
    ON communications FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "communications_update_firm"
    ON communications FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "communications_delete_firm"
    ON communications FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- action_items table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "action_items_select_firm"
    ON action_items FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "action_items_insert_firm"
    ON action_items FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "action_items_update_firm"
    ON action_items FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "action_items_delete_firm"
    ON action_items FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- gst_notices table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "gst_notices_select_firm"
    ON gst_notices FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "gst_notices_insert_firm"
    ON gst_notices FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "gst_notices_update_firm"
    ON gst_notices FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "gst_notices_delete_firm"
    ON gst_notices FOR DELETE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- jobs table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "jobs_select_firm"
    ON jobs FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "jobs_insert_firm"
    ON jobs FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "jobs_update_firm"
    ON jobs FOR UPDATE
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- notifications_log table: firm isolation (read-only for users; writes by backend)
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications_log_select_firm"
    ON notifications_log FOR SELECT
    USING (firm_id = get_user_firm_id());

-- ---------------------------------------------------------------------------
-- notifications table: dual-scoped — firm AND user
-- A user only sees their own notifications, within their own firm.
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications_select_own_firm"
    ON notifications FOR SELECT
    USING (
        user_id = auth.uid()
        AND firm_id = get_user_firm_id()
    );

CREATE POLICY "notifications_update_own_firm"
    ON notifications FOR UPDATE
    USING (
        user_id = auth.uid()
        AND firm_id = get_user_firm_id()
    );

-- Note: INSERT for notifications done via service role by the backend.

-- ---------------------------------------------------------------------------
-- support_tickets table: user + firm scoped
-- ---------------------------------------------------------------------------
CREATE POLICY "support_tickets_select_firm"
    ON support_tickets FOR SELECT
    USING (
        firm_id = get_user_firm_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "support_tickets_insert_firm"
    ON support_tickets FOR INSERT
    WITH CHECK (
        firm_id = get_user_firm_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "support_tickets_update_firm"
    ON support_tickets FOR UPDATE
    USING (
        firm_id = get_user_firm_id()
        AND user_id = auth.uid()
    );

-- ---------------------------------------------------------------------------
-- audit_logs table: SERVICE ROLE ONLY
-- No user-level SELECT, INSERT, UPDATE, or DELETE policies.
-- The Supabase service role key bypasses RLS entirely.
-- Users can NEVER read or write audit logs directly.
-- Backend writes audit logs using the service role client (config/supabase.py).
-- ---------------------------------------------------------------------------
-- (Intentionally no policies created here)

-- ---------------------------------------------------------------------------
-- automation_agents table: firm isolation
-- ---------------------------------------------------------------------------
CREATE POLICY "automation_agents_select_firm"
    ON automation_agents FOR SELECT
    USING (firm_id = get_user_firm_id());

CREATE POLICY "automation_agents_insert_firm"
    ON automation_agents FOR INSERT
    WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "automation_agents_update_firm"
    ON automation_agents FOR UPDATE
    USING (firm_id = get_user_firm_id());

CREATE POLICY "automation_agents_delete_firm"
    ON automation_agents FOR DELETE
    USING (firm_id = get_user_firm_id());


-- =============================================================================
-- END OF SCHEMA
-- Apply this entire file to a fresh Supabase project via:
--   Supabase Dashboard > SQL Editor > Run
-- or via the Supabase CLI:
--   supabase db reset --linked
-- =============================================================================

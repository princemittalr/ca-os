-- Supabase Database Schema for Reckon AI

-- users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  firm_name TEXT,
  icai_number TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  designation TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  gstin TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  filing_type TEXT,  -- 'gst_only' | 'gst_tds' | 'full'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, gstin)
);

-- reconciliations table
CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- '2024-03'
  status TEXT DEFAULT 'processing',
  total_invoices INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  mismatch_count INTEGER DEFAULT 0,
  missing_in_2b_count INTEGER DEFAULT 0,
  missing_in_books_count INTEGER DEFAULT 0,
  itc_at_risk NUMERIC(15,2) DEFAULT 0,
  itc_protected NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- recon_rows table
CREATE TABLE recon_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES reconciliations(id) ON DELETE CASCADE,
  supplier_gstin TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  taxable_value_2b NUMERIC(15,2),
  taxable_value_pr NUMERIC(15,2),
  igst_2b NUMERIC(15,2),
  igst_pr NUMERIC(15,2),
  cgst_2b NUMERIC(15,2),
  cgst_pr NUMERIC(15,2),
  sgst_2b NUMERIC(15,2),
  sgst_pr NUMERIC(15,2),
  difference NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL,
  suggested_action TEXT,
  ai_insight TEXT,
  is_reviewed BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false
);

-- compliance_tasks table
CREATE TABLE compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type TEXT,  -- 'GSTR-1' | 'GSTR-3B' | 'TDS' | 'ITR' | 'ROC'
  period TEXT,  -- '2024-03'
  due_date DATE,
  status TEXT DEFAULT 'pending',  -- 'pending'|'filed'|'overdue'
  penalty_risk NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,  -- 'reconciliation'|'compliance'|'system'|'account'
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- support_tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticket_number TEXT,  -- 'TKT-001'
  category TEXT,
  subject TEXT,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies (Assuming users can only see their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (user_id = auth.uid());

-- For reconciliations, user must own the client
CREATE POLICY "Users can view own reconciliations" ON reconciliations FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own reconciliations" ON reconciliations FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own reconciliations" ON reconciliations FOR UPDATE USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own reconciliations" ON reconciliations FOR DELETE USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- For recon_rows, user must own the reconciliation's client
CREATE POLICY "Users can view own recon_rows" ON recon_rows FOR SELECT USING (
  reconciliation_id IN (
    SELECT r.id FROM reconciliations r 
    JOIN clients c ON r.client_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own recon_rows" ON recon_rows FOR INSERT WITH CHECK (
  reconciliation_id IN (
    SELECT r.id FROM reconciliations r 
    JOIN clients c ON r.client_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own recon_rows" ON recon_rows FOR UPDATE USING (
  reconciliation_id IN (
    SELECT r.id FROM reconciliations r 
    JOIN clients c ON r.client_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own recon_rows" ON recon_rows FOR DELETE USING (
  reconciliation_id IN (
    SELECT r.id FROM reconciliations r 
    JOIN clients c ON r.client_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);

-- Similar policies for other tables
CREATE POLICY "Users can view own compliance tasks" ON compliance_tasks FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own compliance tasks" ON compliance_tasks FOR INSERT WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own compliance tasks" ON compliance_tasks FOR UPDATE USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own compliance tasks" ON compliance_tasks FOR DELETE USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own support tickets" ON support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own support tickets" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own support tickets" ON support_tickets FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own audit logs" ON audit_logs FOR INSERT WITH CHECK (user_id = auth.uid());

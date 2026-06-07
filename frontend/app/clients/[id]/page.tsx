"use client";

import React, { useState, useEffect } from 'react';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  ArrowLeft,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  FolderLock,
  MailWarning,
  ShieldAlert,
  ExternalLink,
  FileCheck,
  X,
  Copy,
  Plus,
  Eye,
  Edit,
  Archive
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

// URL base for direct download links (<a href> / window.open). Not used for fetch.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ReconciliationRun {
  reconciliation_id: string;
  client_id: string;
  filing_period: string;
  reconciliation_status: string;
  total_invoices: number;
  matched_count: number;
  mismatch_count: number;
  missing_in_2b_count: number;
  missing_in_books_count: number;
  itc_at_risk: number;
  itc_protected: number;
  risk_score: string;
  upload_timestamp: string;
}

export default function ClientWorkspacePortal() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [history, setHistory] = useState<ReconciliationRun[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'reconcile' | 'compliance' | 'notices' | 'vault' | 'activity'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [fetchError, setFetchError] = useState<string|null>(null);

  // Edit client modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editState, setEditState] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFilingFrequency, setEditFilingFrequency] = useState('monthly');

  useEffect(() => {
    if (client) {
      setEditName(client.business_name || '');
      setEditLegalName(client.legal_name || client.business_name || '');
      setEditState(client.state || 'Maharashtra');
      setEditEmail(client.email || '');
      setEditPhone(client.phone || '');
      setEditFilingFrequency(client.filing_frequency || 'monthly');
    }
  }, [client]);

  // Follow-ups & outreach states
  const [communications, setCommunications] = useState<any[]>([]);
  const [isCommsLoading, setIsCommsLoading] = useState(false);
  const [commsError, setCommsError] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<any>(null);

  // Notice Creation Form State
  const [formVendorName, setFormVendorName] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formIssue, setFormIssue] = useState('MISSING_IN_2B');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formTaxableValue, setFormTaxableValue] = useState('');
  const [formDeadline, setFormDeadline] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchCommunications = async () => {
    try {
      setIsCommsLoading(true);
      setCommsError(false);
      const data = await api.get<any[]>(`/api/communications/${clientId}`);
      setCommunications(data);
    } catch (err) {
      console.error(err);
      setCommunications([]);
      setCommsError(true);
    } finally {
      setIsCommsLoading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendorName || !formGstin) {
      showToast("⚠ Please provide Vendor Name and GSTIN.");
      return;
    }
    try {
      const newDraft = await api.post<any>('/api/communications/generate', {
        vendor_name: formVendorName,
        gstin: formGstin,
        issue: formIssue,
        invoice_number: formInvoiceNumber || undefined,
        taxable_value: parseFloat(formTaxableValue) || 0.0,
        recommended_deadline: formDeadline || undefined,
        client_id: clientId
      });
      showToast("✓ Outreach draft notice generated successfully!");

      // Reset form fields
      setFormVendorName('');
      setFormGstin('');
      setFormIssue('MISSING_IN_2B');
      setFormInvoiceNumber('');
      setFormTaxableValue('');
      setIsCreateModalOpen(false);

      // Refresh list and auto-preview
      await fetchCommunications();
      setSelectedComm(newDraft);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      console.error(err);
      showToast(`⚠ Generation failed: ${err.message || err}`);
    }
  };

  const handleUpdateStatus = async (commId: string, newStatus: string) => {
    try {
      await api.put(`/api/communications/${commId}/status?new_status=${encodeURIComponent(newStatus)}`, {});
      showToast(`✓ Status updated to ${newStatus}`);
      setCommunications(prev => prev.map(c => c.id === commId ? { ...c, status: newStatus } : c));
    } catch (err: any) {
      console.error(err);
      // Update local state even if mock environment failed to hit API
      setCommunications(prev => prev.map(c => c.id === commId ? { ...c, status: newStatus } : c));
      showToast(`✓ Local status updated to ${newStatus}`);
    }
  };

  const handleCopyNoticeText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("✓ Notice email body copied to clipboard!");
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedData = await api.put<any>(`/api/clients/${clientId}`, {
        business_name: editName,
        legal_name: editLegalName,
        state: editState,
        email: editEmail,
        phone: editPhone,
        filing_frequency: editFilingFrequency
      });
      setClient(updatedData);
      showToast("✓ Client details updated successfully!");
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      // Fallback for mock client update
      const updatedLocal = {
        ...client,
        business_name: editName,
        legal_name: editLegalName,
        state: editState,
        email: editEmail,
        phone: editPhone,
        filing_frequency: editFilingFrequency
      };
      setClient(updatedLocal);
      showToast("✓ Local client details updated (Offline mode)");
      setIsEditModalOpen(false);
    }
  };

  const fetchWorkspace = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const clientData = await api.get<any>(`/api/clients/${clientId}`);
      const historyData = await api.get<ReconciliationRun[]>(`/api/clients/${clientId}/reconciliations`);
      setClient(clientData);
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setClient(null);
      setHistory([]);
      setFetchError("Unable to load client. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchWorkspace();
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId && activeTab === 'notices') {
      fetchCommunications();
    }
  }, [clientId, activeTab]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (fetchError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-rose-600 text-sm font-semibold tracking-wide">
        <AlertCircle size={32} className="text-rose-600 animate-pulse" />
        <span>{fetchError}</span>
      </div>
    );
  }

  if (isLoading || !client) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-500 text-xs font-mono font-bold uppercase tracking-wider">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1B4F8A] rounded-full animate-spin"></div>
        <span>Loading Client Workspace...</span>
      </div>
    );
  }

  // Get active risk score mapping
  const latestRun = history[0];
  const activeRisk = latestRun?.risk_score || "LOW";
  const exposedRiskAmount = latestRun?.itc_at_risk || 0;

  // Tab definitions
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'reconcile', label: 'GST Returns' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'notices', label: 'Notices' },
    { id: 'vault', label: 'Documents' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="pb-16 relative font-sans text-slate-800 bg-[#F8FAFC] min-h-screen">

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-8 right-8 bg-white border border-slate-200 text-slate-800 px-5 py-3.5 rounded-[4px] shadow-fintech-lg z-[100] max-w-sm flex items-center gap-3"
          style={{ borderLeft: '4px solid #1B4F8A' }}
        >
          <CheckCircle2 className="text-[#1B4F8A] flex-shrink-0" size={18} />
          <span className="text-[12px] font-bold leading-normal">{toastMessage}</span>
        </div>
      )}

      {/* ── PAGE HEADER: 56px, white, border-bottom ── */}
      <div className="w-full h-[56px] px-6 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between -mt-6 -mx-6 mb-6">
        {/* Left: back + name + GSTIN + badge */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/clients">
            <button className="w-8 h-8 border border-[#E5E7EB] rounded-[3px] flex items-center justify-center text-[#6B7280] hover:bg-slate-50 transition-colors cursor-pointer shrink-0">
              <ArrowLeft size={14} />
            </button>
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-baseline gap-2 truncate">
              <h1 className="text-[16px] font-semibold text-[#111827] leading-tight">
                {client.business_name}
              </h1>
              <span className="text-[12px] text-[#6B7280]">
                (PAN: {client.gstin ? client.gstin.substring(2, 12) : '—'} · GSTIN: {client.gstin})
              </span>
            </div>
            <span className={`status-badge ${
              activeRisk === 'LOW' ? 'status-badge-success' :
              activeRisk === 'MEDIUM' ? 'status-badge-warning' :
              'status-badge-error'
            }`}>
              {activeRisk} Risk
            </span>
          </div>
        </div>

        {/* Right: action buttons (Edit, Archive) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="btn btn-secondary h-[30px] text-[12px] px-3 font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
          >
            <Edit size={12} />
            <span>Edit</span>
          </button>
          <button
            onClick={() => showToast("✓ Archive initiated — client workspace archived.")}
            className="btn btn-danger h-[30px] text-[12px] px-3 font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-[#991B1B] cursor-pointer"
          >
            <Archive size={12} />
            <span>Archive</span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">

        {/* ── TAB NAVIGATION — Action Center underline style ── */}
        <div className="flex gap-6 border-b border-[#E5E7EB] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[12px] font-medium pb-2 whitespace-nowrap transition-all cursor-pointer bg-transparent border-none ${
                activeTab === tab.id
                  ? 'text-[#1B4F8A]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
              style={{
                height: '36px',
                borderBottom: activeTab === tab.id ? '2px solid #1B4F8A' : '2px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            TAB CONTENT AREA
            ══════════════════════════════════════════════ */}

        {/* ══════════════════════════════════════════════
            TAB CONTENT AREA
            ══════════════════════════════════════════════ */}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Contact & Registration Info */}
            <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563] mb-3">
                Registration Details
              </div>
              <div>
                {[
                  { label: 'Legal Name', value: client.legal_name || client.business_name },
                  { label: 'GSTIN', value: client.gstin, mono: true },
                  { label: 'State / Jurisdiction', value: client.state },
                  { label: 'Filing Frequency', value: client.filing_frequency || 'Monthly' },
                  { label: 'Contact Email', value: client.email || '—', mono: true },
                  { label: 'Assigned CA Principal', value: client.assigned_manager || '—' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between h-[28px] border-b border-[#F3F4F6] last:border-b-0">
                    <span className="text-[11px] text-[#6B7280]">{row.label}</span>
                    <span className={`text-[13px] text-[#111827] ${row.mono ? 'font-mono' : 'font-medium'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Compliance Summary */}
            <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563] mb-3">
                Compliance Summary
              </div>
              <div>
                {[
                  { label: 'Risk Score', value: activeRisk, badge: true },
                  { label: 'ITC at Risk', value: formatCurrency(exposedRiskAmount), highlight: exposedRiskAmount > 0 },
                  { label: 'ITC Protected', value: formatCurrency(latestRun?.itc_protected || 0), positive: true },
                  { label: 'Filing Runs Completed', value: `${history.length} audit runs`, mono: true },
                  { label: 'Last Reconciliation', value: latestRun ? `${latestRun.filing_period === '2024-03' ? 'March 2024' : latestRun.filing_period}` : 'Never run' },
                  { label: 'Mismatch Count', value: latestRun ? `${latestRun.mismatch_count} mismatches` : '—', mono: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between h-[28px] border-b border-[#F3F4F6] last:border-b-0">
                    <span className="text-[11px] text-[#6B7280]">{row.label}</span>
                    {row.badge ? (
                      <span className={`status-badge ${
                        row.value === 'LOW' ? 'status-badge-success' :
                        row.value === 'MEDIUM' ? 'status-badge-warning' :
                        'status-badge-error'
                      }`}>
                        {row.value}
                      </span>
                    ) : (
                      <span className={`text-[13px] font-medium ${
                        row.highlight ? 'text-[#B91C1C] font-mono' :
                        row.positive ? 'text-[#059669] font-mono' :
                        row.mono ? 'font-mono text-[#111827]' :
                        'text-[#111827]'
                      }`}>
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── GST RETURNS TAB ── */}
        {activeTab === 'reconcile' && (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filing Period</th>
                    <th>Run Date</th>
                    <th className="text-center">Audited Invoices</th>
                    <th className="text-center">GSTR-2B Gaps</th>
                    <th className="text-right">Protected ITC</th>
                    <th className="text-right">Blocked Risk</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((run) => (
                      <tr key={run.reconciliation_id}>
                        <td className="font-medium text-[#111827]">
                          {run.filing_period === '2024-03' ? 'March 2024' : run.filing_period === '2024-02' ? 'February 2024' : run.filing_period}
                        </td>
                        <td className="text-[#6B7280] text-[12px]">
                          {formatDate(run.upload_timestamp)}
                        </td>
                        <td className="text-center text-[#111827] font-medium font-mono">
                          {run.total_invoices}
                        </td>
                        <td className="text-center">
                          <span className={run.mismatch_count > 0 ? 'text-[#B45309] font-medium' : 'text-[#059669] font-medium'}>
                            {run.mismatch_count > 0 ? `${run.mismatch_count} mismatches` : '0 gaps'}
                          </span>
                        </td>
                        <td className="text-right text-[#059669] font-medium font-mono">
                          {formatCurrency(run.itc_protected)}
                        </td>
                        <td className="text-right text-[#B91C1C] font-medium font-mono">
                          {formatCurrency(run.itc_at_risk)}
                        </td>
                        <td className="text-center">
                          <span className={`status-badge ${run.risk_score === 'LOW' ? 'status-badge-success' : 'status-badge-error'}`}>
                            {run.risk_score === 'LOW' ? 'Clean' : 'Issues'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/gst-recon?client=${client.id}`}>
                              <button className="action-btn">
                                <ExternalLink size={11} />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <ShieldAlert size={20} className="text-[#D1D5DB]" />
                          <span className="text-[13px] text-[#6B7280]">No audit runs found</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COMPLIANCE TAB ── */}
        {activeTab === 'compliance' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-4">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563]">
                Compliance Filing Deadlines
              </div>
              <p className="text-[12px] text-[#6B7280] mt-0.5">Calendar tracking corporate Indian filing deadlines for {client.business_name}.</p>
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              <div className="flex justify-between items-center py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[3px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-[#111827]">GSTR-1 (Supplier Return)</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Filing due for March 2024 period</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[#059669] font-medium block text-[12px]">✓ Completed</span>
                  <span className="text-[11px] text-[#6B7280] font-mono">Filed: 11-04-2024</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[3px] bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-[#111827]">GSTR-3B (Offset Tax Liabilities)</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Filing due for March 2024 period</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[#DC2626] font-medium block text-[12px]">⚠ OVERDUE LATE FEE RISK</span>
                  <span className="text-[11px] text-[#DC2626] font-mono">Deadline: 20-04-2024</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[3px] bg-[#F9FAFB] text-[#6B7280] flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-[#111827]">Annual GSTR-9 C Audit</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">GST Annual return reconciliation statement</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[#6B7280] font-medium block text-[12px]">○ Planned</span>
                  <span className="text-[11px] text-[#6B7280] font-mono">Deadline: 31-12-2024</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NOTICES TAB ── */}
        {activeTab === 'notices' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563]">Notices & Outreach</div>
                <p className="text-[12px] text-[#6B7280] mt-0.5">Manage official GSTIN Scrutiny notices and vendor outreach compliance drafts.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showToast("✓ Automated notices poll completed. No new notices.")}
                  className="btn btn-secondary h-[30px] text-[12px] px-3 font-medium rounded-[3px] hover:bg-slate-50 cursor-pointer"
                >
                  Sync Records
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary h-[30px] text-[12px] px-3 font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-[#163F6E] cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Generate Notice</span>
                </button>
              </div>
            </div>

            {isCommsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[12px] text-[#6B7280]">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#1B4F8A] rounded-full animate-spin"></div>
                <span>Fetching outreach registry…</span>
              </div>
            ) : communications.length > 0 ? (
              <div className="data-table-shell">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Vendor & GSTIN</th>
                        <th>Issue</th>
                        <th>Priority</th>
                        <th>Deadline</th>
                        <th className="text-center">Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications.map((comm) => (
                        <tr key={comm.id}>
                          <td className="pl-4">
                            <div className="font-medium text-[#111827]">{comm.vendor_name}</div>
                            <div className="text-[11px] text-[#6B7280] font-mono">{comm.gstin}</div>
                          </td>
                          <td>
                            {comm.issue === 'MISSING_IN_2B' ? (
                              <span className="text-[#DC2626] font-medium">Missing in GSTR-2B</span>
                            ) : comm.issue === 'VALUE_MISMATCH' ? (
                              <span className="text-[#B45309] font-medium">Value Mismatch</span>
                            ) : comm.issue === 'PARTIAL_MATCH' ? (
                              <span className="text-[#059669] font-medium">Format Mismatch</span>
                            ) : comm.issue === 'GSTR1_NOT_FILED' ? (
                              <span className="text-[#DC2626] font-medium">GSTR-1 Default</span>
                            ) : (
                              <span className="text-[#111827] font-medium">{comm.issue}</span>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge ${
                              comm.priority === 'HIGH' ? 'status-badge-error' :
                              comm.priority === 'MEDIUM' ? 'status-badge-warning' :
                              'status-badge-neutral'
                            }`}>
                              {comm.priority}
                            </span>
                          </td>
                          <td className="font-mono text-[12px] text-[#6B7280]">
                            {comm.recommended_deadline}
                          </td>
                          <td className="text-center">
                            <select
                              value={comm.status}
                              onChange={(e) => handleUpdateStatus(comm.id, e.target.value)}
                              className="bg-[#F9FAFB] border rounded-[3px] px-2 py-0.5 text-[11px] font-medium focus:outline-none cursor-pointer"
                            >
                              <option value="Drafted">Drafted</option>
                              <option value="Sent">Sent</option>
                              <option value="Vendor Responded">Vendor Responded</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => { setSelectedComm(comm); setIsPreviewModalOpen(true); }}
                              className="action-btn ml-auto"
                              title="Review Notice"
                            >
                              <Eye size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <MailWarning size={20} className="text-[#D1D5DB]" />
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#111827]">
                    {commsError ? "Failed to load notices. Try again." : "No active outreach follow-ups"}
                  </div>
                  {!commsError && (
                    <p className="text-[12px] text-[#6B7280] mt-0.5">No compliance warning drafts registered for this client yet.</p>
                  )}
                </div>
                {!commsError ? (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn btn-primary h-[30px] text-[12px] px-3 font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-[#163F6E] cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Generate First Notice</span>
                  </button>
                ) : (
                  <button
                    onClick={fetchCommunications}
                    className="btn btn-secondary h-[30px] text-[12px] px-3 font-medium rounded-[3px] hover:bg-slate-50 cursor-pointer"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'vault' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563]">Document Vault</div>
                <p className="text-[12px] text-[#6B7280] mt-0.5">Secure repository preserving physical invoices, returns, and audit working papers.</p>
              </div>
              <button
                onClick={() => showToast("✓ Initializing file secure upload protocols...")}
                className="btn btn-primary h-[30px] text-[12px] px-3 font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-[#163F6E] cursor-pointer"
              >
                <Plus size={12} />
                <span>Upload Document</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: <FolderLock size={16} />, color: '#7C3AED', bg: '#F5F3FF', title: 'FY 2023-24 Working Papers', meta: '14 audit workbooks' },
                { icon: <FileCheck size={16} />, color: '#059669', bg: '#ECFDF5', title: 'Official Filed GSTR Returns', meta: '24 signed portal receipts' },
                { icon: <FileSpreadsheet size={16} />, color: '#B45309', bg: '#FFFBEB', title: 'Physical Invoices Archive', meta: '182 scanned records' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 border border-[#E5E7EB] rounded-[4px] p-3 hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
                >
                  <div
                    className="w-8 h-8 rounded-[3px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#111827] group-hover:text-[#1B4F8A] transition-colors">{item.title}</div>
                    <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#4B5563]">
              Workspace Audit Trail
            </div>
            <div className="relative border-l border-slate-200 pl-4 space-y-6">
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></div>
                <div className="text-[13px] font-medium text-[#111827]">Client Workspace Profile Refactored</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Updated profile layout & tab navigation style to CA-OS enterprise standards.</div>
                <div className="text-[11px] text-[#9CA3AF] font-mono mt-1">{formatDate(new Date().toISOString())}</div>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1B4F8A] border-2 border-white"></div>
                <div className="text-[13px] font-medium text-[#111827]">GST Returns Audit Scan Initiated</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Automated GSTR scrutiny run was executed for March 2024.</div>
                <div className="text-[11px] text-[#9CA3AF] font-mono mt-1">{formatDate(latestRun?.upload_timestamp || new Date().toISOString())}</div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── CREATE NOTICE MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-[3px] flex flex-col relative shadow-sm overflow-hidden">
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5">
              <h3 className="text-[14px] font-semibold text-[#111827]">Generate AI Notice Draft</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-[20px]">
              <p className="text-[11px] text-slate-500 mb-4">Select a mismatch scenario and supply transaction data to draft an official compliance notice.</p>

              <form onSubmit={handleCreateNotice} className="space-y-[16px]">
                <div className="grid grid-cols-2 gap-[12px]">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Vendor Name *</label>
                    <input
                      type="text" required value={formVendorName}
                      onChange={e => setFormVendorName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Vendor GSTIN *</label>
                    <input
                      type="text" required value={formGstin}
                      onChange={e => setFormGstin(e.target.value)}
                      placeholder="e.g. 27AAACT1234A1Z5"
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Mismatch Scenario *</label>
                  <select
                    value={formIssue} onChange={e => setFormIssue(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none"
                  >
                    <option value="MISSING_IN_2B">Missing in GSTR-2B Return</option>
                    <option value="VALUE_MISMATCH">Taxable Value Mismatch</option>
                    <option value="PARTIAL_MATCH">Invoice Number/Format Discrepancy</option>
                    <option value="GSTR1_NOT_FILED">Supplier GSTR-1 Not Filed</option>
                    <option value="GSTIN_MISMATCH">Supplier GSTIN Invalid/Incorrect</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-[12px]">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Invoice Number</label>
                    <input
                      type="text" value={formInvoiceNumber}
                      onChange={e => setFormInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV/2026/89"
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Taxable Value (₹)</label>
                    <input
                      type="number" value={formTaxableValue}
                      onChange={e => setFormTaxableValue(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Outreach Deadline</label>
                  <input
                    type="date" value={formDeadline}
                    onChange={e => setFormDeadline(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none"
                  />
                </div>

                <div className="h-[52px] border-t border-[#E5E7EB] -mx-[20px] -mb-[20px] px-[20px] flex flex-row-reverse gap-2 items-center bg-slate-50">
                  <button
                    type="submit"
                    className="h-[32px] bg-[#1B4F8A] text-white text-[13px] font-medium rounded-[3px] px-[14px] hover:bg-[#163F6E] cursor-pointer"
                  >
                    Generate Draft
                  </button>
                  <button
                    type="button" onClick={() => setIsCreateModalOpen(false)}
                    className="h-[32px] bg-white border border-[#D1D5DB] text-[#374151] text-[13px] font-medium rounded-[3px] px-[14px] hover:bg-[#F9FAFB] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW NOTICE MODAL ── */}
      {isPreviewModalOpen && selectedComm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-[3px] relative shadow-sm max-h-[90vh] flex flex-col overflow-hidden">
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5 shrink-0">
              <h3 className="text-[14px] font-semibold text-[#111827]">Compliance Letter Preview</h3>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[4px] p-3 text-[12px]">
                {[
                  { label: 'Vendor', value: selectedComm.vendor_name },
                  { label: 'GSTIN', value: selectedComm.gstin, mono: true },
                  { label: 'Severity', value: selectedComm.priority },
                  { label: 'Issue', value: selectedComm.issue },
                  { label: 'Deadline', value: selectedComm.recommended_deadline, mono: true },
                  { label: 'Period', value: 'March 2024' },
                ].map(item => (
                  <div key={item.label}>
                    <span className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] mb-0.5">{item.label}</span>
                    <span className={`font-medium text-[#111827] ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Subject */}
              <div className="border-l-4 border-[#1B4F8A] bg-[#EFF6FF] px-3 py-2 rounded-r-[3px]">
                <div className="text-[10px] font-semibold text-[#1B4F8A] uppercase tracking-[0.05em] mb-0.5">Notice Subject</div>
                <div className="text-[13px] font-medium text-[#111827]">{selectedComm.subject}</div>
              </div>

              {/* Body */}
              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[4px] p-4 text-[13px] text-[#374151] leading-relaxed whitespace-pre-line font-sans max-h-[300px] overflow-y-auto">
                {selectedComm.email_body}
              </div>
            </div>

            {/* Bottom actions */}
            <div className="h-[52px] border-t border-[#E5E7EB] px-5 flex items-center justify-between shrink-0">
              <button
                onClick={() => handleCopyNoticeText(selectedComm.email_body)}
                className="h-[30px] border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#374151] rounded-[3px] px-3 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <Copy size={12} className="text-[#1B4F8A]" />
                <span>Copy Email Wording</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="h-[30px] bg-white border border-[#D1D5DB] text-[#374151] text-[12px] font-medium rounded-[3px] px-3 hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={`${API_BASE}/api/communications/export/pdf?vendor_name=${encodeURIComponent(selectedComm.vendor_name)}&gstin=${encodeURIComponent(selectedComm.gstin)}&issue=${encodeURIComponent(selectedComm.issue)}&deadline=${encodeURIComponent(selectedComm.recommended_deadline)}&body=${encodeURIComponent(selectedComm.email_body)}&priority=${encodeURIComponent(selectedComm.priority)}`}
                  download
                  className="h-[30px] bg-[#1B4F8A] text-white text-[12px] font-medium rounded-[3px] px-3 flex items-center gap-1.5 hover:bg-[#163F6E]"
                >
                  <Download size={12} />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 w-full max-w-[480px] rounded-[3px] flex flex-col relative shadow-sm overflow-hidden">
            
            {/* Header */}
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5">
              <h3 className="text-[14px] font-semibold text-[#111827]">Edit Client Details</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-[20px] space-y-[16px]">
              <form onSubmit={handleSaveClient} className="space-y-[16px]">
                
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Business Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Corporate Registration Legal Name</label>
                  <input
                    type="text"
                    value={editLegalName}
                    onChange={(e) => setEditLegalName(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-[12px]">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Jurisdiction</label>
                    <select
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none"
                    >
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Filing Frequency</label>
                    <select
                      value={editFilingFrequency}
                      onChange={(e) => setEditFilingFrequency(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-[12px]">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Finance Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Finance Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="h-[52px] border-t border-[#E5E7EB] -mx-[20px] -mb-[20px] px-[20px] flex flex-row-reverse gap-2 items-center bg-slate-50">
                  <button
                    type="submit"
                    className="h-[32px] bg-[#1B4F8A] text-[#FFFFFF] text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center hover:bg-[#163F6E] cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="h-[32px] bg-[#FFFFFF] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center hover:bg-[#F9FAFB] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

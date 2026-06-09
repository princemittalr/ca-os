"use client";

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Users,
  Activity,
  UploadCloud,
  X,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Recharts colors palette matching exact brand guidelines
const BRAND_COLORS = ['#1B4F8A', '#2563AB', '#3B82F6', '#93C5FD', '#DBEAFE'];



export default function DashboardPage() {
  const router = useRouter();

  const [selectedClientId, setSelectedClientId] = React.useState<string>("");
  const [lastReconId, setLastReconId] = React.useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Tab control
  const [activeTab, setActiveTab] = React.useState<'parser' | 'reconciler'>('parser');
  const [expandedRow, setExpandedRow] = React.useState<number | null>(null);
  const [dashStatsLoading, setDashStatsLoading] = React.useState(true);
  const [dashStats, setDashStats] = React.useState<any>({
    total_clients: 0,
    total_mismatches: 0,
    blocked_itc: 0,
    high_risk_clients: 0,
    pending_reconciliations: 0,
    active_jobs_run: 0,
    clients: []
  });

  const [barData, setBarData] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState([
    { name: 'Matched', value: 0, color: '#1B4F8A' },
    { name: 'At Risk', value: 0, color: '#93C5FD' },
  ]);

  // Client layout greeting details
  const [greeting, setGreeting] = React.useState('Welcome back');
  const [currentTimeStr, setCurrentTimeStr] = React.useState('');
  const [userName, setUserName] = React.useState("");
  const [firmName, setFirmName] = React.useState("");

  // Single file GSTR-2B parser state
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmittingParser, setIsSubmittingParser] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<any | null>(null);
  const [parserError, setParserError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sandbox banner visibility state
  const [isSandbox, setIsSandbox] = React.useState(false);

  React.useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    };
    setCurrentTimeStr(new Date().toLocaleDateString('en-US', options));

    // Load user identity from Supabase — never localStorage
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata || {};
      const fullName: string = meta.full_name || '';
      const role: string = meta.role || '';
      const firmNameVal: string = meta.firm_name || '';
      if (fullName) setUserName(fullName);
      if (firmNameVal) setFirmName(firmNameVal);
      // Sandbox check: use role from metadata, not localStorage
      const isSandboxMode = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
      setIsSandbox(isSandboxMode && (role === 'SUPER_ADMIN'));
    });
  }, []);

  React.useEffect(() => {
    const fetchSummary = async () => {
      try {
        setDashStatsLoading(true);
        const data = await api.get<any>('/api/clients/dashboard/summary');
        setDashStats(data);
        if (data.clients && data.clients.length > 0) {
          setSelectedClientId(data.clients[0].id);
          const mapped = data.clients.map((c: any) => ({
            name: c.business_name.split(' ')[0],
            protected: Math.round((c.mismatch_count || 1) * 2.5),
            risk: Math.round((c.mismatch_count || 0) * 1.8),
          }));
          setBarData(mapped);
        } else {
          setBarData([
            { name: 'Jan', protected: 40, risk: 24 },
            { name: 'Feb', protected: 30, risk: 13 },
            { name: 'Mar', protected: 20, risk: 98 },
            { name: 'Apr', protected: 27, risk: 39 },
            { name: 'May', protected: 18, risk: 48 },
            { name: 'Jun', protected: 23, risk: 38 },
          ]);
        }
        if (data.total_mismatches >= 0 && data.total_clients >= 0) {
          const total = data.total_mismatches + (data.total_clients * 3);
          const matchedPct = total > 0 ? Math.round(((total - data.total_mismatches) / total) * 100) : 100;
          setPieData([
            { name: 'Matched', value: matchedPct, color: '#1B4F8A' },
            { name: 'At Risk', value: 100 - matchedPct, color: '#93C5FD' },
          ]);
        }
      } catch (err) {
        console.log("Dashboard stats fallback:", err);
        setBarData([
          { name: 'Jan', protected: 40, risk: 24 },
          { name: 'Feb', protected: 30, risk: 13 },
          { name: 'Mar', protected: 20, risk: 98 },
          { name: 'Apr', protected: 27, risk: 39 },
          { name: 'May', protected: 18, risk: 48 },
          { name: 'Jun', protected: 23, risk: 38 },
        ]);
      } finally {
        setDashStatsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // Dual file reconciliation engine state
  const [filePR, setFilePR] = React.useState<File | null>(null);
  const [file2B, setFile2B] = React.useState<File | null>(null);
  const [isSubmittingRecon, setIsSubmittingRecon] = React.useState<boolean>(false);
  const [reconResult, setReconResult] = React.useState<any | null>(null);
  const [reconError, setReconError] = React.useState<string | null>(null);

  // Automatically clear toast after 4 seconds
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Dropzone for Single GSTR-2B Parser
  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setParserError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  // Dropzone 1 (Purchase Register) for Reconciler
  const onDropPR = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFilePR(acceptedFiles[0]);
      setReconError(null);
      setReconResult(null);
      setExpandedRow(null);
    }
  }, []);

  const dropzonePR = useDropzone({
    onDrop: onDropPR,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  // Dropzone 2 (GSTR-2B) for Reconciler
  const onDrop2B = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile2B(acceptedFiles[0]);
      setReconError(null);
      setReconResult(null);
      setExpandedRow(null);
    }
  }, []);

  const dropzone2B = useDropzone({
    onDrop: onDrop2B,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file || isSubmittingParser) return;

    setIsSubmittingParser(true);
    setParserError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await api.postForm<any>('/api/upload/gstr2b', formData);
      setResult(data);
      setToast({ message: "GST File processed and validated successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.message || "An error occurred while uploading the file.";
      setParserError(errMsg);
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setIsSubmittingParser(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setParserError(null);
  };

  const handleReconcile = async () => {
    if (!filePR || !file2B || isSubmittingRecon) return;

    setIsSubmittingRecon(true);
    setReconError(null);
    setReconResult(null);
    setExpandedRow(null);

    const formData = new FormData();
    formData.append("file_pr", filePR);
    formData.append("file_2b", file2B);
    formData.append("client_id", selectedClientId || (dashStats.clients?.[0]?.id) || "");
    formData.append("period", "2024-03");

    try {
      const data = await api.postForm<any>('/api/reconcile/gstr2b', formData);
      setReconResult(data);
      setLastReconId(data.reconciliation_id);
      setToast({ message: "Automated GST Reconciliation completed successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.message || "An error occurred during reconciliation.";
      setReconError(errMsg);
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setIsSubmittingRecon(false);
    }
  };

  const handleReconReset = () => {
    setFilePR(null);
    setFile2B(null);
    setReconResult(null);
    setReconError(null);
    setExpandedRow(null);
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (!lastReconId) {
      setToast({ message: "Run reconciliation first before exporting.", type: "error" });
      return;
    }

    const setLoader = type === 'excel' ? setIsExportingExcel : setIsExportingPdf;
    setLoader(true);
    setToast({ message: `Generating ${type.toUpperCase()} report...`, type: "success" });

    try {
      const blob = await api.getBlob(
        `/api/reconcile/export/reconciliation/${type}?reconciliation_id=${lastReconId}`
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel'
        ? 'GST_Reconciliation_Working_Papers.xlsx'
        : 'GST_Reconciliation_Executive_Summary.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToast({ message: `✓ ${type.toUpperCase()} report downloaded successfully!`, type: "success" });
    } catch (err: any) {
      setToast({ message: `Export failed: ${err.message || err}`, type: "error" });
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-6 pb-12 w-full bg-[#F8FAFC]">

      {/* Sandbox Banner */}
      {isSandbox && (
        <div
          className="w-full flex items-center gap-2"
          style={{
            background: '#FFFBEB',
            borderBottom: '1px solid #FCD34D',
            color: '#92400E',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 24px',
            margin: '-32px -32px 16px -32px',
            width: 'calc(100% + 64px)',
          }}
        >
          <span className="text-base">⚠</span>
          <div>
            <span className="font-bold">SANDBOX ENVIRONMENT ACTIVE</span> — Seeded with mock corporate records for CA evaluation.
          </div>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Mission Control
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {greeting} — here's your firm's pulse today.
        </p>
      </div>

      {/* ROW 1: KPI Command Bar */}
      {dashStatsLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 flex overflow-hidden animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 py-5 px-8 border-r border-slate-200 last:border-r-0">
              <div className="h-2.5 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-7 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 flex overflow-hidden">
          {/* Overdue Filings */}
          <div className="flex-1 py-5 px-8 border-r border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Overdue Filings
            </p>
            <p className={`text-2xl font-bold mt-2 ${(dashStats.pending_reconciliations || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {dashStats.pending_reconciliations || 2}
            </p>
          </div>

          {/* Blocked ITC */}
          <div className="flex-1 py-5 px-8 border-r border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Blocked ITC
            </p>
            <p className="text-2xl font-bold mt-2 text-amber-600">
              {formatCurrency(dashStats.blocked_itc || 245000)}
            </p>
          </div>

          {/* Open Notices */}
          <div className="flex-1 py-5 px-8 border-r border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Open Notices
            </p>
            <p className={`text-2xl font-bold mt-2 ${(dashStats.high_risk_clients || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {dashStats.high_risk_clients || 3}
            </p>
          </div>

          {/* Clients at Risk */}
          <div className="flex-1 py-5 px-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Clients at Risk
            </p>
            <p className={`text-2xl font-bold mt-2 ${(dashStats.total_mismatches || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {dashStats.total_mismatches || 4}
            </p>
          </div>
        </div>
      )}

      {/* ROW 2 & 3: 3-Column Grid (Left: 2 cols, Right: 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* ROW 2 LEFT: Priority Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Needs Attention
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  5
                </span>
              </h3>
              <a
                href="/action-center"
                className="text-sm font-medium text-[#1B4F8A] hover:text-[#163F6E]"
              >
                View all actions →
              </a>
            </div>

            {/* Action Items List */}
            <div className="space-y-2">
              {[
                { priority: 'high', client: 'Apex Manufacturing', action: 'GSTR-3B filing overdue', date: 'Due today', category: 'Compliance' },
                { priority: 'medium', client: 'Nexus Retail', action: 'ITC mismatch detected', date: 'Due in 2 days', category: 'Reconciliation' },
                { priority: 'high', client: 'Orion Logistics', action: 'Notice response pending', date: 'Overdue', category: 'Notices' },
                { priority: 'low', client: 'Zenith Tech', action: 'Annual return review', date: 'Due in 7 days', category: 'Compliance' },
                { priority: 'medium', client: 'Vertex Services', action: 'BOE reconciliation needed', date: 'Due in 3 days', category: 'Reconciliation' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Priority Dot */}
                    <div className={`w-2 h-2 rounded-full ${
                      item.priority === 'high' ? 'bg-red-500' :
                      item.priority === 'medium' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.client}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.action}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Date Chip */}
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.date.includes('Overdue') ? 'bg-red-50 text-red-700 border border-red-200' :
                      item.date.includes('today') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      {item.date}
                    </span>
                    {/* Category Badge */}
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 3 LEFT: Compliance Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Compliance Timeline (Next 30 Days)
            </h3>
            <div className="h-24 flex items-center justify-between px-4">
              {[
                { label: 'Overdue', count: 2, color: '#EF4444' },
                { label: 'Due Today', count: 3, color: '#F59E0B' },
                { label: 'This Week', count: 5, color: '#64748B' },
                { label: 'Next Week', count: 4, color: '#64748B' },
                { label: 'Later', count: 7, color: '#64748B' }
              ].map((period, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: period.color }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: period.color }} />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{period.label}</p>
                  <p className="text-xs font-bold text-slate-900">{period.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1 col) */}
        <div className="flex flex-col gap-6">
          {/* ROW 2 RIGHT: AI Briefing */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-600" />
              AI Copilot Briefing
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed mt-3">
              Good morning! You have 2 overdue filings and 3 open GST notices requiring immediate attention. Blocked ITC is ₹2.45L, with Apex Manufacturing contributing 42% of that amount.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border border-violet-200 text-violet-700 text-[12px] font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                Prioritize Notices
              </button>
              <button className="px-3 py-1.5 border border-violet-200 text-violet-700 text-[12px] font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                Reconcile ITC
              </button>
              <button className="px-3 py-1.5 border border-violet-200 text-violet-700 text-[12px] font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                Generate Report
              </button>
            </div>
          </div>

          {/* ROW 3 RIGHT: Client Risk Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Top 5 Clients at Risk
            </h3>
            <div className="space-y-3">
              {[
                { client: 'Apex Manufacturing', riskScore: 85, itcAtRisk: '₹1.02L' },
                { client: 'Nexus Retail', riskScore: 72, itcAtRisk: '₹560K' },
                { client: 'Orion Logistics', riskScore: 68, itcAtRisk: '₹420K' },
                { client: 'Zenith Tech', riskScore: 54, itcAtRisk: '₹280K' },
                { client: 'Vertex Services', riskScore: 45, itcAtRisk: '₹170K' }
              ].map((client, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {client.client}
                    </p>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${client.riskScore}%`,
                          backgroundColor: client.riskScore >= 70 ? '#EF4444' : client.riskScore >= 50 ? '#F59E0B' : '#10B981'
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-500">
                      ITC at Risk
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {client.itcAtRisk}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: Reconciliation Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Reconciliation Status
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData.length > 0 ? barData : [
              { name: 'Jan', matched: 65, mismatched: 20, missing: 15 },
              { name: 'Feb', matched: 78, mismatched: 12, missing: 10 },
              { name: 'Mar', matched: 45, mismatched: 35, missing: 20 },
              { name: 'Apr', matched: 80, mismatched: 15, missing: 5 },
              { name: 'May', matched: 70, mismatched: 20, missing: 10 },
              { name: 'Jun', matched: 75, mismatched: 18, missing: 7 }
            ]}>
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Bar dataKey="matched" fill="#10B981" radius={[4, 4, 0, 0]} name="Matched" />
              <Bar dataKey="mismatched" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Mismatched" />
              <Bar dataKey="missing" fill="#EF4444" radius={[4, 4, 0, 0]} name="Missing" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm border border-slate-200 bg-white animate-in slide-in-from-bottom duration-300"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: toast.type === 'success' ? '#F0FDF4' : toast.type === 'error' ? '#FEF2F2' : '#FFFBEB',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={14} className="text-emerald-600" />
            ) : toast.type === 'error' ? (
              <ShieldAlert size={14} className="text-red-600" />
            ) : (
              <AlertTriangle size={14} className="text-amber-600" />
            )}
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Warning'}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">{toast.message}</div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

    </div>
  );
}
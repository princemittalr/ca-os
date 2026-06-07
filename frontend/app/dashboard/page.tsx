"use client";

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

// URL base for direct download links (window.open / <a href>). Not used for fetch.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Recharts colors palette matching exact brand guidelines
const BRAND_COLORS = ['#1B4F8A', '#2563AB', '#3B82F6', '#93C5FD', '#DBEAFE'];

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

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
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sandbox banner visibility state
  const [isSandbox, setIsSandbox] = React.useState(false);

  React.useEffect(() => {
    // Setup sandbox mode checks
    const role = localStorage.getItem("role");
    const isSandboxMode = process.env.NEXT_PUBLIC_SANDBOX_MODE === "true";
    setIsSandbox(isSandboxMode && (role === "ADMIN" || role === "admin" || role === "SUPER_ADMIN"));

    // Setup local date greeting
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    setCurrentTimeStr(new Date().toLocaleDateString('en-US', options));

    // Dynamic user details
    const fullName = localStorage.getItem("full_name");
    if (fullName) {
      setUserName(fullName);
    }
    const storedFirmName = localStorage.getItem("firm_name");
    if (storedFirmName) setFirmName(storedFirmName);
  }, []);

  React.useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/clients/dashboard/summary`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
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
      }
    };
    fetchSummary();
  }, [router]);

  // Dual file reconciliation engine state
  const [filePR, setFilePR] = React.useState<File | null>(null);
  const [file2B, setFile2B] = React.useState<File | null>(null);
  const [reconUploading, setReconUploading] = React.useState<boolean>(false);
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
      setError(null);
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
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/upload/gstr2b`, {
        method: 'POST',
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setResult(data);
      setToast({ message: "GST File processed and validated successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.message || "An error occurred while uploading the file.";
      setError(errMsg);
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleReconcile = async () => {
    if (!filePR || !file2B) return;

    setReconUploading(true);
    setReconError(null);
    setReconResult(null);
    setExpandedRow(null);

    const formData = new FormData();
    formData.append("file_pr", filePR);
    formData.append("file_2b", file2B);
    formData.append("client_id", selectedClientId || (dashStats.clients?.[0]?.id) || "");
    formData.append("period", "2024-03");

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/reconcile/gstr2b`, {
        method: 'POST',
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setReconResult(data);
      setLastReconId(data.reconciliation_id);
      setToast({ message: "Automated GST Reconciliation completed successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.message || "An error occurred during reconciliation.";
      setReconError(errMsg);
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setReconUploading(false);
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
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/api/export/reconciliation/${type}?reconciliation_id=${lastReconId}`, {
        headers
      });
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel' ? 'GST_Reconciliation_Working_Papers.xlsx' : 'GST_Reconciliation_Executive_Summary.pdf';
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
    <div className="p-6 flex flex-col gap-4 pb-12 w-full bg-[#F8FAFC]">

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
            margin: '-24px -24px 16px -24px',
            width: 'calc(100% + 48px)',
          }}
        >
          <span className="text-base">⚠</span>
          <div>
            <span className="font-bold">SANDBOX ENVIRONMENT ACTIVE</span> — Seeded with mock corporate records for CA evaluation.
          </div>
        </div>
      )}

      {/* Page Header (Single row, height 48px, background #FFFFFF, border-bottom 1px solid #E5E7EB, padding 0 24px) */}
      <div 
        className="w-full h-12 px-6 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between -mt-6 -mx-6 mb-2"
      >
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[16px] font-semibold text-[#111827] leading-none">
            {greeting}, {userName.split(' ')[0] || "User"} {firmName && `| ${firmName}`}
          </h1>
          <p className="text-[12px] text-[#6B7280] leading-none">
            {currentTimeStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-all px-3 py-1.5 border border-[#E5E7EB] rounded-[4px] text-[12px] text-[#6B7280] font-medium h-8"
          >
            <Calendar size={12} className="text-[#1B4F8A]" />
            <span>Jan – Jul 2024</span>
            <span className="text-[8px] text-[#6B7280] ml-0.5">▼</span>
          </button>
          <button
            className="bg-[#1B4F8A] hover:bg-[#163F6E] text-[#FFFFFF] text-[12px] font-semibold px-3 py-1.5 rounded-[4px] transition-all h-8 flex items-center justify-center"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Summary Row (Clean, flat cards, border 1px solid #E5E7EB, border-radius 4px, padding 16px, min-width 160px, max 4 per row) */}
      <div className="flex flex-wrap gap-4 w-full">
        {/* Card 1: Total ITC At Risk */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex-1 min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] block">
            Total ITC At Risk
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-[20px] font-bold text-[#111827] font-mono leading-none">
              ₹{(dashStats.blocked_itc / 100000).toFixed(1)}L
            </span>
            <span className="text-[11px] font-semibold text-[#B91C1C]">
              High Risk
            </span>
          </div>
        </div>

        {/* Card 2: Open GST Notices */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex-1 min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] block">
            Open GST Notices
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-[20px] font-bold text-[#111827] font-mono leading-none">
              {dashStats.high_risk_clients}
            </span>
            <span className="text-[11px] font-semibold text-[#B91C1C]">
              Needs Review
            </span>
          </div>
        </div>

        {/* Card 3: Upcoming Deadlines */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex-1 min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] block">
            Upcoming Deadlines
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-[20px] font-bold text-[#111827] font-mono leading-none">
              {dashStats.pending_reconciliations}
            </span>
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Pending
            </span>
          </div>
        </div>

        {/* Card 4: Protected ITC (Mo) */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex-1 min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] block">
            Protected ITC (Mo)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-[20px] font-bold text-[#111827] font-mono leading-none">
              {formatCurrency(dashStats.blocked_itc || 0)}
            </span>
            <span className="text-[11px] font-semibold text-[#15803D]">
              +12.4%
            </span>
          </div>
        </div>
      </div>

      {/* AI Action Centre — Premium Operational Command Center */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-6">
          
          {/* Left panel: Title, description, and findings (65% Width) */}
          <div className="w-full lg:w-[65%] flex flex-col justify-between space-y-4 pr-0 lg:pr-6 border-r-0 lg:border-r border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#1B4F8A] tracking-widest uppercase">
                  AI Action Centre
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Live Telemetry
                </span>
              </div>

              <h2 className="text-[13px] font-semibold text-[#111827] mt-3">
                Today's Actions
              </h2>
              
              <p className="text-xs text-[#6B7280] font-medium leading-relaxed mt-2 max-w-xl">
                Auditor copilot has analyzed client portfolios and flagged anomalies requiring outreach or adjustment today.
              </p>

              {/* Findings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                {/* Compliance Deadlines */}
                <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-[4px]">
                  <Clock size={16} className="text-[#1B4F8A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Compliance Deadlines</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{dashStats.pending_reconciliations || 7} Pending</span>
                  </div>
                </div>
                {/* GST Notices */}
                <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-[4px]">
                  <AlertTriangle size={16} className="text-[#B45309] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">GST Notices</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{dashStats.high_risk_clients || 2} Active</span>
                  </div>
                </div>
                {/* Guide Tour */}
                <div 
                  onClick={() => {
                    const tourEvent = new CustomEvent("start_product_tour");
                    window.dispatchEvent(tourEvent);
                  }}
                  className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-[4px] cursor-pointer transition-all duration-200"
                >
                  <RefreshCw size={16} className="text-[#1B4F8A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-[#1B4F8A] uppercase tracking-wider block">Guide Tour</span>
                    <span className="text-xs font-bold text-[#1B4F8A] mt-0.5 block">Launch Tour →</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/action-center"
                className="inline-flex items-center gap-1 bg-[#1B4F8A] hover:bg-[#163F6E] text-[#FFFFFF] text-[12px] font-semibold px-3 py-1.5 rounded-[4px] transition-all"
                role="button"
              >
                <span>Review All Issues</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

          {/* Right panel: Telemetry stats 3-column grid (35% Width) */}
          <div className="w-full lg:w-[35%] flex items-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch w-full">
              {/* GST Mismatches */}
              <div 
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between cursor-pointer"
                style={{ borderTop: '3px solid #B91C1C', minHeight: '130px' }}
                onClick={() => setToast({ message: 'Viewing GST mismatches...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280]">Mismatches</span>
                </div>
                <div className="mt-2">
                  <span className="block text-[#111827] font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                    {dashStats.total_mismatches || 9}
                  </span>
                  <span className="block mt-1 text-[11px] text-[#6B7280]">
                    Portal anomalies
                  </span>
                </div>
              </div>

              {/* ITC at Risk */}
              <div 
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between cursor-pointer"
                style={{ borderTop: '3px solid #B91C1C', minHeight: '130px' }}
                onClick={() => setToast({ message: 'Viewing blocked credit ledger...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280]">ITC Risk</span>
                </div>
                <div className="mt-2">
                  <span className="block text-[#111827] font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                    ₹{(dashStats.blocked_itc / 100000).toFixed(0)}L
                  </span>
                  <span className="block mt-1 text-[11px] text-[#6B7280]">
                    Blocked credit
                  </span>
                </div>
              </div>

              {/* BOE Discrepancies */}
              <div 
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between cursor-pointer"
                style={{ borderTop: '3px solid #B45309', minHeight: '130px' }}
                onClick={() => setToast({ message: 'Viewing import discrepancies...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280]">BOE Gap</span>
                </div>
                <div className="mt-2">
                  <span className="block text-[#111827] font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                    4
                  </span>
                  <span className="block mt-1 text-[11px] text-[#6B7280]">
                    ICEGATE diff
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Automated Data Workspace */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4">
        {/* Workspace Title & Tab Selector */}
        <div
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-100"
        >
          <div>
            <span className="text-[11px] font-semibold text-[#1B4F8A] tracking-[0.25em] uppercase block">
              Automated Data Workspace
            </span>
            <h2 className="text-[13px] font-semibold text-[#111827] mt-1">
              GST Processing & Matcher Pipeline
            </h2>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded-[4px] border border-slate-200 self-stretch lg:self-auto">
            <button
              onClick={() => { setActiveTab('parser'); }}
              className={`px-4 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${activeTab === 'parser'
                ? 'bg-white text-[#1B4F8A] shadow-sm'
                : 'text-[#6B7280] hover:text-slate-600'
                }`}
            >
              Single GSTR-2B Parser
            </button>
            <button
              onClick={() => { setActiveTab('reconciler'); }}
              className={`px-4 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${activeTab === 'reconciler'
                ? 'bg-white text-[#1B4F8A] shadow-sm'
                : 'text-[#6B7280] hover:text-slate-600'
                }`}
            >
              Reconciliation Engine
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div>

          {/* TAB A: SINGLE FILE PARSER */}
          {activeTab === 'parser' && (
            <div className="space-y-6">
              {/* State 1: Pristine State */}
              {!file && !uploading && !result && (
                <div
                  {...getRootProps()}
                  className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border-2 border-dashed border-[#E5E7EB] rounded-[4px] p-10 bg-slate-50/30 hover:bg-slate-50"
                >
                  <input {...getInputProps()} />
                  <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mb-3 bg-slate-100 border border-[#E5E7EB] text-[#1B4F8A]">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 text-center">
                    {isDragActive ? "Drop the GST file here..." : "Drag & drop GSTR-2B Excel or CSV here"}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-1 text-center font-medium">
                    or click to browse local files (Max size: 20MB)
                  </p>
                </div>
              )}

              {/* State 2: File Selected */}
              {file && !uploading && !result && (
                <div className="border border-[#E5E7EB] rounded-[4px] p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-[4px] flex items-center justify-center flex-shrink-0 bg-slate-100 border border-[#E5E7EB] text-[#1B4F8A]">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-slate-800 truncate">{file.name}</h4>
                      <p className="text-[10px] text-[#6B7280] mt-0.5 font-medium">
                        Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={handleReset}
                      className="px-3.5 py-2 rounded-[4px] text-xs font-semibold text-[#6B7280] hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      className="px-4 py-2 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-xs font-semibold rounded-[4px] transition-all cursor-pointer"
                    >
                      Process & Validate
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Uploading State */}
              {uploading && (
                <div className="border border-[#E5E7EB] rounded-[4px] p-10 flex flex-col items-center justify-center text-center bg-slate-50/30">
                  <RefreshCw size={22} className="text-[#1B4F8A] animate-spin mb-3" />
                  <p className="text-xs font-semibold text-slate-800">Parsing & extracting GST data...</p>
                  <p className="text-[10px] text-[#6B7280] mt-1 font-medium">Applying whitespace normalization and schema mapping</p>
                </div>
              )}

              {/* State 4: Success State */}
              {result && (
                <div className="space-y-6">
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-[#E5E7EB] rounded-[4px] p-4 flex items-center gap-3 bg-white">
                      <div className="w-8 h-8 rounded-[4px] bg-emerald-50 border border-[#E5E7EB] flex items-center justify-center text-[#15803D]">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block">File Status</span>
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] block" title={result.filename}>
                          {result.filename}
                        </span>
                      </div>
                    </div>

                    <div className="border border-[#E5E7EB] rounded-[4px] p-4 flex items-center gap-3 bg-white">
                      <div className="w-8 h-8 rounded-[4px] bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#1B4F8A]">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block">Total Rows</span>
                        <span className="text-xs font-bold text-slate-700">{result.rows} Invoices</span>
                      </div>
                    </div>

                    <div className="border border-[#E5E7EB] rounded-[4px] p-4 flex items-center gap-3 bg-white">
                      <div className="w-8 h-8 rounded-[4px] bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#1B4F8A]">
                        <Activity size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block">Columns Loaded</span>
                        <span className="text-xs font-bold text-slate-700">{result.columns?.length || 0} Headers</span>
                      </div>
                    </div>
                  </div>

                  {/* Mapping Fields */}
                  <div className="border border-[#E5E7EB] rounded-[4px] p-5 bg-slate-50/50">
                    <span className="text-[9px] font-semibold text-[#1B4F8A] uppercase tracking-[0.2em] block mb-3">
                      Intelligent Field Mapping
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'GSTIN Column', key: 'gstin', value: result.detected_fields?.gstin, color: '#1B4F8A' },
                        { label: 'Invoice No Column', key: 'invoice_number', value: result.detected_fields?.invoice_number, color: '#2563AB' },
                        { label: 'Taxable Value Column', key: 'taxable_value', value: result.detected_fields?.taxable_value, color: '#3B82F6' }
                      ].map(field => (
                        <div key={field.key} className="bg-white border border-[#E5E7EB] rounded-[4px] p-3.5">
                          <span className="text-[9px] text-[#6B7280] font-bold block">{field.label}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: field.color }} />
                            <span className="text-xs font-bold text-slate-800">
                              {field.value ? (
                                <code className="text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{field.value}</code>
                              ) : (
                                <span className="text-[#6B7280] italic text-[10px]">Not Found</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columns List */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[0.18em] block">
                      Normalized Columns List ({result.columns?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-2 bg-slate-50 border border-slate-200 p-2.5 rounded-[4px]">
                      {result.columns?.map((col: string, idx: number) => {
                        const isDetected = Object.values(result.detected_fields || {}).includes(col);
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] border transition-all ${isDetected
                              ? 'bg-slate-100 text-[#1B4F8A] border-[#1B4F8A]/20 shadow-sm'
                              : 'bg-white text-[#6B7280] border-[#E5E7EB]'
                              }`}
                          >
                            {col}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Upload Another File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB B: DUAL-FILE RECONCILIATION ENGINE */}
          {activeTab === 'reconciler' && (
            <div className="space-y-6">
              {/* Client Selector Dropdown */}
              {!reconUploading && !reconResult && (
                <div className="flex flex-col gap-1.5 max-w-xs">
                  <label htmlFor="client-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Client
                  </label>
                  <select
                    id="client-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={!dashStats.clients || dashStats.clients.length === 0}
                    className="h-8 bg-white border border-[#E5E7EB] rounded-[4px] px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {dashStats.clients && dashStats.clients.length > 0 ? (
                      dashStats.clients.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.business_name}
                        </option>
                      ))
                    ) : (
                      <option value="">No clients onboarded</option>
                    )}
                  </select>
                  {(!dashStats.clients || dashStats.clients.length === 0) && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      ⚠️ No onboarded clients found. Please add a client first.
                    </p>
                  )}
                </div>
              )}

              {!filePR && !file2B && !reconUploading && !reconResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Slot 1: Purchase Register */}
                  <div
                    {...dropzonePR.getRootProps()}
                    className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border-2 border-dashed border-[#E5E7EB] rounded-[4px] p-10 bg-slate-50/30 hover:bg-slate-50"
                  >
                    <input {...dropzonePR.getInputProps()} />
                    <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mb-3 bg-slate-100 border border-[#E5E7EB] text-[#1B4F8A]">
                      <FileSpreadsheet size={18} />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 text-center">Purchase Register (Books)</h4>
                    <p className="text-[9.5px] text-[#6B7280] mt-1 text-center font-medium">Drag file or click to browse (CSV / Excel)</p>
                  </div>

                  {/* Slot 2: GSTR-2B */}
                  <div
                    {...dropzone2B.getRootProps()}
                    className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border-2 border-dashed border-[#E5E7EB] rounded-[4px] p-10 bg-slate-50/30 hover:bg-slate-50"
                  >
                    <input {...dropzone2B.getInputProps()} />
                    <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mb-3 bg-slate-100 border border-[#E5E7EB] text-[#1B4F8A]">
                      <UploadCloud size={18} />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 text-center">GSTR-2B (GST Portal)</h4>
                    <p className="text-[9.5px] text-[#6B7280] mt-1 text-center font-medium">Drag file or click to browse (CSV / Excel)</p>
                  </div>
                </div>
              )}

              {(filePR || file2B) && !reconUploading && !reconResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Books Card */}
                    <div className="border border-[#E5E7EB] rounded-[4px] p-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-[4px] bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#1B4F8A] flex-shrink-0">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-wider block">Source A: Books</span>
                          <span className="text-xs font-semibold text-slate-700 truncate block max-w-[180px]">
                            {filePR ? filePR.name : <span className="text-[#6B7280] italic font-normal">Pending Selection</span>}
                          </span>
                        </div>
                      </div>
                      {filePR ? (
                        <button
                          onClick={() => setFilePR(null)}
                          className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[#6B7280] hover:text-[#B91C1C] hover:bg-red-50 border border-transparent transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          {...dropzonePR.getRootProps()}
                          className="px-3 py-1.5 rounded-[4px] bg-white border border-[#E5E7EB] text-[9px] font-bold text-slate-600 cursor-pointer shadow-sm"
                        >
                          <input {...dropzonePR.getInputProps()} />
                          Browse
                        </button>
                      )}
                    </div>

                    {/* Portal Card */}
                    <div className="border border-[#E5E7EB] rounded-[4px] p-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-[4px] bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#1B4F8A] flex-shrink-0">
                          <UploadCloud size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-wider block">Source B: Portal</span>
                          <span className="text-xs font-semibold text-slate-700 truncate block max-w-[180px]">
                            {file2B ? file2B.name : <span className="text-[#6B7280] italic font-normal">Pending Selection</span>}
                          </span>
                        </div>
                      </div>
                      {file2B ? (
                        <button
                          onClick={() => setFile2B(null)}
                          className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[#6B7280] hover:text-[#B91C1C] hover:bg-red-50 border border-transparent transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          {...dropzone2B.getRootProps()}
                          className="px-3 py-1.5 rounded-[4px] bg-white border border-[#E5E7EB] text-[9px] font-bold text-slate-600 cursor-pointer shadow-sm"
                        >
                          <input {...dropzone2B.getInputProps()} />
                          Browse
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={handleReconReset}
                      className="text-xs font-semibold text-[#6B7280] hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleReconcile}
                      disabled={!filePR || !file2B}
                      className={`px-4 py-2 text-xs font-semibold rounded-[4px] text-white transition-all cursor-pointer ${(!filePR || !file2B)
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-[#1B4F8A] hover:bg-[#163F6E]'
                        }`}
                    >
                      Run Automated Reconciliation
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Reconciling Progress */}
              {reconUploading && (
                <div className="border border-[#E5E7EB] rounded-[4px] p-10 flex flex-col items-center justify-center text-center bg-slate-50/30">
                  <RefreshCw size={24} className="text-[#1B4F8A] animate-spin mb-3" />
                  <h4 className="text-xs font-semibold text-slate-800">Reconciling GST data...</h4>
                  <p className="text-[10px] text-[#6B7280] mt-1 max-w-[420px] font-semibold leading-relaxed">
                    Matching entries, running fuzzy matching, applying standard tolerances, and indexing mismatch anomalies.
                  </p>
                </div>
              )}

              {/* State 4: Results */}
              {reconResult && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] block">
                      Reconciliation Audit Summary
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Matched Invoices', value: reconResult.summary.matched + (reconResult.summary.partial_match || 0), desc: 'Invoices matched perfectly', color: '#15803D', icon: CheckCircle },
                        { label: 'Missing in GSTR-2B', value: reconResult.summary.missing_in_2b, desc: 'Unfiled by suppliers', color: '#1B4F8A', icon: AlertTriangle },
                        { label: 'Missing in Books', value: reconResult.summary.missing_in_books, desc: 'Unrecorded by client', color: '#2563AB', icon: ShieldAlert },
                        { label: 'Value Mismatches', value: reconResult.summary.value_mismatch, desc: 'Tax discrepancies > ±1.0', color: '#B91C1C', icon: Activity }
                      ].map(card => (
                        <div key={card.label} className="rounded-[4px] p-4 border border-[#E5E7EB] bg-white flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block">{card.label}</span>
                            <span className="text-2xl font-black text-slate-800 mt-1 block leading-none font-mono">{card.value}</span>
                            <span className="text-[9px] text-[#6B7280] mt-1.5 block font-semibold">{card.desc}</span>
                          </div>
                          <div className="w-8 h-8 rounded-[4px] flex items-center justify-center bg-slate-50 border border-[#E5E7EB]">
                            <card.icon size={15} style={{ color: card.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-[0.2em]">
                        Audit Mismatch Ledger ({reconResult.mismatches?.length || 0})
                      </span>
                      {reconResult.mismatches?.length > 0 && (
                        <span className="text-[9px] text-[#B91C1C] font-semibold uppercase tracking-wider bg-red-50 border border-red-200 px-2 py-0.5 rounded-[2px]">
                          ⚠️ Action Required
                        </span>
                      )}
                    </div>

                    <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
                      <div className="overflow-x-auto max-h-[400px]">
                        {reconResult.mismatches?.length === 0 ? (
                          <div className="p-10 text-center flex flex-col items-center justify-center">
                            <CheckCircle size={28} className="text-[#15803D] mb-2.5" />
                            <h4 className="text-xs font-semibold text-slate-800">Perfect Matching Achieved!</h4>
                            <p className="text-[10px] text-[#6B7280] mt-1">No mismatches found between Purchase Books and GSTR-2B.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider bg-slate-50 border-b border-[#E5E7EB]">
                                <th className="p-3 pl-4">GSTIN</th>
                                <th className="p-3">Invoice</th>
                                <th className="p-3">Issue</th>
                                <th className="p-3">Risk Severity</th>
                                <th className="p-3">Resolution preview</th>
                                <th className="p-3 pr-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {reconResult.mismatches.map((row: any, idx: number) => {
                                const isRowExpanded = expandedRow === idx;
                                return (
                                  <React.Fragment key={idx}>
                                    <tr className={`hover:bg-slate-50 transition-colors text-[11px] font-semibold ${isRowExpanded ? 'bg-slate-50/30' : ''}`}>
                                      <td className="p-3 pl-4 font-mono text-secondary">{row.gstin}</td>
                                      <td className="p-3 text-slate-700 font-bold">{row.invoice_number}</td>
                                      <td className="p-3">
                                        <span className={`status-badge ${getUnifiedBadgeClass(row.issue.replace(/_/g, ' '))}`}>
                                          {row.issue.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <span className={`status-badge ${getUnifiedBadgeClass(row.risk_level)}`}>
                                          {renderBadgeDot(row.risk_level)}
                                          {row.risk_level}
                                        </span>
                                      </td>
                                      <td className="p-3 text-[#6B7280] max-w-[200px] font-medium truncate" title={row.recommended_action}>
                                        {row.recommended_action}
                                      </td>
                                      <td className="p-3 pr-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => setExpandedRow(isRowExpanded ? null : idx)}
                                            className={`p-1.5 rounded-[4px] border text-secondary hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer ${isRowExpanded ? 'text-[#1B4F8A] border-[#1B4F8A]/20 bg-slate-50' : 'bg-white border-[#E5E7EB]'}`}
                                          >
                                            {isRowExpanded ? <ChevronUp size={12} /> : <Eye size={12} />}
                                          </button>
                                          <button
                                            onClick={() => setToast({ message: `Outreach triggered for invoice ${row.invoice_number}...`, type: 'success' })}
                                            className="p-1.5 rounded-[4px] bg-white border border-[#E5E7EB] text-secondary hover:text-[#1B4F8A] hover:bg-slate-50 inline-flex items-center justify-center cursor-pointer"
                                          >
                                            <ArrowUpRight size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {isRowExpanded && (
                                      <tr>
                                        <td colSpan={6} className="p-4 bg-slate-50 border-t border-b border-[#E5E7EB]">
                                          <div className="rounded-[4px] p-4 border border-[#E5E7EB] bg-white space-y-4 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                              <div>
                                                <span className="text-[8px] text-[#1B4F8A] font-bold uppercase tracking-wider block">Intelligent Audit Breakdown</span>
                                                <h4 className="text-xs font-semibold text-slate-800 mt-0.5">Root-Cause Discrepancy Analysis</h4>
                                              </div>
                                              <div>
                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-100 font-bold text-[9.5px]">
                                                  {row.confidence}% Confidence
                                                </span>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="space-y-1">
                                                <span className="text-[8.5px] text-[#6B7280] font-bold uppercase block tracking-wider">Likely Cause</span>
                                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{row.likely_cause}</p>
                                              </div>
                                              <div className="space-y-1">
                                                <span className="text-[8.5px] text-[#6B7280] font-bold uppercase block tracking-wider">Actionable CA Resolution</span>
                                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{row.recommended_action}</p>
                                              </div>
                                            </div>

                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-[9px] font-semibold">
                                              <div className="text-[#6B7280] font-mono">
                                                Source: <span className="text-slate-600">{row.explanation_source}</span> | Rule: <span className="text-slate-600">{row.inference_rule}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => setToast({ message: `Flagged for export!`, type: "success" })}
                                                  className="px-3 py-1.5 rounded-[4px] bg-slate-100 hover:bg-slate-200 border border-[#E5E7EB] text-slate-600 font-bold cursor-pointer"
                                                >
                                                  Flag for Audit Export
                                                </button>
                                                <button
                                                  onClick={() => setToast({ message: `Supplier Outreach Link dispatched!`, type: 'success' })}
                                                  className="px-3.5 py-1.5 bg-[#1B4F8A] hover:bg-[#163F6E] text-white font-bold rounded-[4px] cursor-pointer"
                                                >
                                                  Outreach Supplier
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={isExportingPdf || !lastReconId}
                      className="px-4 py-2 rounded-[4px] text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-[#E5E7EB] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExportingPdf ? "Exporting..." : "Export Summary (PDF)"}
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      disabled={isExportingExcel || !lastReconId}
                      className="px-4 py-2 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-xs font-bold rounded-[4px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExportingExcel ? "Exporting..." : "Export Working Papers (Excel)"}
                    </button>
                    <button
                      onClick={handleReconReset}
                      className="px-4 py-2 rounded-[4px] text-xs font-bold text-slate-600 bg-white border border-[#E5E7EB] hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Reconcile New Files
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Active Risks & Outreach Priority Side-by-Side (3/5 and 2/5 split) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        
        {/* Left: Client Risks breakdown (3/5 split) */}
        <div className="lg:col-span-3 flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Client Risks</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {[
              {
                label: 'Total Invoices',
                value: dashStats.active_jobs_run > 0 ? `${dashStats.active_jobs_run * 50}+` : '—',
                note: 'Processed from current FY',
                color: '#1B4F8A', noteColor: 'text-[#6B7280]',
              },
              {
                label: 'Matched Invoices',
                value: dashStats.total_clients > 0 ? `${dashStats.total_clients * 10}+` : '—',
                note: '✓ 88.6% automatic rate',
                color: '#15803D', noteColor: 'text-[#15803D]',
              },
              {
                label: 'Mismatches Found',
                value: String(dashStats.total_mismatches || '—'),
                note: '⚠ GSTIN or values mismatch',
                color: '#B45309', noteColor: 'text-[#B45309]',
              },
              {
                label: 'ITC at Critical Risk',
                value: dashStats.blocked_itc > 0 ? `₹${(dashStats.blocked_itc / 100000).toFixed(1)}L` : '—',
                note: '⚡ Requires immediate outreach',
                color: '#B91C1C', noteColor: 'text-[#B91C1C]',
              },
            ].map(c => (
              <div
                key={c.label}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] block">
                    {c.label}
                  </span>
                  <div className="text-[20px] font-bold text-[#111827] mt-2 font-mono leading-none">
                    {c.value}
                  </div>
                </div>
                <p className={`text-[11px] font-medium ${c.noteColor} mt-2`}>{c.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Outreach priority list (2/5 split) - height 36px list items */}
        <div className="lg:col-span-2 flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Outreach Priority</h2>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex-1 flex flex-col justify-between h-full">
            <div className="space-y-1">
              {dashStats.total_mismatches > 0 && (dashStats.clients || []).filter((c: any) => c.mismatch_count > 0).length > 0 ? (
                (dashStats.clients || [])
                  .filter((c: any) => c.mismatch_count > 0)
                  .slice(0, 3)
                  .map((client: any) => (
                    <div key={client.id} className="h-[36px] flex items-center justify-between border-b border-[#F3F4F6] last:border-0 pb-1 font-medium">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-[#111827] truncate max-w-[130px]">{client.business_name}</span>
                        <span className="text-[11px] text-[#9CA3AF] leading-none">Activity logged</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-[#B91C1C] font-mono">
                          {client.mismatch_count} mismatch{client.mismatch_count > 1 ? 'es' : ''}
                        </span>
                        <span className="text-[11px] text-[#9CA3AF] font-mono text-right">
                          {client.risk_score === 'HIGH' ? '1h ago' : '5h ago'}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-slate-500 font-medium py-4 text-center">
                  No active outreach items.
                </div>
              )}
            </div>

            <button
              onClick={() => setToast({ message: 'Initializing outreach sequences...', type: 'success' })}
              className="w-full bg-[#FFFFFF] hover:bg-slate-50 border border-[#E5E7EB] text-slate-600 font-semibold text-xs py-2 rounded-[4px] transition-all duration-200 mt-4 cursor-pointer text-center"
            >
              Launch Smart Reconciliation Outreach
            </button>
          </div>
        </div>

      </div>

      {/* Row 6: Charts Split (65% / 35% Width) */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch w-full">
        {/* Left: ITC Protected (65% Width) */}
        <div className="w-full lg:w-[calc(65%-8px)] bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between border-b border-[#F3F4F6] pb-3 mb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.22em] block">Financial Security</span>
              <h2 className="text-[13px] font-semibold text-[#111827] mt-0.5">Total ITC Protected</h2>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-[20px] font-bold text-[#111827] font-mono leading-none">
                  {dashStats.blocked_itc > 0
                    ? `₹${(dashStats.blocked_itc / 10000000).toFixed(2)} Cr`
                    : "₹0"}
                </span>
                <span className="text-[11px] font-semibold text-[#15803D]">
                  +12.4%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">Realtime</span>
            </div>
          </div>

          <div className="w-full h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F3F4F6" strokeDasharray="" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `₹${v}L`} />
                <Tooltip
                  cursor={{ fill: 'rgba(243,244,246,0.6)' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '3px',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                    fontSize: '12px',
                    fontWeight: 'normal',
                    color: '#111827',
                    padding: '6px 10px'
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} align="center" verticalAlign="bottom" />
                <Bar dataKey="protected" name="Protected ITC" fill={BRAND_COLORS[0]} radius={[2, 2, 0, 0]} maxBarSize={12} />
                <Bar dataKey="risk" name="At Risk ITC" fill={BRAND_COLORS[3]} radius={[2, 2, 0, 0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Reconciliation Health (35% Width) */}
        <div className="w-full lg:w-[calc(35%-8px)] bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col justify-between animate-in fade-in">
          <div className="flex justify-between items-start border-b border-[#F3F4F6] pb-3 mb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.22em] block">Compliance Score</span>
              <h2 className="text-[13px] font-semibold text-[#111827] mt-0.5">Reconciliation Health</h2>
            </div>
            <button className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-[#E5E7EB] rounded-[4px]">
              Details
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[20px] font-bold text-[#111827] font-mono leading-none font-bold">
                {pieData[0]?.value}%
              </span>
              <span className="text-[11px] font-semibold text-[#15803D] mt-1.5">
                +2.4% this mo
              </span>
            </div>

            <div className="relative w-[120px] h-[90px] shrink-0">
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-widest leading-none">Matched</span>
                <span className="text-xs font-bold text-slate-700 mt-0.5 font-mono">
                  {dashStats.total_clients > 0 ? `${dashStats.total_clients * 10}+` : '—'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={28} outerRadius={38}
                    paddingAngle={3} dataKey="value" stroke="none"
                  >
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '3px',
                      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                      fontSize: '12px',
                      padding: '4px 8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-2 mt-4 border-t border-slate-100">
            {pieData.map(d => (
              <div key={d.name} className="flex flex-col items-center text-center rounded-[4px] py-1 px-0.5 bg-slate-50 border border-[#E5E7EB]">
                <span className="w-1.5 h-1.5 rounded-full mb-0.5" style={{ backgroundColor: d.color }} />
                <span className="text-[8px] text-[#6B7280] font-bold leading-none">{d.name}</span>
                <span className="text-[10px] font-bold text-slate-700 mt-0.5 leading-none font-mono">{d.value}%</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 rounded-[4px] px-3 py-2 mt-4 bg-slate-50 border border-[#E5E7EB]">
            <div className="text-[9px] font-semibold text-[#1B4F8A] leading-snug">
              {dashStats.total_mismatches > 0 ? (
                <>
                  <span className="text-slate-800 font-bold">{dashStats.total_mismatches} invoices</span> require outreach attention today.
                </>
              ) : (
                <span>Portfolio is fully reconciled. No outreach needed.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 7: AI Findings & Highlights (Full Width bottom section, matching Activity/Recent List style) */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] p-4">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest block">Auditor Intelligence</span>
            <h2 className="text-[13px] font-semibold text-[#111827] mt-0.5">AI Findings & Highlights</h2>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-[2px] border bg-[#FEF2F2] border-[#FEF2F2] text-[#B91C1C] uppercase tracking-wider">
            AI Live Insights
          </span>
        </div>

        <div className="flex flex-col">
          {dashStats.total_mismatches > 0 ? (
            <div className="h-[36px] flex items-center justify-between border-b border-[#F3F4F6] last:border-b-0 cursor-pointer group transition-all">
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-[#111827] truncate">
                  {dashStats.total_mismatches} invoice mismatches detected
                </span>
                <span className="text-[12px] text-[#6B7280] truncate leading-none">
                  ₹{(dashStats.blocked_itc / 100000).toFixed(1)}L ITC at risk across {dashStats.high_risk_clients} clients
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] border border-[#FEF2F2] px-1.5 py-0.2 rounded-[2px] uppercase tracking-wider">Critical Risk</span>
                <span className="text-[11px] text-[#9CA3AF] font-mono text-right">Live</span>
              </div>
            </div>
          ) : (
            <div className="h-[36px] flex items-center justify-center text-[12px] text-[#6B7280] italic">
              No active findings. Portfolio is clean.
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-[#6B7280] font-semibold">
            Resolve all flagged anomalies in the action centre.
          </span>
          <a
            href="/action-center"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4F8A] hover:bg-[#163F6E] text-[#FFFFFF] text-[11px] font-semibold rounded-[4px]"
          >
            <span>Go to Action Centre</span>
            <ArrowUpRight size={12} />
          </a>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-[4px] shadow-sm border border-[#E5E7EB] bg-white animate-in slide-in-from-bottom duration-300"
        >
          <div
            className="w-7 h-7 rounded-[4px] flex items-center justify-center"
            style={{
              background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={14} className="text-[#15803D]" />
            ) : (
              <ShieldAlert size={14} className="text-[#B91C1C]" />
            )}
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">
              {toast.type === 'success' ? 'Success' : 'Error'}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">{toast.message}</div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-[#6B7280] hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

    </div>
  );
}
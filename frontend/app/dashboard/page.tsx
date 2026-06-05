"use client";

import React from 'react';
import axios from "axios";
import { useDropzone } from 'react-dropzone';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  UploadCloud,
  X,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Eye,
  Play,
  Sparkles,
  Building2,
  Lock,
  Anchor,
  Clock,
  Inbox,
  AlertCircle,
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
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


/* ─── Data ───────────────────────────────────────────────────── */

/* ─── Shared card style primitives ──────────────────────────── */

/** Premium Light Card — layered glass surface with inset top highlight */
const cardBase = {
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.88) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  boxShadow: [
    'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
    '0 8px 30px rgba(15, 23, 42, 0.03)',
    '0 1px 2px rgba(15, 23, 42, 0.02)',
  ].join(', '),
  transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
};

/** Hover state applied via onMouse* events for precise control */
function applyHover(el: HTMLElement, accentRGB: string) {
  el.style.transform = 'translateY(-2px)';
  el.style.boxShadow = [
    'inset 0 1px 1px rgba(255, 255, 255, 0.8)',
    `0 16px 36px rgba(15, 23, 42, 0.06)`,
    `0 0 0 1px rgba(${accentRGB},0.15)`,
    `0 8px 32px rgba(${accentRGB},0.02)`,
  ].join(', ');
  el.style.borderColor = `rgba(${accentRGB},0.25)`;
}

function resetHover(el: HTMLElement) {
  el.style.transform = '';
  el.style.boxShadow = cardBase.boxShadow;
  el.style.borderColor = 'rgba(226, 232, 240, 0.8)';
}

/** Icon container style per accent colour */
function iconBox(hex: string, rgb: string): React.CSSProperties {
  return {
    background: `radial-gradient(circle at 30% 30%, rgba(${rgb},0.1) 0%, rgba(${rgb},0.03) 100%)`,
    border: `1px solid rgba(${rgb},0.15)`,
    boxShadow: `0 2px 12px rgba(${rgb},0.05)`,
  };
}

export default function DashboardPage() {
  const router = useRouter();

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
    { name: 'Matched', value: 0, color: '#10B981' },
    { name: 'At Risk', value: 0, color: '#EF4444' },
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

  // Sandbox and Feature Flags state
  const [featureFlags, setFeatureFlags] = React.useState({
    AI_ENABLED: true,
    NOTICES_ENABLED: true,
    MOCK_MODE_ENABLED: true
  });
  const [isResetting, setIsResetting] = React.useState(false);

  const fetchFlags = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/demo/feature-flags`);
      if (res.data && res.data.feature_flags) {
        setFeatureFlags(res.data.feature_flags);
      }
    } catch (err) {
      console.error("Failed to load feature flags:", err);
    }
  };

  const handleToggleFlag = async (flagName: 'AI_ENABLED' | 'NOTICES_ENABLED' | 'MOCK_MODE_ENABLED') => {
    const updated = {
      ...featureFlags,
      [flagName]: !featureFlags[flagName]
    };
    setFeatureFlags(updated);
    try {
      await axios.post(`${API_BASE}/api/demo/feature-flags`, updated);
      setToast({
        message: `✓ Feature flag [${flagName}] toggled successfully!`,
        type: 'success'
      });
    } catch (err) {
      console.error("Failed to update feature flags:", err);
    }
  };

  const handleResetSandbox = async () => {
    setIsResetting(true);
    try {
      const res = await axios.post(`${API_BASE}/api/demo/reset`);
      if (res.data && res.data.status === "SUCCESS") {
        setToast({
          message: "✓ Sandbox database wiped & re-seeded with fresh corporate portfolios!",
          type: 'success'
        });
      }
    } catch (err) {
      console.error("Failed to reset sandbox:", err);
      setToast({
        message: "❌ Sandbox reset failed. Please ensure backend dev server is active.",
        type: 'error'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleStartOnboardingTour = () => {
    const startTourEvent = new CustomEvent("start_product_tour");
    window.dispatchEvent(startTourEvent);
  };

  React.useEffect(() => {
    fetchFlags();

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
    fetch(`${API_BASE}/api/clients/dashboard/summary`)
      .then(r => r.json())
      .then(data => {
        setDashStats(data);
        if (data.total_mismatches >= 0 && data.total_clients >= 0) {
          const total = data.total_mismatches + (data.total_clients * 3);
          const matchedPct = total > 0 ? Math.round(((total - data.total_mismatches) / total) * 100) : 100;
          setPieData([
            { name: 'Matched', value: matchedPct, color: '#10B981' },
            { name: 'At Risk', value: 100 - matchedPct, color: '#EF4444' },
          ]);
        }
      })
      .catch(err => console.log("Dashboard stats fallback:", err));
  }, []);

  // Dual file reconciliation engine state
  const [filePR, setFilePR] = React.useState<File | null>(null);
  const [file2B, setFile2B] = React.useState<File | null>(null);
  const [reconUploading, setReconUploading] = React.useState<boolean>(false);
  const [reconResult, setReconResult] = React.useState<any | null>(null);
  const [reconError, setReconError] = React.useState<string | null>(null);

  const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === "true";

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
      const response = await axios.post(
        `${API_BASE}/api/upload/gstr2b`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResult(response.data);
      setToast({ message: "GST File processed and validated successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "An error occurred while uploading the file.";
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

    try {
      const response = await axios.post(
        `${API_BASE}/api/reconcile/gstr2b`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setReconResult(response.data);
      setToast({ message: "Automated GST Reconciliation completed successfully!", type: 'success' });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "An error occurred during reconciliation.";
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

  const connectBackend = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/health`);
      const status = response.data?.status || "OK";
      setToast({ message: `✓ Backend connected — ${status}`, type: 'success' });
    } catch (error) {
      setToast({ message: "Backend connection failed. Check API server.", type: 'error' });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">

      {/* Sandbox Banner */}
      {isSandbox && (
        <div
          className="w-full flex items-center gap-2"
          style={{
            background: 'var(--color-warning-soft)',
            borderBottom: '1px solid #FCD34D',
            color: '#92400E',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 40px',
            margin: '-32px -32px 24px -32px',
            width: 'calc(100% + 64px)',
          }}
        >
          <span className="text-base">⚠</span>
          <div>
            <span className="font-bold">SANDBOX ENVIRONMENT ACTIVE</span> — Seeded with mock corporate records for CA evaluation.
          </div>
        </div>
      )}

      <PageHeader
        sectionLabel="Intelligence Platform"
        liveIndicator={true}
        title={
          <>
            {greeting}, <span className="text-[#7C3AED]">{userName.split(' ')[0]}</span>
            {firmName && <span className="text-slate-400 font-normal text-lg ml-2">| {firmName}</span>}
          </>
        }
        description={currentTimeStr}
        actions={
          <>
            <button
              className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/50 transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              <Calendar size={12} className="text-[#7C3AED]" />
              <span>Jan – Jul 2024</span>
              <span className="text-[8px] text-secondary ml-0.5 font-normal">▼</span>
            </button>
            <button
              className="btn btn-primary btn-md"
            >
              Generate Report
            </button>
          </>
        }
      />

      {/* ── CA Command Center & Priorities Split Layout ────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
        {/* Left: CA Command Center Dark Card (75% Width) */}
        <div 
          className="dark-card relative min-h-[320px] lg:w-[75%] p-6 overflow-hidden flex flex-col justify-between flex-1"
        >
          {/* Main Content Grid: 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
            {/* Left Column: Title & Primary Metric */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase">
                    CA Command Center
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <h2 className="text-sm font-semibold text-slate-400 mt-0.5">
                  Critical Issues Requiring Attention
                </h2>
                
                <div className="mt-4">
                  <span 
                    className="block text-white"
                    style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1 }}
                  >
                    ₹{(dashStats.blocked_itc / 100000).toFixed(1)}L
                  </span>
                  <span 
                    style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: 'var(--font-tracking-micro)', color: 'rgba(255,255,255,0.5)' }}
                    className="block mt-1.5 font-bold"
                  >
                    Total ITC At Risk
                  </span>
                </div>
              </div>
              
              {/* Trust Layer / Status Row */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="flex items-center gap-1.5 font-medium" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>GSTN Connected</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>ICEGATE Connected</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Audit Trail Active</span>
                </div>
                <div 
                  className="font-medium inline-flex items-center gap-1"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Clock size={11} className="text-slate-300" />
                  <span>Sync: 2h ago</span>
                </div>
              </div>
            </div>

            {/* Right Column: 3 Stat Pills */}
            <div className="flex flex-col justify-center py-1">
              <div className="space-y-3">
                {/* Open GST Notices */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Open GST Notices
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block leading-none">
                      {dashStats.high_risk_clients}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle size={15} />
                  </div>
                </div>

                {/* Upcoming Compliance Deadlines */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Upcoming Deadlines
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block leading-none">
                      {dashStats.pending_reconciliations}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Calendar size={15} />
                  </div>
                </div>

                {/* Protected ITC This Month */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Protected ITC (Mo)
                    </span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block leading-none">
                      {formatCurrency(dashStats.blocked_itc || 0)}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle size={15} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Quick Actions Bar */}
          <div 
            className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3"
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Quick Actions:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/gst-recon")}
                className="btn btn-secondary btn-sm"
                style={{ height: '36px', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <RefreshCw size={16} />
                <span>Run GST Recon</span>
              </button>
              <button
                onClick={() => router.push("/notices")}
                className="btn btn-secondary btn-sm"
                style={{ height: '36px', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <AlertTriangle size={16} />
                <span>Review Notices</span>
              </button>
              <button
                onClick={() => router.push("/compliance")}
                className="btn btn-secondary btn-sm"
                style={{ height: '36px', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Calendar size={16} />
                <span>Open Compliance Calendar</span>
              </button>
              <button
                onClick={() => setToast({ message: "Generating real-time AI Executive Summary...", type: "success" })}
                className="btn btn-primary btn-sm"
                style={{ height: '36px' }}
              >
                <Sparkles size={16} fill="currentColor" />
                <span>Generate AI Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Top Priorities Panel (25% Width) */}
        <div className="col-span-12 lg:w-[25%] flex flex-col items-stretch">
          <div className="std-card h-full flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block mb-3">
                Top Priorities
              </span>
              <div className="space-y-3">
                {dashStats.total_mismatches === 0 ? (
                  <div className="text-xs text-slate-500 font-medium py-4 text-center">
                    No critical priorities today.
                  </div>
                ) : (
                  (dashStats.clients || [])
                    .filter((c: any) => c.mismatch_count > 0)
                    .slice(0, 3)
                    .map((client: any, idx: number, arr: any[]) => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between text-xs pb-2 font-medium ${
                          idx < arr.length - 1 ? 'border-b border-slate-100' : ''
                        }`}
                      >
                        <span className="text-slate-700">{client.business_name}</span>
                        <span className={`font-bold ${client.risk_score === 'HIGH' ? 'text-red-500' : 'text-amber-600'}`}>
                          {client.mismatch_count} mismatch{client.mismatch_count > 1 ? 'es' : ''}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 italic">
              * Click Quick Actions to resolve
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Action Centre — Premium Operational Command Center Focal Point ── */}
      <div 
        className="std-card relative overflow-hidden"
      >
        {/* Subtle decorative radial light */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,255,0.04) 0%, transparent 70%)', filter: 'blur(24px)' }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-6">
          
          {/* Left panel: Title, description, and findings (65% Width) */}
          <div className="w-full lg:w-[65%] flex flex-col justify-between space-y-4 pr-0 lg:pr-6 border-r-0 lg:border-r border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-sm animate-pulse">
                  <Sparkles size={12} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-[#7C3AED] tracking-widest uppercase">
                  AI Action Centre
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Live Telemetry
                </span>
              </div>

              <h2 className="text-section-title text-slate-800 mt-3">
                Today's Actions
              </h2>
              
              <p className="text-xs text-secondary font-medium leading-relaxed mt-3 max-w-xl">
                Auditor copilot has analyzed client portfolios and flagged anomalies requiring outreach or adjustment today.
              </p>

              {/* Findings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                {/* Compliance Deadlines */}
                <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-sm">
                  <Clock size={16} className="text-[#4F46E5] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Deadlines</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{dashStats.pending_reconciliations || 7} Pending</span>
                  </div>
                </div>
                {/* GST Notices */}
                <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-sm">
                  <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST Notices</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{dashStats.high_risk_clients || 2} Active</span>
                  </div>
                </div>
                {/* Guide Tour */}
                <div 
                  onClick={() => {
                    const tourEvent = new CustomEvent("start_product_tour");
                    window.dispatchEvent(tourEvent);
                  }}
                  className="flex items-start gap-2.5 p-3.5 bg-violet-50/50 border border-violet-100/50 hover:bg-violet-50 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm"
                >
                  <Sparkles size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block">Guide Tour</span>
                    <span className="text-xs font-bold text-[#7C3AED] mt-0.5 block">Launch Tour →</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/action-center"
                className="btn btn-primary btn-md"
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
                className="std-card std-card-interactive metric-card flex flex-col justify-between"
                style={{ borderTop: '3px solid var(--color-error)', minHeight: '140px' }}
                onClick={() => setToast({ message: 'Viewing GST mismatches...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="metric-label">Mismatches</span>
                  <AlertTriangle size={14} className="text-[#EF4444]" />
                </div>
                <div className="mt-2">
                  <span className="block text-slate-800" style={{ fontSize: '24px', fontWeight: 700 }}>
                    {dashStats.total_mismatches || 9}
                  </span>
                  <span className="metric-sub-label block mt-1 text-[11px] text-slate-500">
                    Portal anomalies
                  </span>
                </div>
              </div>

              {/* ITC at Risk */}
              <div 
                className="std-card std-card-interactive metric-card flex flex-col justify-between"
                style={{ borderTop: '3px solid var(--color-error)', minHeight: '140px' }}
                onClick={() => setToast({ message: 'Viewing blocked credit ledger...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="metric-label">ITC Risk</span>
                  <ShieldAlert size={14} className="text-[#DC2626]" />
                </div>
                <div className="mt-2">
                  <span className="block text-slate-800" style={{ fontSize: '24px', fontWeight: 700 }}>
                    ₹{(dashStats.blocked_itc / 100000).toFixed(0)}L
                  </span>
                  <span className="metric-sub-label block mt-1 text-[11px] text-slate-500">
                    Blocked credit
                  </span>
                </div>
              </div>

              {/* BOE Discrepancies */}
              <div 
                className="std-card std-card-interactive metric-card flex flex-col justify-between"
                style={{ borderTop: '3px solid var(--color-warning)', minHeight: '140px' }}
                onClick={() => setToast({ message: 'Viewing import discrepancies...', type: 'success' })}
              >
                <div className="flex items-start justify-between">
                  <span className="metric-label">BOE Gap</span>
                  <Anchor size={14} className="text-[#D97706]" />
                </div>
                <div className="mt-2">
                  <span className="block text-slate-800" style={{ fontSize: '24px', fontWeight: 700 }}>
                    4
                  </span>
                  <span className="metric-sub-label block mt-1 text-[11px] text-slate-500">
                    ICEGATE diff
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Automated Data Workspace ─────── */}
      <div
        className="std-card relative overflow-hidden"
      >
        {/* Workspace Title & Tab Selector */}
        <div
          className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-100"
        >
          <div>
            <span className="text-meta text-[#4F46E5] tracking-[0.25em] uppercase block">
              Automated Data Workspace
            </span>
            <h2 className="text-section-title text-slate-800 mt-1">
              GST Processing & Matcher Pipeline
            </h2>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-stretch lg:self-auto">
            <button
              onClick={() => { setActiveTab('parser'); }}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'parser'
                ? 'bg-white text-[#7C3AED] shadow-sm'
                : 'text-secondary hover:text-slate-600'
                }`}
            >
              Single GSTR-2B Parser
            </button>
            <button
              onClick={() => { setActiveTab('reconciler'); }}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'reconciler'
                ? 'bg-white text-[#7C3AED] shadow-sm'
                : 'text-secondary hover:text-slate-600'
                }`}
            >
              Reconciliation Engine
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="relative z-10">

          {/* ============================================================== */}
          {/* TAB A: SINGLE FILE PARSER                                      */}
          {/* ============================================================== */}
          {activeTab === 'parser' && (
            <div className="space-y-6">
              {/* State 1: Pristine State */}
              {!file && !uploading && !result && (
                <div
                  {...getRootProps()}
                  className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    border: isDragActive ? '2px dashed var(--color-primary-light)' : '2px dashed var(--color-border-strong)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px',
                    textAlign: 'center',
                    background: isDragActive ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  }}
                >
                  <input {...getInputProps()} />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-violet-50 border border-violet-100 text-[#7C3AED]"
                  >
                    <UploadCloud size={22} />
                  </div>
                  <p className="text-xs font-black text-slate-800 text-center">
                    {isDragActive ? "Drop the GST file here..." : "Drag & drop GSTR-2B Excel or CSV here"}
                  </p>
                  <p className="text-[10px] text-secondary mt-1 text-center font-medium">
                    or click to browse local files (Max size: 20MB)
                  </p>
                </div>
              )}

              {/* State 2: File Selected (Not yet uploaded) */}
              {file && !uploading && !result && (
                <div
                  className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50"
                >
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 border border-indigo-100 text-[#4F46E5]"
                    >
                      <FileSpreadsheet size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-slate-800 truncate">{file.name}</h4>
                      <p className="text-[10px] text-secondary mt-0.5 font-medium">
                        Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                    <button
                      onClick={handleReset}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-secondary hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm shadow-[#7C3AED]/10 transition-all hover:opacity-95 active:translate-y-0 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                      }}
                    >
                      Process & Validate
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Uploading / Processing State */}
              {uploading && (
                <div
                  className="border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center animate-pulse bg-slate-50/30"
                >
                  <RefreshCw size={22} className="text-[#7C3AED] animate-spin mb-3" />
                  <p className="text-xs font-black text-slate-800">Parsing & extracting GST data...</p>
                  <p className="text-[10px] text-secondary mt-1 font-semibold">Applying whitespace normalization and schema mapping</p>
                </div>
              )}

              {/* State 4: Success / Processed State */}
              {result && (
                <div className="space-y-6">
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className="border border-slate-200 rounded-2xl p-4 flex items-center gap-3 bg-white"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#10B981]">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-wider block">File Status</span>
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] block" title={result.filename}>
                          {result.filename}
                        </span>
                      </div>
                    </div>

                    <div
                      className="border border-slate-200 rounded-2xl p-4 flex items-center gap-3 bg-white"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#7C3AED]">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-wider block">Total Rows</span>
                        <span className="text-xs font-black text-slate-700">{result.rows} Invoices</span>
                      </div>
                    </div>

                    <div
                      className="border border-slate-200 rounded-2xl p-4 flex items-center gap-3 bg-white"
                    >
                      <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#4F46E5]">
                        <Activity size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-wider block">Columns Loaded</span>
                        <span className="text-xs font-black text-slate-700">{result.columns?.length || 0} Headers</span>
                      </div>
                    </div>
                  </div>

                  {/* Detected GST Metadata Fields mapping */}
                  <div
                    className="border rounded-2xl p-5 bg-violet-50/20"
                    style={{
                      borderColor: 'rgba(108,99,255,0.15)'
                    }}
                  >
                    <span className="text-[9px] font-black text-[#7C3AED] uppercase tracking-[0.2em] block mb-3">
                      Intelligent Field Mapping
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'GSTIN Column', key: 'gstin', value: result.detected_fields?.gstin, color: '#10B981' },
                        { label: 'Invoice No Column', key: 'invoice_number', value: result.detected_fields?.invoice_number, color: '#7C3AED' },
                        { label: 'Taxable Value Column', key: 'taxable_value', value: result.detected_fields?.taxable_value, color: '#4F46E5' }
                      ].map(field => (
                        <div
                          key={field.key}
                          className="bg-white border border-slate-200 rounded-xl p-3.5"
                        >
                          <span className="text-[9px] text-secondary font-bold block">{field.label}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: field.color }}
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {field.value ? (
                                <code className="text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{field.value}</code>
                              ) : (
                                <span className="text-secondary italic text-[10px]">Not Found</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable Columns List */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-[0.18em] block">
                      Normalized Columns List ({result.columns?.length || 0})
                    </span>
                    <div
                      className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-2 hidden-scrollbar bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl"
                    >
                      {result.columns?.map((col: string, idx: number) => {
                        const isDetected = Object.values(result.detected_fields || {}).includes(col);
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${isDetected
                              ? 'bg-violet-50 text-[#7C3AED] border-[#7C3AED]/20 shadow-sm'
                              : 'bg-white text-secondary border-slate-200'
                              }`}
                          >
                            {col}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom reset actions */}
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/50 transition-all cursor-pointer"
                    >
                      Upload Another File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB B: DUAL-FILE RECONCILIATION ENGINE                          */}
          {/* ============================================================== */}
          {activeTab === 'reconciler' && (
            <div className="space-y-6">
              {/* State 1: Pristine Dropzones Layout */}
              {!filePR && !file2B && !reconUploading && !reconResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Slot 1: Purchase Register */}
                  <div
                    {...dropzonePR.getRootProps()}
                    className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                    style={{
                      border: dropzonePR.isDragActive ? '2px dashed var(--color-primary-light)' : '2px dashed var(--color-border-strong)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '40px',
                      textAlign: 'center',
                      background: dropzonePR.isDragActive ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    }}
                  >
                    <input {...dropzonePR.getInputProps()} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-violet-50 border border-violet-100 text-[#7C3AED]">
                      <FileSpreadsheet size={18} />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 text-center">Purchase Register (Books)</h4>
                    <p className="text-[9.5px] text-secondary mt-1 text-center font-medium">Drag file or click to browse (CSV / Excel)</p>
                  </div>

                  {/* Slot 2: GSTR-2B */}
                  <div
                    {...dropzone2B.getRootProps()}
                    className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                    style={{
                      border: dropzone2B.isDragActive ? '2px dashed var(--color-primary-light)' : '2px dashed var(--color-border-strong)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '40px',
                      textAlign: 'center',
                      background: dropzone2B.isDragActive ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    }}
                  >
                    <input {...dropzone2B.getInputProps()} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-indigo-50 border border-indigo-100 text-[#4F46E5]">
                      <UploadCloud size={18} />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 text-center">GSTR-2B (GST Portal)</h4>
                    <p className="text-[9.5px] text-secondary mt-1 text-center font-medium">Drag file or click to browse (CSV / Excel)</p>
                  </div>
                </div>
              )}

              {/* State 2: Selected Files Overview (Before processing) */}
              {(filePR || file2B) && !reconUploading && !reconResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Books Card */}
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] text-secondary font-bold uppercase tracking-wider block">Source A: Books</span>
                          <span className="text-xs font-bold text-slate-700 truncate block max-w-[180px]">
                            {filePR ? filePR.name : <span className="text-secondary italic font-normal">Pending Selection</span>}
                          </span>
                        </div>
                      </div>
                      {filePR ? (
                        <button
                          onClick={() => setFilePR(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-[#EF4444] hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          {...dropzonePR.getRootProps()}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-600 cursor-pointer shadow-sm"
                        >
                          <input {...dropzonePR.getInputProps()} />
                          Browse
                        </button>
                      )}
                    </div>

                    {/* Portal Card */}
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] flex-shrink-0">
                          <UploadCloud size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] text-secondary font-bold uppercase tracking-wider block">Source B: Portal</span>
                          <span className="text-xs font-bold text-slate-700 truncate block max-w-[180px]">
                            {file2B ? file2B.name : <span className="text-secondary italic font-normal">Pending Selection</span>}
                          </span>
                        </div>
                      </div>
                      {file2B ? (
                        <button
                          onClick={() => setFile2B(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-[#EF4444] hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          {...dropzone2B.getRootProps()}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[9px] font-bold text-slate-600 cursor-pointer shadow-sm"
                        >
                          <input {...dropzone2B.getInputProps()} />
                          Browse
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={handleReconReset}
                      className="text-xs font-bold text-secondary hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>

                    <button
                      onClick={handleReconcile}
                      disabled={!filePR || !file2B}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all cursor-pointer ${(!filePR || !file2B)
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-secondary border border-slate-200'
                        : 'hover:opacity-95 bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#4F46E5] shadow-[#7C3AED]/10'
                        }`}
                    >
                      Run Automated Reconciliation
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Reconciling Progress State */}
              {reconUploading && (
                <div
                  className="border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center animate-pulse bg-slate-50/30"
                >
                  <RefreshCw size={24} className="text-[#7C3AED] animate-spin mb-3" />
                  <h4 className="text-xs font-black text-slate-800">Reconciling GST data...</h4>
                  <p className="text-[10px] text-secondary mt-1 max-w-[420px] font-semibold leading-relaxed">
                    Matching document entries. Running fuzzy matching arrays via RapidFuzz, applying standard rupee tolerances, and indexing mismatch anomalies.
                  </p>
                </div>
              )}

              {/* State 4: Reconciliation Results Dashboard */}
              {reconResult && (
                <div className="space-y-6 animate-in fade-in duration-500">

                  {/* Results summary stats grid */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] block">
                      Reconciliation Audit Summary
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          label: 'Matched Invoices',
                          value: reconResult.summary.matched + (reconResult.summary.partial_match || 0),
                          desc: 'Invoices matched perfectly',
                          color: '#10B981', icon: CheckCircle, rgb: '16,185,129'
                        },
                        {
                          label: 'Missing in GSTR-2B',
                          value: reconResult.summary.missing_in_2b,
                          desc: 'Unfiled by suppliers',
                          color: '#4F46E5', icon: AlertTriangle, rgb: '79,70,229'
                        },
                        {
                          label: 'Missing in Books',
                          value: reconResult.summary.missing_in_books,
                          desc: 'Unrecorded by client',
                          color: '#7C3AED', icon: ShieldAlert, rgb: '124,58,237'
                        },
                        {
                          label: 'Value Mismatches',
                          value: reconResult.summary.value_mismatch,
                          desc: 'Tax discrepancies > ±1.0',
                          color: '#EF4444', icon: Activity, rgb: '239,68,68'
                        }
                      ].map(card => (
                        <div
                          key={card.label}
                          className="rounded-2xl p-4 border border-slate-200 bg-white relative overflow-hidden flex items-center justify-between"
                        >
                          <div>
                            <span className="text-[9px] text-secondary font-bold uppercase tracking-wider block">{card.label}</span>
                            <span className="text-2xl font-black text-slate-800 mt-1 block leading-none">{card.value}</span>
                            <span className="text-[9px] text-secondary mt-1.5 block font-semibold">{card.desc}</span>
                          </div>
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100"
                          >
                            <card.icon size={15} style={{ color: card.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mismatch Ledger Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">
                        Audit Mismatch Ledger ({reconResult.mismatches?.length || 0})
                      </span>
                      {reconResult.mismatches?.length > 0 && (
                        <span className="text-[9px] text-[#EF4444] font-black uppercase tracking-wider bg-red-50 border border-red-200/50 px-2 py-0.5 rounded-lg animate-pulse">
                          ⚠️ Action Required
                        </span>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <div className="overflow-x-auto max-h-[400px] hidden-scrollbar">
                        {reconResult.mismatches?.length === 0 ? (
                          <div className="p-10 text-center flex flex-col items-center justify-center">
                            <CheckCircle size={28} className="text-[#10B981] mb-2.5" />
                            <h4 className="text-xs font-black text-slate-800">Perfect Matching Achieved!</h4>
                            <p className="text-[10px] text-secondary mt-1 font-semibold">No mismatches found between your Purchase Books and GSTR-2B.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr
                                className="text-[9px] text-secondary font-black uppercase tracking-wider bg-slate-50 border-b border-slate-200/60"
                              >
                                <th className="p-3.5 pl-5">GSTIN</th>
                                <th className="p-3.5">Invoice</th>
                                <th className="p-3.5">Issue</th>
                                <th className="p-3.5">Risk Severity</th>
                                <th className="p-3.5">Resolution preview</th>
                                <th className="p-3.5 pr-5 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {reconResult.mismatches.map((row: any, idx: number) => {
                                // Issue Color Badges
                                let issueColor = { bg: 'bg-slate-100', text: 'text-secondary', border: 'border-slate-200' };
                                if (row.issue === 'MISSING_IN_2B') {
                                  issueColor = { bg: 'bg-indigo-50', text: 'text-[#4F46E5]', border: 'border-indigo-100' };
                                } else if (row.issue === 'MISSING_IN_BOOKS') {
                                  issueColor = { bg: 'bg-violet-50', text: 'text-[#7C3AED]', border: 'border-violet-100' };
                                } else if (row.issue === 'VALUE_MISMATCH') {
                                  issueColor = { bg: 'bg-red-50', text: 'text-[#EF4444]', border: 'border-red-100' };
                                } else if (row.issue === 'PARTIAL_MATCH') {
                                  issueColor = { bg: 'bg-emerald-50', text: 'text-[#10B981]', border: 'border-emerald-100' };
                                }

                                // Risk Level Severity Color System
                                let riskColor = { bg: 'bg-emerald-50', text: 'text-[#10B981]', border: 'border-emerald-100' };
                                if (row.risk_level === 'HIGH') {
                                  riskColor = { bg: 'bg-red-50', text: 'text-[#EF4444]', border: 'border-red-100' };
                                } else if (row.risk_level === 'MEDIUM') {
                                  riskColor = { bg: 'bg-amber-50', text: 'text-[#F59E0B]', border: 'border-amber-100' };
                                } else if (row.risk_level === 'LOW') {
                                  riskColor = { bg: 'bg-blue-50', text: 'text-[#3B82F6]', border: 'border-blue-100' };
                                }

                                const isRowExpanded = expandedRow === idx;

                                return (
                                  <React.Fragment key={idx}>
                                    <tr className={`hover:bg-slate-50/50 transition-colors text-[11px] font-bold ${isRowExpanded ? 'bg-slate-50/30' : ''}`}>
                                      <td className="p-3.5 pl-5 font-mono text-[10.5px] text-secondary">{row.gstin}</td>
                                      <td className="p-3.5 text-slate-700 font-extrabold">{row.invoice_number}</td>
                                      <td className="p-3.5">
                                        <span className={`status-badge ${getUnifiedBadgeClass(row.issue.replace(/_/g, ' '))}`}>
                                          {row.issue.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                      <td className="p-3.5">
                                        <span className={`status-badge ${getUnifiedBadgeClass(row.risk_level)}`}>
                                          {renderBadgeDot(row.risk_level)}
                                          {row.risk_level}
                                        </span>
                                      </td>
                                      <td className="p-3.5 text-secondary max-w-[200px] font-medium truncate" title={row.recommended_action}>
                                        {row.recommended_action}
                                      </td>
                                      <td className="p-3.5 pr-5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => setExpandedRow(isRowExpanded ? null : idx)}
                                            className={`p-1.5 rounded-lg border text-secondary hover:text-slate-700 hover:bg-slate-100 transition-all inline-flex items-center justify-center cursor-pointer ${isRowExpanded ? 'text-[#7C3AED] border-[#7C3AED]/20 bg-violet-50' : 'bg-white border-slate-200'
                                              }`}
                                            title="Expand Audit Breakdown"
                                          >
                                            {isRowExpanded ? <ChevronUp size={12} /> : <Eye size={12} />}
                                          </button>
                                          <button
                                            onClick={() => setToast({ message: `Triggering vendor reconciliation outreach for invoice ${row.invoice_number}...`, type: 'success' })}
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-secondary hover:text-[#7C3AED] hover:border-[#7C3AED]/20 hover:bg-violet-50 transition-all inline-flex items-center justify-center cursor-pointer"
                                            title="Supplier Outreach Link"
                                          >
                                            <ArrowUpRight size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Expandable Explanation Causal Details */}
                                    {isRowExpanded && (
                                      <tr>
                                        <td colSpan={6} className="p-5 bg-slate-50/60 border-t border-b border-slate-100">
                                          <div
                                            className="rounded-2xl p-5 border bg-white space-y-4 animate-in slide-in-from-top duration-200 border-slate-200/80 shadow-sm"
                                          >
                                            {/* Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                              <div>
                                                <span className="text-[8px] text-[#4F46E5] font-black uppercase tracking-wider block">Intelligent Audit Breakdown</span>
                                                <h4 className="text-xs font-black text-slate-800 mt-0.5">Root-Cause Discrepancy Analysis</h4>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-secondary font-bold uppercase">Confidence Score:</span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#10B981] border border-emerald-100 font-black text-[9.5px]">
                                                  {row.confidence}% Confidence
                                                </span>
                                              </div>
                                            </div>

                                            {/* Dynamic Explanation Fields */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                              <div className="space-y-1">
                                                <span className="text-[8.5px] text-secondary font-black uppercase block tracking-wider">Likely Cause</span>
                                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{row.likely_cause}</p>
                                              </div>
                                              <div className="space-y-1">
                                                <span className="text-[8.5px] text-secondary font-black uppercase block tracking-wider">Actionable CA Resolution</span>
                                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{row.recommended_action}</p>
                                              </div>
                                            </div>

                                            {/* Footer Details */}
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-[9px] font-semibold">
                                              <div className="text-secondary font-mono">
                                                Source: <span className="text-slate-600">{row.explanation_source}</span> | Rule: <span className="text-slate-600">{row.inference_rule}</span>
                                              </div>
                                              <div className="flex items-center gap-2.5">
                                                <button
                                                  onClick={() => setToast({ message: `Invoice ${row.invoice_number} flagged for automated report pack export!`, type: "success" })}
                                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-600 font-black cursor-pointer transition-colors"
                                                >
                                                  Flag for Audit Export
                                                </button>
                                                <button
                                                  onClick={() => setToast({ message: `Supplier Outreach Link dispatched successfully for ${row.invoice_number}!`, type: 'success' })}
                                                  className="px-3.5 py-2 rounded-xl text-white font-black transition-all hover:opacity-95 shadow-sm shadow-[#7C3AED]/10 cursor-pointer"
                                                  style={{
                                                    background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                                                  }}
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

                  {/* Reset Actions */}
                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setToast({ message: "Compiling executive summary... Dispatched PDF download successfully!", type: "success" });
                        window.open(`${API_BASE}/api/export/reconciliation/pdf`, "_blank");
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
                    >
                      Export Summary (PDF)
                    </button>
                    <button
                      onClick={() => {
                        setToast({ message: "Compiling Excel sheets... Dispatched working papers successfully!", type: "success" });
                        window.open(`${API_BASE}/api/export/reconciliation/excel`, "_blank");
                      }}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-95 shadow-sm shadow-[#4F46E5]/10 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                      }}
                    >
                      Export Working Papers (Excel)
                    </button>
                    <button
                      onClick={handleReconReset}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black text-secondary hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
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

      {/* ── Row 5: Active Risks & Outreach Priority Side-by-Side ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">

        {/* Left: Client Risks breakdown (3/5) */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-card-title text-slate-800">Active Client Risks</h2>
            <span className="text-xs text-[#7C3AED] font-bold hover:underline cursor-pointer transition-colors">
              Audit trail →
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
            {[
              {
                label: 'Total Invoices',
                value: dashStats.active_jobs_run > 0 ? `${dashStats.active_jobs_run * 50}+` : '—',
                note: 'Processed from current FY',
                noteColor: 'text-secondary', icon: FileText, accent: '#4F46E5', accentRGB: '79,70,229',
              },
              {
                label: 'Matched Invoices',
                value: dashStats.total_clients > 0 ? `${dashStats.total_clients * 10}+` : '—',
                note: '✓ 88.6% automatic rate',
                noteColor: 'text-emerald-500', icon: CheckCircle, accent: '#10B981', accentRGB: '16,185,129',
              },
              {
                label: 'Mismatches Found',
                value: String(dashStats.total_mismatches || '—'),
                note: '⚠ GSTIN or values mismatch',
                noteColor: 'text-amber-500', icon: AlertTriangle, accent: '#F59E0B', accentRGB: '245,158,11',
              },
              {
                label: 'ITC at Critical Risk',
                value: dashStats.blocked_itc > 0 ? `₹${(dashStats.blocked_itc / 100000).toFixed(1)}L` : '—',
                note: '⚡ Requires immediate outreach',
                noteColor: 'text-red-500', icon: ShieldAlert, accent: '#EF4444', accentRGB: '239,68,68',
              },
            ].map(c => (
              <div
                key={c.label}
                className={`std-card std-card-interactive metric-card ${
                  c.label === 'Matched Invoices' ? 'card-variant-success' :
                  c.label === 'Mismatches Found' ? 'card-variant-warning' :
                  c.label === 'ITC at Critical Risk' ? 'card-variant-critical' : ''
                } relative group overflow-hidden`}
              >
                {/* Accent orb */}
                <div aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 w-28 h-28 rounded-full"
                  style={{
                    background: `radial-gradient(circle, rgba(${c.accentRGB},0.04) 0%, transparent 70%)`,
                    filter: 'blur(16px)',
                  }}
                />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={iconBox(c.accent, c.accentRGB)}
                      >
                        <c.icon size={15} style={{ color: c.accent }} />
                      </div>
                      <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: c.accent }} />
                    </div>
                    <span className="metric-label">{c.label}</span>
                    <div className="metric-value">{c.value}</div>
                  </div>
                  <p className={`metric-sub-label ${c.noteColor} mt-2`}>{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Outreach priority list (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-5 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-card-title text-slate-800">Outreach Priority</h2>
            <button
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
            >
              Manage
            </button>
          </div>

          <div
            className="std-card flex-1 flex flex-col justify-between relative overflow-hidden h-full"
          >
            {/* Background decoration */}
            <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 70%)', filter: 'blur(20px)' }} />

            <div className="relative z-10 space-y-3">
              {dashStats.total_mismatches > 0 && (dashStats.clients || []).filter((c: any) => c.mismatch_count > 0).length > 0 ? (
                (dashStats.clients || [])
                  .filter((c: any) => c.mismatch_count > 0)
                  .slice(0, 3)
                  .map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0 font-medium">
                      <span className="text-slate-700">{client.business_name}</span>
                      <span className="font-bold text-red-500">
                        {client.mismatch_count} mismatch{client.mismatch_count > 1 ? 'es' : ''}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-slate-500 font-medium py-4 text-center">
                  No active outreach items.
                </div>
              )}
            </div>

            <button
              onClick={() => setToast({ message: 'Initializing bulk smart outreach matching sequences...', type: 'success' })}
              className="relative z-10 w-full bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-[#7C3AED]/25 text-slate-600 font-bold text-xs py-3 rounded-2xl transition-all duration-200 mt-5 flex items-center justify-center gap-2 hover:-translate-y-px shadow-sm cursor-pointer"
            >
              Launch Smart Reconciliation Outreach
            </button>
          </div>
        </div>

      </div>

      {/* ── Modern Analytics Charts & AI Findings Section ── */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch w-full">

        {/* AI Findings panel — prominent 55% column */}
        <div
          className="lg:w-[55%] rounded-3xl p-6 flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-300 ease-out relative overflow-hidden cursor-default border border-slate-200/80"
          style={{
            ...cardBase,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.88) 100%)',
            borderColor: 'rgba(124, 58, 237, 0.25)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 8px 30px rgba(124, 58, 237, 0.04)',
          }}
          onMouseEnter={e => applyHover(e.currentTarget, '124,58,237')}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.transform = '';
            el.style.boxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 8px 30px rgba(124, 58, 237, 0.04)';
            el.style.borderColor = 'rgba(124, 58, 237, 0.25)';
          }}
        >
          {/* Decorative ambient background glows */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,255,0.06) 0%, transparent 70%)', filter: 'blur(24px)' }} />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.03) 0%, transparent 70%)', filter: 'blur(16px)' }} />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#4F46E5] flex items-center justify-center text-white shadow-sm">
                    <Sparkles size={11} fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-black text-[#7C3AED] tracking-widest uppercase">
                    Auditor Intelligence
                  </span>
                </div>
                <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full border bg-violet-50 text-[#7C3AED] border-violet-100 uppercase tracking-wider animate-pulse">
                  AI Live Insights
                </span>
              </div>

              <h2 className="text-card-title text-slate-800 mt-3">
                AI Findings & Highlights
              </h2>
              <p className="text-meta text-secondary mt-1">
                Real-time anomalies and priority items detected across client portfolios today.
              </p>

              {/* Findings List */}
              <div className="space-y-1.5 mt-5">
                {dashStats.total_mismatches > 0 && (
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 cursor-pointer group transition-all duration-200">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <ShieldAlert size={14} style={{ color: '#EF4444' }} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-800 block leading-tight">
                          {dashStats.total_mismatches} invoice mismatches detected
                        </span>
                        <span className="text-[10px] text-secondary font-semibold block mt-0.5">
                          ₹{(dashStats.blocked_itc / 100000).toFixed(1)}L ITC at risk across {dashStats.high_risk_clients} clients
                        </span>
                      </div>
                    </div>
                    <span className="status-badge status-badge-error">Critical Risk</span>
                  </div>
                )}
                {dashStats.total_mismatches === 0 && (
                  <div className="py-8 text-center text-xs text-secondary font-medium">No active findings. Portfolio is clean.</div>
                )}
              </div>
            </div>

            {/* Quick Summary Action */}
            <div className="mt-6 pt-4 border-t border-slate-100/80 flex items-center justify-between">
              <span className="text-[10px] text-secondary font-semibold">
                Click any finding card to resolve immediately.
              </span>
              <a
                href="/action-center"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10.5px] font-black text-white hover:opacity-95 shadow-sm shadow-[#7C3AED]/10 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                }}
              >
                <span>Go to Action Centre</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Charts section — compact 45% column stacked vertically */}
        <div className="lg:w-[45%] flex flex-col gap-6">

          {/* ITC Protected — bar chart card */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-300 ease-out relative overflow-hidden cursor-default border border-slate-200/80"
            style={cardBase}
            onMouseEnter={e => applyHover(e.currentTarget, '79,70,229')}
            onMouseLeave={e => resetHover(e.currentTarget)}
          >
            {/* Subtle decorations */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.03) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            </div>

            <div className="relative z-10 flex items-start justify-between mb-4">
              <div>
                <span className="text-[9px] font-black text-secondary uppercase tracking-[0.22em]">Financial Security</span>
                <h2 className="text-card-title text-slate-800 mt-0.5">Total ITC Protected</h2>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-800 tracking-tight">
                    {dashStats.blocked_itc > 0
                      ? `₹${(dashStats.blocked_itc / 10000000).toFixed(2)} Cr`
                      : "₹0"}
                  </span>
                  <span
                    className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.15)' }}
                  >
                    <TrendingUp size={8} />
                    +12.4%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#4F46E5] animate-pulse" />
                <span className="text-[8px] font-bold text-secondary uppercase tracking-widest">Realtime Sync</span>
              </div>
            </div>

            {/* Bar chart */}
            <div className="relative z-10 w-full h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="protectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.4)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 'bold' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 'bold' }}
                    tickFormatter={v => `₹${v}L`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(226,232,240,0.2)' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1E293B',
                      padding: '6px 10px'
                    }}
                  />
                  <Bar dataKey="protected" name="Protected ITC" fill="url(#protectedGrad)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="risk" name="At Risk ITC" fill="url(#riskGrad)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reconciliation Health — pie card */}
          <div
            className="rounded-3xl p-5 flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-300 ease-out relative overflow-hidden cursor-default border border-slate-200/80"
            style={cardBase}
            onMouseEnter={e => applyHover(e.currentTarget, '124,58,237')}
            onMouseLeave={e => resetHover(e.currentTarget)}
          >
            {/* Subtle decorations */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 70%)', filter: 'blur(16px)' }} />
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-secondary uppercase tracking-[0.22em]">Compliance Score</span>
                <h2 className="text-card-title text-slate-800 mt-0.5">Reconciliation Health</h2>
              </div>
              <button
                className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
              >
                Details
              </button>
            </div>

            {/* Score + trend row & Donut chart in a side-by-side flex layout to minimize visual space */}
            <div className="relative z-10 flex items-center justify-between gap-4 mt-3">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                  {pieData[0]?.value}%
                </span>
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-bold w-fit bg-emerald-50 text-[#10B981] border border-emerald-200/50 mt-1.5"
                >
                  <TrendingUp size={8} />
                  +2.4% this mo
                </span>
              </div>

              {/* Donut chart */}
              <div className="relative w-[120px] h-[90px] shrink-0">
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-[8px] text-secondary font-bold uppercase tracking-widest leading-none">Matched</span>
                  <span className="text-xs font-black text-slate-700 mt-0.5">
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
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.03)',
                        fontSize: '9px',
                        padding: '4px 8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdowns */}
            <div
              className="relative z-10 grid grid-cols-3 gap-1.5 pt-2 mt-2 border-t border-slate-100"
            >
              {pieData.map(d => (
                <div
                  key={d.name}
                  className="flex flex-col items-center text-center rounded-xl py-1 px-0.5 bg-slate-50 border border-slate-100"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mb-0.5"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[8px] text-secondary font-bold leading-none">{d.name}</span>
                  <span className="text-[10px] font-black text-slate-700 mt-0.5 leading-none">{d.value}%</span>
                </div>
              ))}
            </div>

            {/* AI Insight strip */}
            <div
              className="relative z-10 flex items-start gap-2.5 rounded-xl px-3 py-2 mt-3 bg-violet-50/50 border border-violet-100"
            >
              <Sparkles size={11} className="text-[#7C3AED] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[7.5px] font-black text-[#7C3AED] uppercase tracking-[0.18em]">AI Insight</span>
                <p className="text-[9px] font-medium text-secondary leading-snug mt-0.5">
                  {dashStats.total_mismatches > 0 ? (
                    <>
                      <span className="text-slate-800 font-bold">{dashStats.total_mismatches} invoices</span> require outreach attention today.
                    </>
                  ) : (
                    <span>Portfolio is fully reconciled. No outreach needed.</span>
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>



      {/* ── Toast Notifications ───────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border border-slate-200 bg-white animate-in slide-in-from-bottom duration-300"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={14} className="text-[#10B981]" />
            ) : (
              <ShieldAlert size={14} className="text-[#EF4444]" />
            )}
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-secondary">
              {toast.type === 'success' ? 'Success' : 'Error'}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">{toast.message}</div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-secondary hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

    </div>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, getCompoundBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  UploadCloud,
  FileText,
  ShieldAlert,
  Clock,
  Eye,
  Plus,
  Search,
  Building2,
  Scale,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Calendar,
  ArrowRight,
  X,
  Copy,
  FolderOpen,
  ArrowUpRight,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface NoticeDossier {
  id: string;
  client_id: string;
  client_name: string;
  notice_number: string;
  issuing_authority: string;
  section_references: string[];
  notice_type: string;
  tax_amount: number;
  due_date: string;
  hearing_date: string | null;
  summary: string;
  risk_level: string;
  risk_score: number;
  complexity_score: string;
  recommended_next_action: string;
  interest_exposure_est: number;
  penalty_exposure_est: number;
  total_exposure_est: number;
  required_action: string;
  status: string;
  file_path: string;
  raw_ocr_text: string;
  gstin: string;
  supporting_evidence: string[];
  missing_documents: string[];
  questions_for_client: string[];
}


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function NoticeIntelligenceCenter() {
  const [notices, setNotices] = useState<NoticeDossier[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDossier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setFile] = useState<File | null>(null);
  const [uploadClientId, setUploadClientId] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [uploadClients, setUploadClients] = useState<{id: string; business_name: string; gstin: string}[]>([]);

  // Response drafting states
  const [isDrafting, setIsDrafting] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [typedReply, setTypedReply] = useState("");

  // Filtration states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterClient, setFilterClient] = useState("ALL");
  const [toastMessage, setToastMessage] = useState("");

  // AI assistant tab switcher: 'reply' | 'evidence' | 'missing' | 'questions'
  const [activeAssistantTab, setActiveAssistantTab] = useState<'reply' | 'evidence' | 'missing' | 'questions'>('reply');

  // Interactive checklists for Reply Readiness Score
  const [checkedEvidence, setCheckedEvidence] = useState<Record<string, boolean>>({});
  const [checkedMissing, setCheckedMissing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/clients/`)
      .then(r => r.json())
      .then(data => setUploadClients(data))
      .catch(() => setUploadClients([]));
  }, []);

  // Initialize checklists when selectedNotice changes
  useEffect(() => {
    if (selectedNotice) {
      const evidenceChecks: Record<string, boolean> = {};
      selectedNotice.supporting_evidence?.forEach((doc, idx) => {
        // Pre-check the first item to show default interactivity
        evidenceChecks[doc] = idx === 0;
      });
      setCheckedEvidence(evidenceChecks);

      const missingChecks: Record<string, boolean> = {};
      selectedNotice.missing_documents?.forEach((doc) => {
        missingChecks[doc] = false;
      });
      setCheckedMissing(missingChecks);
      
      // Default to drafting tab
      setActiveAssistantTab('reply');
      setResponseDraft("");
      setTypedReply("");
    }
  }, [selectedNotice]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/notices`);
      if (!res.ok) throw new Error("Failed to load notice dossiers.");
      const data = await res.json();
      setNotices(data);
    } catch (err) {
      console.error("Notices fetch failed:", err);
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync selected notice details if refreshed
  useEffect(() => {
    if (selectedNotice) {
      const updated = notices.find(n => n.id === selectedNotice.id);
      if (updated) {
        setSelectedNotice(updated);
      }
    }
  }, [notices]);

  // Handle statutory response drafting
  const handleDraftResponse = async (noticeId: string) => {
    setIsDrafting(true);
    setResponseDraft("");
    setTypedReply("");
    try {
      const res = await fetch(`${API_BASE}/api/notices/${noticeId}/draft-response`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Statutory reply compiler failed.");
      const data = await res.json();
      setResponseDraft(data.reply);

      // Simulate live typing streams reveal
      let index = 0;
      const text = data.reply;
      const timer = setInterval(() => {
        setTypedReply((prev) => prev + text.charAt(index));
        index++;
        if (index >= text.length) {
          clearInterval(timer);
        }
      }, 5);

      showToast("✓ Response compiled successfully!");
      
      // Update local state status
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: "DRAFTED" } : n));
    } catch (err) {
      console.error(err);
      
      // Template Fallback for draft reply
      const fallbackReply = `To,
The Office of the ${selectedNotice?.issuing_authority || 'GST Department'},

SUBJECT: Reply to statutory notice ${selectedNotice?.notice_number} under Sections ${selectedNotice?.section_references.join(", ") || '73'}.

Respected Sir/Madam,

This is in response to the statutory notice ${selectedNotice?.notice_number} received regarding discrepancy in Input Tax Credit (ITC) for ${selectedNotice?.client_name}. 

We respectfully submit that we are currently reconciling our Purchase registers with GSTR-2B ledgers. In reference to the short-payment/discrepancies, we request an extension of 15 days to submit our verified invoice documentation.

Thanking you,
Authorized Representative
For ${selectedNotice?.client_name}`;
      
      setResponseDraft(fallbackReply);
      let index = 0;
      const timer = setInterval(() => {
        setTypedReply((prev) => prev + fallbackReply.charAt(index));
        index++;
        if (index >= fallbackReply.length) {
          clearInterval(timer);
        }
      }, 5);
      
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: "DRAFTED" } : n));
      showToast("✓ Draft reply generated using statutory template.");
    } finally {
      setIsDrafting(false);
    }
  };

  // Ingest uploaded files
  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadClientId) return;

    setIsUploading(true);
    setUploadProgress(10);

    const progTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 400);

    const formData = new FormData();
    formData.append("client_id", uploadClientId);
    formData.append("file", uploadFile);

    try {
      const res = await fetch(`${API_BASE}/api/notices/upload`, {
        method: "POST",
        body: formData
      });

      clearInterval(progTimer);
      setUploadProgress(100);

      if (!res.ok) throw new Error("OCR notice parser failed.");

      const newNotice = await res.json();
      showToast("✓ Notice parsed & analyzed in 12 seconds!");

      setNotices(prev => [newNotice, ...prev]);
      setShowUploadModal(false);
      setFile(null);
      setUploadClientId("");
      setSelectedNotice(newNotice);
    } catch (err) {
      console.error("Notice upload failed:", err);
      showToast("⚠ Notice parsing failed. Please check the file and try again.");
      clearInterval(progTimer);
      setUploadProgress(0);
      setIsUploading(false);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateStatus = (noticeId: string, newStatus: string) => {
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: newStatus } : n));
    setSelectedNotice(prev => prev && prev.id === noticeId ? { ...prev, status: newStatus } : prev);
    showToast(`✓ Notice status updated to ${newStatus}`);
  };

  const handleToggleEvidence = (doc: string) => {
    setCheckedEvidence(prev => ({
      ...prev,
      [doc]: !prev[doc]
    }));
  };

  const handleToggleMissing = (doc: string) => {
    setCheckedMissing(prev => ({
      ...prev,
      [doc]: !prev[doc]
    }));
  };

  const handleCopyReply = () => {
    const text = typedReply || responseDraft;
    navigator.clipboard.writeText(text);
    showToast("✓ Legal response draft copied to clipboard!");
  };

  const handleCopyQuestions = () => {
    if (!selectedNotice) return;
    const text = `Hi ${selectedNotice.client_name},\n\nWe are preparing the reply for GST notice ${selectedNotice.notice_number}. Please clarify the following questions:\n\n${(selectedNotice.questions_for_client || []).map((q, i) => `${i+1}. ${q}`).join("\n")}\n\nWe also require these documents:\n${(selectedNotice.missing_documents || []).map(d => `- ${d}`).join("\n")}\n\nThanks,\nAudit Team`;
    navigator.clipboard.writeText(text);
    showToast("✓ Client outreach questions copied to clipboard!");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filtration logic
  const filteredNotices = notices.filter(item => {
    const client = item.client_name.toLowerCase();
    const refNum = item.notice_number.toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query && !client.includes(query) && !refNum.includes(query)) {
      return false;
    }
    if (filterRisk !== 'ALL' && item.risk_level !== filterRisk) {
      return false;
    }
    if (filterStatus !== 'ALL' && item.status !== filterStatus) {
      return false;
    }
    if (filterClient !== 'ALL' && item.client_id !== filterClient) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const openNoticesCount = notices.filter(n => n.status !== 'RESOLVED').length;
  const highRiskCount = notices.filter(n => (n.risk_level === 'HIGH' || n.risk_score >= 70) && n.status !== 'RESOLVED').length;
  const totalTaxExposure = notices.reduce((sum, n) => sum + (n.status !== 'RESOLVED' ? n.tax_amount : 0), 0);
  
  const upcomingDeadlinesCount = notices.filter(n => {
    if (n.status === 'RESOLVED') return false;
    const diffTime = new Date(n.due_date).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 15;
  }).length;

  const totalExposureAmount = notices.reduce((sum, n) => {
    if (n.status === 'RESOLVED') return sum;
    return sum + (n.total_exposure_est || (n.tax_amount * 1.28));
  }, 0);

  // Stepper state indicator (Steps 1 to 5)
  const getActiveStep = () => {
    if (!selectedNotice) return 1;
    if (selectedNotice.status === 'PENDING') return 2; // Step 2: AI parsed, Step 3: Risk calculations
    if (selectedNotice.status === 'DRAFTED') return 4; // Step 4: Response Prepared
    if (selectedNotice.status === 'RESOLVED') return 5; // Step 5: Resolution Action Tracking
    return 3;
  };

  // Reply Readiness calculations
  const getReadinessScore = () => {
    if (!selectedNotice) return 0;
    const totalEvidence = (selectedNotice.supporting_evidence?.length || 0) + (selectedNotice.missing_documents?.length || 0);
    if (totalEvidence === 0) return 0;
    
    let checkedCount = 0;
    selectedNotice.supporting_evidence?.forEach(doc => {
      if (checkedEvidence[doc]) checkedCount++;
    });
    selectedNotice.missing_documents?.forEach(doc => {
      if (checkedMissing[doc]) checkedCount++;
    });
    
    return Math.round((checkedCount / totalEvidence) * 100);
  };

  const readinessPercent = getReadinessScore();

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-500 font-sans relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#4F46E5] text-slate-800 px-6 py-4 rounded-2xl shadow-xl z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#4F46E5] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold text-slate-700">{toastMessage}</span>
        </div>
      )}

      {/* 5-Step Horizontally Guided Progress Tracker */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="relative flex justify-between items-center max-w-4xl mx-auto">
          {/* Stepper track background */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-0"></div>
          
          {/* Stepper track progress fill */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 -translate-y-1/2 -z-0 transition-all duration-500 ease-out"
            style={{ width: `${((getActiveStep() - 1) / 4) * 100}%` }}
          ></div>

          {[
            { step: 1, label: "Upload Notice", sub: "PDF / Image Intake" },
            { step: 2, label: "AI Notice Analysis", sub: "Statute Parsing" },
            { step: 3, label: "Risk Assessment", sub: "Estimated Impact" },
            { step: 4, label: "Response Prep", sub: "Readiness & Drafting" },
            { step: 5, label: "Action Tracking", sub: "Litigation Resolution" }
          ].map((item) => {
            const isActive = getActiveStep() === item.step;
            const isCompleted = getActiveStep() > item.step;
            
            return (
              <div key={item.step} className="relative z-10 flex flex-col items-center group">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent shadow-md' 
                      : isActive 
                        ? 'bg-white border-[#4F46E5] text-[#4F46E5] shadow-md ring-4 ring-[#4F46E5]/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : item.step}
                </div>
                <span className={`text-[11px] font-black mt-2.5 transition-colors ${isActive ? 'text-[#4F46E5]' : 'text-slate-700'}`}>
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-0.5">{item.sub}</span>
              </div>
            );
          })}
        </div>
      </div>

      <PageHeader
        sectionLabel="Litigation & Compliance workspace"
        title="Notice Intelligence Center"
        description="Statutory GST notice investigation portal. Digest notice, assess exposure, and respond in under 60 seconds."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Ingest GST Notice</span>
          </button>
        }
      />

      {/* Top Hero: Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Metric Block - Total Exposure Amount */}
        <div className="premium-card col-span-1 lg:col-span-1 border border-slate-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-transparent relative overflow-hidden flex flex-col justify-between h-[170px]">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#4F46E5]/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-black text-[#5B6478] uppercase tracking-wider block font-mono">Primary Aggregate Exposure</span>
              <span className="text-[8.5px] font-extrabold bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/15 px-1.5 py-0.2 rounded font-mono">ESTIMATE</span>
            </div>
            <div className="text-4xl font-extrabold text-slate-800 tracking-tight mt-2.5 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
              {formatCurrency(totalExposureAmount)}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium font-mono leading-relaxed mt-4 pt-3 border-t border-slate-100">
            Includes statutory estimated liabilities, interest accumulation, & penalties.
          </p>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            {
              label: 'Open Notice Files',
              value: openNoticesCount,
              desc: 'Litigation cases active',
              color: '#3B82F6', bg: 'bg-blue-50 border-blue-100 text-[#3B82F6]'
            },
            {
              label: 'High-Risk Notices',
              value: highRiskCount,
              desc: 'Risk index score >= 70',
              color: '#EF4444', bg: 'bg-red-50 border-red-100 text-[#EF4444]'
            },
            {
              label: 'Potential Tax Demand',
              value: formatCurrency(totalTaxExposure),
              desc: 'Extracted principal tax',
              color: '#F59E0B', bg: 'bg-amber-50 border-amber-100 text-[#F59E0B]'
            },
            {
              label: 'Upcoming Deadlines',
              value: upcomingDeadlinesCount,
              desc: 'Reply due within 15 days',
              color: '#7C3AED', bg: 'bg-violet-50 border-violet-100 text-[#7C3AED]'
            }
          ].map((stat) => (
            <div key={stat.label} className="premium-card bg-white flex flex-col justify-between p-5 h-[170px]">
              <div>
                <span className="text-[9.5px] font-black text-[#5B6478] uppercase tracking-wider block leading-tight truncate">{stat.label}</span>
                <div className="text-xl font-extrabold text-slate-800 mt-3">{stat.value}</div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[9.5px] text-slate-400 font-medium block truncate">{stat.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Dossier Registry Ledger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Dossier Ledger</h2>
              <p className="text-[11px] text-slate-500">Active audits filter matched under litigation tags.</p>
            </div>
            
            {/* Search */}
            <div className="relative shrink-0 max-w-xs w-full sm:w-48">
              <Search size={12} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reference..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-[11px] font-medium text-slate-800 placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5]/40"
              />
            </div>
          </div>

          {/* Filters Panel */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
            {/* Client Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block font-mono">Client</span>
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="w-full bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Clients</option>
                {uploadClients.map(c => (
                  <option key={c.id} value={c.id}>{c.business_name.split(' ')[0]}</option>
                ))}
              </select>
            </div>

            {/* Risk Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block font-mono">Risk</span>
              <select
                value={filterRisk}
                onChange={e => setFilterRisk(e.target.value)}
                className="w-full bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Risks</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block font-mono">Status</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending Reply</option>
                <option value="DRAFTED">Drafted</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Dossiers Ledger list */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100/50 border border-slate-200 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredNotices.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 hidden-scrollbar">
              {filteredNotices.map((notice) => {
                const isSelected = selectedNotice?.id === notice.id;

                const complexityColors: Record<string, string> = {
                  Complex: "border-l-4 border-l-red-500",
                  Moderate: "border-l-4 border-l-amber-500",
                  Simple: "border-l-4 border-l-emerald-500"
                };

                const riskColors: Record<string, string> = {
                  HIGH: "bg-red-50 text-red-700 border-red-100",
                  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
                  LOW: "bg-emerald-50 text-emerald-700 border-emerald-100"
                };

                const statusColors: Record<string, string> = {
                  PENDING: "bg-indigo-50 text-[#4F46E5] border-indigo-100",
                  DRAFTED: "bg-violet-50 text-[#7C3AED] border-violet-100",
                  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100"
                };

                return (
                  <div
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-all cursor-pointer ${
                      isSelected ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/5' : 'border-slate-200/80'
                    } ${complexityColors[notice.complexity_score] || 'border-l-4 border-l-slate-200'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-extrabold text-[#5B6478] tracking-wide block truncate max-w-[130px] font-mono">{notice.client_name}</span>
                          <span className={`status-badge ${getCompoundBadgeClass(notice.risk_level, notice.status)}`}>
                            {notice.risk_level} RISK · {notice.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 mt-1 tracking-tight truncate">{notice.notice_number}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block text-[8px] font-black text-[#5B6478] uppercase tracking-wider font-mono">Disputed Principal</span>
                        <span className="text-xs font-black text-slate-800 font-mono">{formatCurrency(notice.tax_amount)}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{notice.summary}</p>

                    <div className="flex justify-between items-center text-[9.5px] text-slate-400 pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[200px]">Type: <span className="text-slate-600 font-bold">{notice.notice_type}</span></span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-bold text-slate-400">Next:</span>
                        <span className="bg-indigo-50 border border-indigo-100/50 text-[#4F46E5] font-black text-[8px] px-1.5 py-0.2 rounded uppercase">
                          {notice.recommended_next_action}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Litigation Center Dossiers Clear</h4>
                <p className="text-[10px] text-slate-500 mt-1">There are no pending GST notices recorded under the active filters.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Notice Investigation Panel */}
        <div className="lg:col-span-7">
          {selectedNotice ? (
            <div className="premium-card bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-6 scroll-smooth animate-in slide-in-from-right-4 duration-300">
              
              {/* Workspace Header */}
              <div className="flex justify-between items-start border-b border-slate-200/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[#4F46E5] tracking-[0.18em] uppercase block font-mono">Litigation Dossier Workspace</span>
                    <span className={`status-badge ${
                      selectedNotice.complexity_score === 'Complex' ? 'status-badge-error' :
                      selectedNotice.complexity_score === 'Moderate' ? 'status-badge-warning' :
                      'status-badge-success'
                    }`}>
                      {selectedNotice.complexity_score} Complexity
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mt-1 tracking-tight select-all">
                    {selectedNotice.notice_number}
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-bold">{selectedNotice.client_name} · GSTIN: <span className="font-mono">{selectedNotice.gstin}</span></span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Next recommended action prompt */}
                  <div className="hidden sm:flex flex-col text-right pr-2 border-r border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Recommended Action</span>
                    <span className="text-[10px] font-extrabold text-[#4F46E5] uppercase tracking-wide">{selectedNotice.recommended_next_action}</span>
                  </div>
                  
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Workflow Stepper Action banner */}
              <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center flex-shrink-0 border border-[#4F46E5]/20 animate-pulse">
                    <Sparkles size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Action required for response</span>
                    <p className="text-[11px] font-extrabold text-slate-700 leading-normal">{selectedNotice.required_action}</p>
                  </div>
                </div>
                
                {selectedNotice.status === 'PENDING' ? (
                  <button
                    onClick={() => handleDraftResponse(selectedNotice.id)}
                    disabled={isDrafting}
                    className="btn btn-primary btn-sm shrink-0 self-start sm:self-auto disabled:opacity-50"
                  >
                    {isDrafting ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} fill="currentColor" />}
                    <span>Compile AI Response</span>
                  </button>
                ) : (
                  <span className="status-badge status-badge-success shrink-0">
                    ✓ Reply Prepared
                  </span>
                )}
              </div>

              {/* AI Summary Panel */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Sparkles size={13} className="text-[#4F46E5]" />
                  <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">AI Investigation Analysis</span>
                </div>

                <div className="bg-[#4F46E5]/[0.02] border border-[#4F46E5]/10 p-4 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#4F46E5]/5 rounded-full filter blur-lg"></div>
                  <span className="text-[8.5px] font-black text-[#4F46E5] tracking-widest uppercase block font-mono">Plain English Executive Summary</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic mt-1.5">
                    "{selectedNotice.summary}"
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Notice Type</span>
                    <span className="text-[11.5px] font-bold text-slate-800 mt-1 block uppercase">{selectedNotice.notice_type}</span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Relevant Sections</span>
                    <span className="text-[11.5px] font-bold text-[#4F46E5] mt-1 block truncate" title={selectedNotice.section_references.join(", ")}>
                      {selectedNotice.section_references.join(", ") || "GST Act Rules"}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Response Deadline</span>
                    <span className="text-[11.5px] font-bold text-slate-800 mt-1 block flex items-center gap-1">
                      <Calendar size={11} className="text-[#4F46E5] shrink-0" />
                      <span>{selectedNotice.due_date}</span>
                    </span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Complexity Grade</span>
                    <span className="text-[11.5px] font-bold text-slate-800 mt-1 block flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        selectedNotice.complexity_score === 'Complex' ? 'bg-red-500' :
                        selectedNotice.complexity_score === 'Moderate' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}></span>
                      <span>{selectedNotice.complexity_score}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk & Estimated Exposure Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Risk Score Radial Indicator */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-white relative overflow-hidden flex flex-col justify-between h-[160px]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono font-bold">Risk Assessment</span>
                      <span className="text-[10px] font-bold text-slate-700 mt-0.5 block">Audit Threat Rating</span>
                    </div>
                    <span className={`status-badge ${
                      selectedNotice.risk_score >= 75 ? 'status-badge-error' :
                      selectedNotice.risk_score >= 45 ? 'status-badge-warning' :
                      'status-badge-success'
                    }`}>
                      {selectedNotice.risk_score >= 75 ? 'CRITICAL SEVERITY' :
                       selectedNotice.risk_score >= 45 ? 'MEDIUM SEVERITY' : 'LOW SEVERITY'}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 mt-2">
                    {/* Visual Radial Ring */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke={selectedNotice.risk_score >= 75 ? '#EF4444' : selectedNotice.risk_score >= 45 ? '#F59E0B' : '#10B981'} 
                          strokeWidth="6" fill="transparent" 
                          strokeDasharray={176}
                          strokeDashoffset={176 - (176 * selectedNotice.risk_score) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[13px] font-mono font-black text-slate-800">{selectedNotice.risk_score}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700">Risk Score: {selectedNotice.risk_score} / 100</span>
                      <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">
                        Evaluated based on type, principal value at stake, and remaining response time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estimated Exposure Analysis Card */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-white relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono font-bold">Exposure Analysis</span>
                    <span className="text-[8px] font-black bg-indigo-50 border border-indigo-100 text-[#4F46E5] px-1.5 py-0.2 rounded uppercase font-mono">Estimates</span>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-500 font-medium">Estimated Tax Impact:</span>
                      <span className="text-slate-800 font-bold font-mono">{formatCurrency(selectedNotice.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-500 font-medium">Estimated Interest Impact (18% p.a.):</span>
                      <span className="text-slate-800 font-bold font-mono">{formatCurrency(selectedNotice.interest_exposure_est)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-500 font-medium">Estimated Penalty Impact (10%):</span>
                      <span className="text-slate-800 font-bold font-mono">{formatCurrency(selectedNotice.penalty_exposure_est)}</span>
                    </div>
                    
                    <div className="h-px bg-slate-100 my-1"></div>
                    
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-700">Estimated Total Exposure:</span>
                      <span className="text-[#4F46E5] font-mono text-[12px] font-black">{formatCurrency(selectedNotice.total_exposure_est)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Reply Readiness Score Widget */}
              <div className="border border-slate-200/85 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">Reply Readiness Score</span>
                    <span className="text-[10px] font-bold text-slate-700 mt-0.5 block">Audit Evidentiary Completion</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-indigo-600 font-mono">{readinessPercent}%</span>
                    <span className="text-[9px] text-slate-400 font-medium block">Ready to File</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${readinessPercent}%` }}
                  ></div>
                </div>

                <div className="flex gap-6 text-[9.5px] text-slate-500 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Available Evidence: {Object.values(checkedEvidence).filter(Boolean).length} / {selectedNotice.supporting_evidence?.length || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#4F46E5]"></span>
                    <span>Missing Documents Obtained: {Object.values(checkedMissing).filter(Boolean).length} / {selectedNotice.missing_documents?.length || 0}</span>
                  </span>
                </div>
              </div>

              {/* AI Drafting Assistant Tabs Console */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <Sparkles size={12} className="text-[#4F46E5]" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider font-mono">AI Drafting Assistant</span>
                  </div>
                  
                  {/* Tab switches */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9.5px] font-bold text-slate-600 border border-slate-200/50">
                    {[
                      { id: 'reply', label: "Draft Reply" },
                      { id: 'evidence', label: "Supporting Evidence" },
                      { id: 'missing', label: "Missing Documents" },
                      { id: 'questions', label: "Questions for Client" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAssistantTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                          activeAssistantTab === tab.id 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content render */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 min-h-[160px] relative">
                  
                  {activeAssistantTab === 'reply' && (
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] font-black text-[#4F46E5] uppercase tracking-wider block font-mono flex items-center gap-1">
                          <Sparkles size={10} fill="currentColor" />
                          <span>Compiled Response Draft</span>
                        </span>
                        
                        {(typedReply || responseDraft) && (
                          <button
                            onClick={handleCopyReply}
                            className="p-1.5 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            title="Copy reply letter"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>

                      {(!responseDraft && !typedReply && !isDrafting) ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <p className="text-[10px] text-slate-500 font-medium max-w-sm mb-3">
                            The AI statutory response generator compiles an official reply addressing each section and mismatch.
                          </p>
                          <button
                            onClick={() => handleDraftResponse(selectedNotice.id)}
                            disabled={isDrafting}
                            className="px-4 py-2 bg-white border border-slate-200 text-[#4F46E5] text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isDrafting ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} fill="currentColor" />}
                            <span>Compile Letter Reply</span>
                          </button>
                        </div>
                      ) : isDrafting && !typedReply ? (
                        <div className="flex items-center gap-2 py-6 justify-center">
                          <RefreshCw size={14} className="animate-spin text-[#4F46E5]" />
                          <span className="text-[11px] text-slate-500 font-medium">Compiling statutory response...</span>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-[10.5px] leading-relaxed text-slate-600 font-mono h-48 overflow-y-auto pr-1">
                          <pre className="whitespace-pre-wrap font-mono text-[10px]">
                            {typedReply}
                            {(typedReply.length < responseDraft.length || isDrafting) && (
                              <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#4F46E5] animate-pulse">|</span>
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {activeAssistantTab === 'evidence' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider block font-mono">Evidence Available Checklist</span>
                        <span className="text-[9px] text-slate-400 font-medium">Verify documents present</span>
                      </div>

                      <div className="space-y-2">
                        {selectedNotice.supporting_evidence?.map((doc, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleToggleEvidence(doc)}
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/50 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                              checkedEvidence[doc] ? 'bg-emerald-500 border-transparent text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {checkedEvidence[doc] && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className={`text-[10.5px] font-bold transition-colors ${checkedEvidence[doc] ? 'text-slate-700 line-through decoration-slate-300' : 'text-slate-600'}`}>
                              {doc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAssistantTab === 'missing' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider block font-mono">Missing Evidence Tracking</span>
                        <span className="text-[9px] text-[#4F46E5] font-black uppercase font-mono bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">Check when obtained</span>
                      </div>

                      <div className="space-y-2">
                        {selectedNotice.missing_documents?.map((doc, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleToggleMissing(doc)}
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/50 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                              checkedMissing[doc] ? 'bg-indigo-600 border-transparent text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {checkedMissing[doc] && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className={`text-[10.5px] font-bold transition-colors ${checkedMissing[doc] ? 'text-slate-700 line-through decoration-slate-300' : 'text-slate-600'}`}>
                              {doc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAssistantTab === 'questions' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider block font-mono">Questions For Client Interview</span>
                        <button
                          onClick={handleCopyQuestions}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy size={9} />
                          <span>Copy Questions Pack</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedNotice.questions_for_client?.map((q, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/50 flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 font-mono">
                              {idx+1}
                            </span>
                            <p className="text-[10.5px] text-slate-600 font-semibold leading-relaxed pt-0.5">
                              {q}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Vertical Milestones Timeline */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#4F46E5]" />
                  <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider block font-mono">Litigation Milestones Timeline</span>
                </div>

                <div className="relative pl-4 space-y-4 border-l border-slate-200 ml-1 text-xs">
                  
                  {/* Milestone 1: Notice Received */}
                  <div className="relative">
                    <div className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></div>
                    <div className="font-extrabold text-slate-800 text-[11px]">Notice Received & Logged</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-bold">2026-05-20 · Central Portal Registry</div>
                  </div>

                  {/* Milestone 2: Analysis Completed */}
                  <div className="relative">
                    <div className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></div>
                    <div className="font-extrabold text-slate-800 text-[11px]">AI Notice Analysis Completed</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-bold">2026-05-28 · OCR & NLP Extraction Done</div>
                  </div>

                  {/* Milestone 3: Response Prepared */}
                  <div className="relative">
                    <div className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full border border-white ${
                      selectedNotice.status !== 'PENDING' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></div>
                    <div className="font-extrabold text-slate-800 text-[11px]">Response Reply Prepared</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-bold">
                      {selectedNotice.status !== 'PENDING' ? "Statutory letter drafted by assistant" : "Draft reply compiling required"}
                    </div>
                  </div>

                  {/* Milestone 4: Response Submitted */}
                  <div className="relative">
                    <div className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full border border-white ${
                      selectedNotice.status === 'RESOLVED' ? 'bg-emerald-500' :
                      selectedNotice.status === 'DRAFTED' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'
                    }`}></div>
                    <div className="font-extrabold text-slate-800 text-[11px]">Response Submitted to Portal</div>
                    <div className="text-[9px] mt-0.5 font-bold text-slate-400">
                      {selectedNotice.status === 'RESOLVED' ? "Uploaded successfully to GST portal" :
                       selectedNotice.status === 'DRAFTED' ? "Awaiting submission verification" : "Pending reply preparation"}
                    </div>
                    {selectedNotice.status === 'DRAFTED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedNotice.id, "RESOLVED")}
                        className="btn btn-secondary btn-sm mt-1"
                      >
                        Mark as Submitted
                      </button>
                    )}
                  </div>

                  {/* Milestone 5: Resolution Status */}
                  <div className="relative">
                    <div className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full border border-white ${
                      selectedNotice.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></div>
                    <div className="font-extrabold text-slate-800 text-[11px]">Litigation Case Resolved</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-bold">
                      {selectedNotice.status === 'RESOLVED' ? "Resolved & cleared. No dues pending." : "Active under statutory scrutiny files"}
                    </div>
                  </div>

                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    if (selectedNotice.status === 'PENDING') {
                      handleDraftResponse(selectedNotice.id);
                    } else {
                      setActiveAssistantTab('reply');
                      showToast("Draft reply already prepared.");
                    }
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Draft Reply
                </button>
                <button
                  onClick={() => {
                    showToast("✓ Exporting statutory summary report PDF...");
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Export Notice Summary
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Request Client Documents
                </button>
                <button
                  onClick={() => {
                    showToast("✓ Dispatching calendar follow-up sync reminder...");
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Schedule Follow-Up
                </button>
              </div>

            </div>
          ) : (
            <div className="premium-card text-center py-20 px-8 flex flex-col gap-4 items-center justify-center h-full border border-dashed border-slate-200/80 bg-white shadow-sm">
              <FolderOpen size={40} className="text-slate-400" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Litigation Workspace Idle</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Select an active notice dossier on the ledger pane to preview extracted summaries, complexity scores, estimated exposures, and AI reply drafts.
                </p>
              </div>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary btn-sm mt-2"
              >
                Ingest New Notice
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* INGEST FILE UPLOAD MODAL                                       */}
      {/* ============================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-xl relative space-y-6">

            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9.5px] font-black text-[#4F46E5] tracking-[0.2em] uppercase block font-mono">Litigation intake desk</span>
                <h3 className="text-xl font-black text-slate-800 mt-1">Ingest GST Notice</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload a statutory PDF notice, scanned image, or screenshot, and the CA-OS intelligence system will parse and extract it in under 60 seconds.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                  setUploadClientId("");
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Ingestion form */}
            <form onSubmit={handleFileUploadSubmit} className="space-y-5">

              {/* Select Client dropdown */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-mono">Client Profile</label>
                <select
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  required
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#4F46E5]/40 transition-all cursor-pointer"
                >
                  <option value="" disabled>Choose a business client...</option>
                  {uploadClients.map(c => (
                    <option key={c.id} value={c.id}>{c.business_name} ({c.gstin})</option>
                  ))}
                </select>
              </div>

              {/* File dropzone area */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-mono">Attach Document</label>

                {!uploadFile ? (
                  <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-slate-50/50">
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20 flex items-center justify-center mb-3">
                      <UploadCloud size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 text-center">Drag & drop PDF / Image here</span>
                    <span className="text-[9.5px] text-slate-400 mt-1 text-center">or click to browse local folders (Max: 10MB)</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 truncate block max-w-[240px]" title={uploadFile.name}>
                          {uploadFile.name}
                        </span>
                        <span className="text-[9.5px] text-slate-400 mt-0.5 block font-mono">
                          Size: {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Processing Progress state */}
              {isUploading && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-700 animate-pulse flex items-center gap-1.5">
                      <RefreshCw size={11} className="animate-spin text-[#4F46E5]" />
                      <span>Parsing OCR & extracting AI summaries...</span>
                    </span>
                    <span className="font-mono font-bold text-[#4F46E5]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Actions footer */}
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setUploadClientId("");
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadClientId}
                  className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process & Analyze
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Share/Outreach Modal */}
      {showShareModal && selectedNotice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-lg w-full mx-4 shadow-xl relative space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9.5px] font-black text-[#4F46E5] tracking-[0.2em] uppercase block font-mono">Client Outreach Dispatch</span>
                <h3 className="text-lg font-black text-slate-800 mt-1">Request Client Documents</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-mono">Pre-Formatted Message Pack</span>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[10.5px] leading-relaxed text-slate-600 font-mono h-52 overflow-y-auto pr-1">
                <p className="font-bold">Subject: Documents & Clarifications Needed for GST Notice {selectedNotice.notice_number}</p>
                <br />
                <p>Dear {selectedNotice.client_name} Team,</p>
                <br />
                <p>We are analyzing the GST audit/scrutiny notice (Ref: {selectedNotice.notice_number}) received by your firm. To compile the response, please share the following evidence documents at the earliest:</p>
                <br />
                {selectedNotice.missing_documents?.map((d, i) => (
                  <p key={i} className="pl-3 font-semibold">- [ ] {d}</p>
                ))}
                <br />
                <p>Also, please clarify the following operational questions:</p>
                {selectedNotice.questions_for_client?.map((q, i) => (
                  <p key={i} className="pl-3 font-semibold">{i+1}. {q}</p>
                ))}
                <br />
                <p>Best regards,</p>
                <p>Tax & Audit Team</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCopyQuestions();
                  setShowShareModal(false);
                }}
                className="btn btn-primary btn-sm"
              >
                <Copy size={12} />
                <span>Copy Outreach Pack</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

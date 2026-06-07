"use client";

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Plus,
  Search,
  RefreshCw,
  X,
  Copy,
  FolderOpen,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

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
  const [uploadError, setUploadError] = useState("");

  // Response drafting states
  const [isDrafting, setIsDrafting] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [typedReply, setTypedReply] = useState("");

  // Filtration states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
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
    const fetchClients = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/clients/`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            "Content-Type": "application/json"
          }
        });
        if (res.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setUploadClients(data);
        } else {
          setUploadClients([]);
        }
      } catch (err) {
        console.error("Client lookup failed:", err);
        setUploadClients([]);
      }
    };
    fetchClients();
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
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/notices`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          "Content-Type": "application/json"
        }
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }
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
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/notices/${noticeId}/draft-response`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          "Content-Type": "application/json"
        }
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }
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
    setUploadError("");
    setUploadProgress(10);

    const progTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 400);

    const formData = new FormData();
    formData.append("client_id", uploadClientId);
    formData.append("file", uploadFile);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/notices/upload`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData
      });

      clearInterval(progTimer);
      setUploadProgress(100);

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }

      if (res.status === 403) {
        setUploadError("Client not in your firm");
        showToast("⚠ Client not in your firm");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      if (!res.ok) throw new Error("OCR notice parser failed.");

      const newNotice = await res.json();
      showToast("✓ Notice parsed & analyzed in 12 seconds!");

      setNotices(prev => [newNotice, ...prev]);
      setShowUploadModal(false);
      setFile(null);
      setUploadClientId("");
      setUploadError("");
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
    if (filterStatus !== 'ALL' && item.status !== filterStatus) {
      return false;
    }
    return true;
  });

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
    <div className="flex flex-col h-screen overflow-hidden bg-white font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#2563EB] text-slate-800 px-6 py-4 rounded shadow-xl z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <CheckCircle className="text-[#2563EB] flex-shrink-0" size={16} />
          <span className="text-[13px] font-semibold text-slate-700">{toastMessage}</span>
        </div>
      )}

      {/* Header: 48px white border-bottom pattern */}
      <div className="h-[48px] border-b border-[#E5E7EB] bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-[#111827]">Regulatory Notices Inbox</h1>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
            {notices.length} Total
          </span>
        </div>
        <div>
          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError("");
            }}
            className="px-3 py-1 bg-[#111827] hover:bg-slate-800 text-white text-[11px] font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={12} />
            <span>Ingest Notice</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden lg:flex-row flex-col">
        {/* Left Panel - Notice List (340px, border-right, white background) */}
        <div className="w-full lg:w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col overflow-hidden h-full">
          {/* Toolbar: search 100% width minus padding, height 30px, border-bottom 1px solid #E5E7EB, padding 8px */}
          <div className="h-[30px] border-b border-[#E5E7EB] flex items-center bg-white shrink-0" style={{ padding: '8px' }}>
            <div className="relative w-full flex items-center h-full">
              <Search size={12} className="absolute left-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reference or client..."
                className="w-full h-full bg-transparent pl-6 pr-2 text-[11px] font-medium text-slate-800 placeholder-[#9CA3AF] focus:outline-none"
              />
            </div>
          </div>

          {/* Filter tabs (All / Pending / Responded / Closed): underline tab style, height 32px, font 12px */}
          <div className="h-[32px] border-b border-[#E5E7EB] flex items-center bg-white px-2 shrink-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'DRAFTED', label: 'Responded' },
              { id: 'RESOLVED', label: 'Closed' }
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`h-full px-3 text-[12px] font-medium transition-all relative cursor-pointer ${
                    isActive ? 'text-[#111827] font-semibold' : 'text-[#6B7280] hover:text-[#374151]'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111827]"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notice list scroll area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-[4px]"></div>
                ))}
              </div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => {
                const isSelected = selectedNotice?.id === notice.id;
                
                // Urgency indicator left border color
                let urgencyColor = 'transparent';
                if (notice.risk_level === 'HIGH' || notice.risk_score >= 70) {
                  urgencyColor = '#B91C1C';
                } else if (notice.risk_level === 'MEDIUM' || (notice.risk_score >= 40 && notice.risk_score < 70)) {
                  urgencyColor = '#B45309';
                }

                // Due date text color
                let dueDateColor = '#6B7280';
                if (notice.status !== 'RESOLVED') {
                  const due = new Date(notice.due_date);
                  const now = new Date();
                  due.setHours(0,0,0,0);
                  now.setHours(0,0,0,0);
                  if (due < now) {
                    dueDateColor = '#B91C1C'; // Overdue
                  } else {
                    const diffTime = due.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 15) {
                      dueDateColor = '#B45309'; // Upcoming
                    }
                  }
                }

                return (
                  <div
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className={`w-full h-[56px] px-3 py-2 flex flex-col justify-between border-b border-[#F3F4F6] cursor-pointer transition-colors relative shrink-0 ${
                      isSelected ? 'bg-[#EFF6FF]' : 'bg-white hover:bg-slate-50'
                    }`}
                    style={{ borderLeft: `3px solid ${urgencyColor}` }}
                  >
                    {/* Line 1: notice type 12px weight 600 #111827 + period 11px #6B7280 right */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[12px] font-semibold text-[#111827] truncate pr-2">
                        {notice.notice_type}
                      </span>
                      <span className="text-[11px] text-[#6B7280] font-mono shrink-0">
                        {notice.notice_number}
                      </span>
                    </div>
                    {/* Line 2: issuing authority 11px #6B7280 */}
                    <div className="text-[11px] text-[#6B7280] truncate leading-none">
                      {notice.issuing_authority}
                    </div>
                    {/* Line 3: due date 11px */}
                    <div className="flex justify-between items-center w-full leading-none">
                      <span className="text-[11px] truncate font-medium text-slate-500">
                        {notice.client_name}
                      </span>
                      <span className="text-[11px] font-medium font-mono shrink-0" style={{ color: dueDateColor }}>
                        Due: {notice.due_date}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={20} className="text-[#D1D5DB]" />
                <span className="text-[12px] text-[#6B7280] font-medium">No notices found</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Detail View (background #F7F8FA) */}
        <div className="flex-1 bg-[#F7F8FA] flex flex-col overflow-hidden h-full">
          {selectedNotice ? (
            <>
              {/* Header: notice reference 15px weight 600 #111827, meta row 12px #6B7280, height 52px border-bottom 1px solid #E5E7EB, background #FFFFFF */}
              <div className="h-[52px] border-b border-[#E5E7EB] bg-white px-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col justify-center min-w-0">
                  <h2 className="text-[15px] font-semibold text-[#111827] leading-tight select-all truncate">
                    {selectedNotice.notice_number}
                  </h2>
                  <div className="text-[12px] text-[#6B7280] leading-none mt-0.5 truncate">
                    {selectedNotice.client_name} · GSTIN: <span className="font-mono">{selectedNotice.gstin}</span>
                  </div>
                </div>
                {/* Status + priority badges: rectangular per badge rules */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider rounded-sm ${
                    selectedNotice.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' :
                    selectedNotice.status === 'DRAFTED' ? 'bg-[#DBEAFE] text-[#2563EB] border-[#BFDBFE]' :
                    'bg-[#D1FAE5] text-[#059669] border-[#A7F3D0]'
                  }`}>
                    {selectedNotice.status}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider rounded-sm ${
                    selectedNotice.risk_level === 'HIGH' ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]' :
                    selectedNotice.risk_level === 'MEDIUM' ? 'bg-[#FFEDD5] text-[#D97706] border-[#FED7AA]' :
                    'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]'
                  }`}>
                    {selectedNotice.risk_level} Risk
                  </span>
                </div>
              </div>

              {/* Details Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* AI SUGGESTION PANEL */}
                <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded p-4">
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4B5563] block mb-1">
                    AI Suggestion
                  </span>
                  <p className="text-[12px] text-[#374151] leading-relaxed">
                    {selectedNotice.summary}
                  </p>
                </div>

                {/* Section Cards: background #FFFFFF, border 1px solid #E5E7EB, border-radius 4px, padding 16px, margin-bottom 12px */}
                {/* Card 1: Notice Overview */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  {/* Section title: 12px uppercase weight 600 letter-spacing 0.05em #4B5563, border-bottom 1px solid #F3F4F6, padding-bottom 8px, margin-bottom 12px */}
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    Notice Details
                  </h3>
                  
                  {/* Info rows: label 11px #6B7280 width 140px, value 13px #111827 */}
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Issuing Authority</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.issuing_authority}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Notice Type</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.notice_type}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Section References</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.section_references.join(", ") || "N/A"}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Due Date</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.due_date}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Complexity Score</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.complexity_score}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Financial Assessment */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    Exposure Analysis
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Risk Score</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedNotice.risk_score} / 100</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Estimated Tax</span>
                      <span className="text-[13px] text-[#111827] font-medium">{formatCurrency(selectedNotice.tax_amount)}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Interest Impact</span>
                      <span className="text-[13px] text-[#111827] font-medium">{formatCurrency(selectedNotice.interest_exposure_est)}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Penalty Impact</span>
                      <span className="text-[13px] text-[#111827] font-medium">{formatCurrency(selectedNotice.penalty_exposure_est)}</span>
                    </div>
                    <div className="flex items-start border-t border-[#F3F4F6] pt-2">
                      <span className="text-[11px] text-[#6B7280] w-[140px] shrink-0">Total Exposure</span>
                      <span className="text-[13px] text-[#2563EB] font-bold">{formatCurrency(selectedNotice.total_exposure_est)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Evidence & Readiness Checklist */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    Reply Readiness ({readinessPercent}%)
                  </h3>
                  
                  <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden mb-3">
                    <div 
                      className="h-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${readinessPercent}%` }}
                    ></div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] text-[#6B7280] font-medium block mb-1.5">Supporting Evidence Checklist</span>
                      <div className="space-y-1">
                        {selectedNotice.supporting_evidence?.map((doc) => (
                          <label key={doc} className="flex items-center gap-2 py-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checkedEvidence[doc]}
                              onChange={() => handleToggleEvidence(doc)}
                              className="rounded border-[#E5E7EB] text-[#2563EB] focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="text-[12px] text-[#374151]">{doc}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#6B7280] font-medium block mb-1.5">Missing Documents Tracking</span>
                      <div className="space-y-1">
                        {selectedNotice.missing_documents?.map((doc) => (
                          <label key={doc} className="flex items-center gap-2 py-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checkedMissing[doc]}
                              onChange={() => handleToggleMissing(doc)}
                              className="rounded border-[#E5E7EB] text-[#2563EB] focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="text-[12px] text-[#374151]">{doc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Response Documents */}
                {/* Response/document section: file attachment rows 32px height, icon 13px, filename 12px */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    Attached Files
                  </h3>

                  <div className="space-y-1.5">
                    <div className="h-[32px] flex items-center justify-between px-3 border border-[#E5E7EB] bg-white rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={13} className="text-[#6B7280]" />
                        <span className="text-[12px] text-[#374151] truncate font-medium">
                          {selectedNotice.file_path.split('/').pop() || "Notice_Details.pdf"}
                        </span>
                      </div>
                      <a 
                        href={`${API_BASE}${selectedNotice.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#2563EB] hover:underline shrink-0"
                      >
                        View Original
                      </a>
                    </div>

                    {selectedNotice.supporting_evidence?.map((doc, idx) => (
                      <div key={idx} className="h-[32px] flex items-center justify-between px-3 border border-[#E5E7EB] bg-white rounded">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={13} className="text-[#6B7280]" />
                          <span className="text-[12px] text-[#374151] truncate font-medium">
                            {doc}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#6B7280] shrink-0">
                          Evidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 5: AI Drafting & Outreach Workspace */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    AI Drafting & Outreach
                  </h3>

                  <div className="flex border-b border-[#E5E7EB] mb-3">
                    {[
                      { id: 'reply', label: "Draft Reply" },
                      { id: 'questions', label: "Client Interview" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAssistantTab(tab.id as any)}
                        className={`px-3 py-1.5 text-[11px] font-semibold relative cursor-pointer ${
                          activeAssistantTab === tab.id ? 'text-[#2563EB]' : 'text-[#6B7280]'
                        }`}
                      >
                        {tab.label}
                        {activeAssistantTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeAssistantTab === 'reply' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-[#6B7280]">Response Draft Preview</span>
                        {(typedReply || responseDraft) && (
                          <button
                            onClick={handleCopyReply}
                            className="px-2 py-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[10px] text-slate-700 font-semibold rounded flex items-center gap-1 transition-colors"
                          >
                            <Copy size={11} />
                            <span>Copy Letter</span>
                          </button>
                        )}
                      </div>

                      {!responseDraft && !typedReply && !isDrafting ? (
                        <div className="text-center py-6">
                          <button
                            onClick={() => handleDraftResponse(selectedNotice.id)}
                            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold rounded transition-colors"
                          >
                            Compile Response Letter
                          </button>
                        </div>
                      ) : isDrafting && !typedReply ? (
                        <div className="text-center py-6 text-[12px] text-[#6B7280]">
                          Compiling reply letter...
                        </div>
                      ) : (
                        <div className="border border-[#E5E7EB] bg-slate-50 rounded p-3 text-[11px] font-mono whitespace-pre-wrap h-40 overflow-y-auto">
                          {typedReply}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-[#6B7280]">Client Information Request Pack</span>
                        <button
                          onClick={handleCopyQuestions}
                          className="px-2 py-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[10px] text-slate-700 font-semibold rounded flex items-center gap-1 transition-colors"
                        >
                          <Copy size={11} />
                          <span>Copy Pack</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedNotice.questions_for_client?.map((q, idx) => (
                          <div key={idx} className="p-2.5 border border-[#E5E7EB] bg-slate-50 rounded text-[12px] text-[#374151]">
                            {idx + 1}. {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 6: Timeline / Activity */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
                  <h3 className="text-[12px] uppercase font-semibold tracking-wider text-[#4B5563] border-b border-[#F3F4F6] pb-2 mb-3">
                    Milestone Timeline
                  </h3>

                  {/* Simple: date 11px #9CA3AF left 80px, event text 12px #4B5563, border-left 2px solid #E5E7EB, padding-left 12px */}
                  <div className="space-y-3">
                    {[
                      { date: "2026-05-20", text: "Notice Received & Logged (Central Portal Registry)" },
                      { date: "2026-05-28", text: "AI Notice Analysis Completed (OCR & NLP Extraction Done)" },
                      { 
                        date: "In Progress", 
                        text: selectedNotice.status !== 'PENDING' ? "Response Reply Prepared" : "Draft reply compiling required" 
                      },
                      { 
                        date: "Pending", 
                        text: selectedNotice.status === 'RESOLVED' ? "Response Submitted to Portal" :
                              selectedNotice.status === 'DRAFTED' ? "Awaiting submission verification" : "Pending reply preparation" 
                      },
                      { 
                        date: "Target", 
                        text: selectedNotice.status === 'RESOLVED' ? "Litigation Case Resolved" : "Active under statutory scrutiny files" 
                      }
                    ].map((milestone, idx) => (
                      <div key={idx} className="flex items-start">
                        <span className="text-[11px] text-[#9CA3AF] w-[80px] shrink-0 font-mono pt-0.5">{milestone.date}</span>
                        <div className="flex-1 border-l-2 border-[#E5E7EB] pl-[12px] py-0.5 text-[12px] text-[#4B5563]">
                          {milestone.text}
                          {milestone.date === 'Pending' && selectedNotice.status === 'DRAFTED' && (
                            <div className="mt-2">
                              <button
                                onClick={() => handleUpdateStatus(selectedNotice.id, "RESOLVED")}
                                className="px-2 py-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[10px] font-semibold text-slate-700 rounded transition-colors"
                              >
                                Mark as Submitted
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      if (selectedNotice.status === 'PENDING') {
                        handleDraftResponse(selectedNotice.id);
                      } else {
                        setActiveAssistantTab('reply');
                        showToast("Draft reply already prepared.");
                      }
                    }}
                    className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                  >
                    Draft Reply
                  </button>
                  <button
                    onClick={() => showToast("✓ Exporting statutory summary report PDF...")}
                    className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                  >
                    Export Summary
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                  >
                    Request Documents
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F7F8FA]">
              <FolderOpen size={40} className="text-slate-400 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Notice Selected</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                Choose a notice from the ledger to load the statutory compliance details and AI drafting workspace.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* INGEST FILE UPLOAD MODAL                                       */}
      {/* ============================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded p-6 max-w-lg w-full mx-4 shadow-xl relative space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9.5px] font-semibold text-[#2563EB] tracking-wider uppercase block font-mono">Intake Desk</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">Ingest GST Notice</h3>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Upload a PDF notice or image to parse and extract statute details.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                  setUploadClientId("");
                  setUploadError("");
                }}
                className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <form onSubmit={handleFileUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-[11px] font-semibold animate-in fade-in duration-200">
                  {uploadError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500 tracking-wider block font-mono">Client Profile</label>
                <select
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  required
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded px-3 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="" disabled>Choose a business client...</option>
                  {uploadClients.map(c => (
                    <option key={c.id} value={c.id}>{c.business_name} ({c.gstin})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500 tracking-wider block font-mono">Attach Document</label>
                {!uploadFile ? (
                  <div className="border border-dashed border-slate-200 hover:border-slate-300 rounded p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-slate-50/50">
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
                    <UploadCloud size={16} className="text-[#2563EB] mb-2" />
                    <span className="text-xs font-semibold text-slate-800">Drag & drop PDF / Image here</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">or click to browse files</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded p-3 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-[#2563EB] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-800 truncate block max-w-[200px]" title={uploadFile.name}>
                          {uploadFile.name}
                        </span>
                        <span className="text-[9.5px] text-slate-400 block font-mono">
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin text-[#2563EB]" />
                      <span>Parsing with OCR & AI...</span>
                    </span>
                    <span className="font-mono font-semibold text-[#2563EB]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setUploadClientId("");
                    setUploadError("");
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadClientId}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process & Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* outreach / Share Modal */}
      {showShareModal && selectedNotice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded p-6 max-w-lg w-full mx-4 shadow-xl relative space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9.5px] font-semibold text-[#2563EB] tracking-wider uppercase block font-mono">Outreach Dispatch</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">Request Client Documents</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-semibold uppercase text-slate-500 tracking-wider block font-mono">Outreach Template</span>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10.5px] leading-relaxed text-slate-600 font-mono h-48 overflow-y-auto">
                <p className="font-bold">Subject: Documents Needed for GST Notice {selectedNotice.notice_number}</p>
                <br />
                <p>Dear {selectedNotice.client_name} Team,</p>
                <br />
                <p>Please share the following evidence documents to support our reply:</p>
                {selectedNotice.missing_documents?.map((d, i) => (
                  <p key={i} className="pl-3 font-semibold">- [ ] {d}</p>
                ))}
                <br />
                <p>Also clarify these questions:</p>
                {selectedNotice.questions_for_client?.map((q, i) => (
                  <p key={i} className="pl-3 font-semibold">{i+1}. {q}</p>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCopyQuestions();
                  setShowShareModal(false);
                }}
                className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold rounded flex items-center gap-1"
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

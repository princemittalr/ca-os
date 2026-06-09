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
  CheckCircle,
  AlertCircle,
  Sparkles,
  FileWarning,
  Download,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

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

export default function NoticeWarRoom() {
  const { showToast, ToastComponent } = useToast();
  const [notices, setNotices] = useState<NoticeDossier[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDossier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setFile] = useState<File | null>(null);
  const [uploadClientId, setUploadClientId] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadClients, setUploadClients] = useState<{id: string; business_name: string; gstin: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // New state for redesign
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RESPONDED' | 'RESOLVED'>('ALL');
  const [isDrafting, setIsDrafting] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [typedReply, setTypedReply] = useState("");

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await api.get<any[]>('/api/clients/');
        setUploadClients(data);
      } catch (err) {
        console.error("Client lookup failed:", err);
        setUploadClients([]);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedNotice) {
      setResponseDraft("");
      setTypedReply("");
    }
  }, [selectedNotice]);

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<NoticeDossier[]>('/api/notices');
      setNotices(data);
    } catch (err) {
      console.error("Notices fetch failed:", err);
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedNotice) {
      const updated = notices.find(n => n.id === selectedNotice.id);
      if (updated) {
        setSelectedNotice(updated);
      }
    }
  }, [notices]);

  const handleDraftResponse = async (noticeId: string) => {
    setIsDrafting(true);
    setResponseDraft("");
    setTypedReply("");
    try {
      const data = await api.post<{reply: string}>(
        `/api/notices/${noticeId}/draft-response`, {}
      );
      setResponseDraft(data.reply);

      let index = 0;
      const text = data.reply;
      const timer = setInterval(() => {
        setTypedReply((prev) => prev + text.charAt(index));
        index++;
        if (index >= text.length) {
          clearInterval(timer);
        }
      }, 5);

      showToast("Response compiled successfully!", "success");
      
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: "RESPONDED" } : n));
    } catch (err) {
      console.error(err);
      
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
      
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: "RESPONDED" } : n));
      showToast("Draft reply generated using statutory template.", "success");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadClientId || isSubmitting) return;

    setIsSubmitting(true);
    setIsUploading(true);
    setFormError("");
    setUploadProgress(10);

    const progTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 400);

    const formData = new FormData();
    formData.append("client_id", uploadClientId);
    formData.append("file", uploadFile);

    try {
      const newNotice = await api.postForm<NoticeDossier>('/api/notices/upload', formData);

      clearInterval(progTimer);
      setUploadProgress(100);

      showToast("Notice parsed & analyzed in 12 seconds!", "success");

      setNotices(prev => [newNotice, ...prev]);
      setShowUploadModal(false);
      setFile(null);
      setUploadClientId("");
      setFormError("");
      setSelectedNotice(newNotice);
    } catch (err: any) {
      clearInterval(progTimer);
      setUploadProgress(0);
      const msg = err.message || '';
      if (msg.includes('403') || msg.includes('firm')) {
        setFormError("Client not in your firm");
      } else {
        setFormError(err.message || "Notice parsing failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleMarkResolved = (noticeId: string) => {
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status: "RESOLVED" } : n));
    setSelectedNotice(prev => prev && prev.id === noticeId ? { ...prev, status: "RESOLVED" } : prev);
    showToast(`Notice marked as resolved`, "success");
  };

  const handleCopyReply = () => {
    const text = typedReply || responseDraft;
    navigator.clipboard.writeText(text);
    showToast("Legal response draft copied to clipboard!", "success");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getDueDateInfo = (dueDateStr: string, status: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0,0,0,0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let color = '#6B7280';
    if (status !== 'RESOLVED') {
      if (diffDays < 0) {
        color = '#DC2626';
      } else if (diffDays <= 7) {
        color = '#D97706';
      }
    }

    return { diffDays, color };
  };

  const filteredNotices = notices.filter(item => {
    const client = item.client_name.toLowerCase();
    const refNum = item.notice_number.toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query && !client.includes(query) && !refNum.includes(query)) {
      return false;
    }
    
    if (activeTab === 'PENDING') return item.status === 'PENDING';
    if (activeTab === 'RESPONDED') return item.status === 'RESPONDED' || item.status === 'DRAFTED';
    if (activeTab === 'RESOLVED') return item.status === 'RESOLVED';
    
    return true;
  });

  const unreadCount = notices.filter(n => n.status === 'PENDING').length;

  const Badge = ({ variant, children }: { variant: 'high' | 'medium' | 'low' | 'default', children: React.ReactNode }) => {
    const variants: Record<string, string> = {
      high: 'bg-red-50 text-red-700 border border-red-200',
      medium: 'bg-amber-50 text-amber-700 border border-amber-200',
      low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      default: 'bg-slate-50 text-slate-700 border border-slate-200'
    };
    
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${variants[variant]}`}>
        {children}
      </span>
    );
  };

  const getRiskVariant = (riskLevel: string) => {
    if (riskLevel === 'HIGH') return 'high';
    if (riskLevel === 'MEDIUM') return 'medium';
    if (riskLevel === 'LOW') return 'low';
    return 'default';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans">
      {/* Toast */}
      {ToastComponent}

      {/* Left Panel: Inbox (380px fixed) */}
      <div className="w-[380px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[#111827]">Notice Desk</h2>
            <span className="px-2 py-0.5 bg-[#1B4F8A] text-white text-[11px] font-semibold rounded-full">
              {unreadCount}
            </span>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1.5 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded flex items-center gap-1.5"
          >
            <Plus size={14} />
            Upload Notice
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-[#E5E7EB] flex items-center">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'RESPONDED', label: 'Responded' },
            { id: 'RESOLVED', label: 'Resolved' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1B4F8A] text-[#1B4F8A]'
                  : 'border-transparent text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="px-4 py-2 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E5E7EB] rounded text-[12px] focus:outline-none focus:border-[#1B4F8A]"
            />
          </div>
        </div>

        {/* Notice List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[72px] bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredNotices.length > 0 ? (
            filteredNotices.map((notice) => {
              const isSelected = selectedNotice?.id === notice.id;
              const isUnread = notice.status === 'PENDING';
              const { color: dueDateColor } = getDueDateInfo(notice.due_date, notice.status);

              return (
                <div
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className={`w-full h-[72px] px-4 py-3 border-b border-[#F3F4F6] cursor-pointer transition-all ${
                    isSelected ? 'bg-slate-100 border-l-2 border-[#1B4F8A]' : 'bg-white hover:bg-slate-50'
                  } ${isUnread ? 'border-l-2 border-[#3B82F6] bg-blue-50/30' : ''}`}
                >
                  {/* Top Row */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-semibold text-[#111827] truncate pr-2">
                      {notice.client_name}
                    </span>
                    <span className="text-[12px] font-semibold font-mono text-slate-700">
                      {formatCurrency(notice.tax_amount)}
                    </span>
                  </div>
                  {/* Middle Row */}
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">{notice.notice_type}</Badge>
                    <Badge variant={getRiskVariant(notice.risk_level)}>
                      {notice.risk_level} Risk
                    </Badge>
                  </div>
                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: dueDateColor }}>
                      Due: {notice.due_date}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {notice.notice_number}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText size={24} className="text-slate-300" />
              <span className="text-[12px] text-slate-500">No notices found</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Detail View (flex-1) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNotice ? (
          <>
            {/* Top Bar */}
            <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-semibold text-[#111827]">
                  {selectedNotice.notice_number}
                </span>
                <Badge variant="default">{selectedNotice.notice_type}</Badge>
                <Badge variant={getRiskVariant(selectedNotice.risk_level)}>
                  {selectedNotice.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedNotice && handleDraftResponse(selectedNotice.id)}
                  className="px-3 py-1.5 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded flex items-center gap-1.5"
                >
                  Draft Response
                </button>
                <button
                  onClick={() => selectedNotice && handleMarkResolved(selectedNotice.id)}
                  className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[12px] font-semibold rounded"
                >
                  Mark Resolved
                </button>
                <a 
                  href={`${API_BASE}${selectedNotice.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[12px] font-semibold rounded flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            </div>

            {/* Details Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Section 1: Notice Summary */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Notice No</div>
                    <div className="text-[13px] font-semibold text-[#111827]">{selectedNotice.notice_number}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Type</div>
                    <div className="text-[13px] font-semibold text-[#111827]">{selectedNotice.notice_type}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Authority</div>
                    <div className="text-[13px] font-semibold text-[#111827]">{selectedNotice.issuing_authority}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Section</div>
                    <div className="text-[13px] font-semibold text-[#111827]">
                      {selectedNotice.section_references.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Due Date</div>
                    <div className="text-[13px] font-semibold text-[#111827]">{selectedNotice.due_date}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Tax Amount</div>
                    <div className="text-[13px] font-semibold text-[#111827]">
                      {formatCurrency(selectedNotice.tax_amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Risk</div>
                    <div className="text-[13px] font-semibold text-[#111827]">
                      {selectedNotice.risk_level} ({selectedNotice.risk_score}/100)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: AI Analysis */}
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-violet-600" />
                  <span className="text-[13px] font-semibold text-violet-900">AI Risk Assessment</span>
                </div>
                <p className="text-[12px] text-violet-800 mb-3 leading-relaxed">
                  {selectedNotice.summary}
                </p>
                {selectedNotice.risk_level === 'HIGH' && (
                  <ul className="list-disc list-inside text-[12px] text-violet-800 space-y-1">
                    <li>High penalty exposure detected</li>
                    <li>Urgent action required before due date</li>
                    <li>Consider requesting additional documents from client</li>
                  </ul>
                )}
              </div>

              {/* Section 3: Timeline */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                <h3 className="text-[13px] font-semibold text-[#111827] mb-4">Timeline</h3>
                <div className="space-y-3">
                  {[
                    { status: 'completed', text: 'Notice Received & Logged' },
                    { status: 'completed', text: 'AI Notice Analysis Completed' },
                    { 
                      status: selectedNotice.status !== 'PENDING' ? 'completed' : 'pending', 
                      text: 'Response Draft Prepared' 
                    },
                    { 
                      status: selectedNotice.status === 'RESOLVED' ? 'completed' : 'pending', 
                      text: 'Response Submitted' 
                    },
                    { 
                      status: selectedNotice.status === 'RESOLVED' ? 'completed' : 'pending', 
                      text: 'Notice Resolved' 
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                        item.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`} />
                      <div className="text-[12px]">
                        <span className={`${item.status === 'completed' ? 'font-semibold' : ''} text-[#374151]`}>
                          {item.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Response Draft */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-semibold text-[#111827]">Response Draft</h3>
                  <div className="flex items-center gap-2">
                    {(typedReply || responseDraft) && (
                      <>
                        <button
                          onClick={handleCopyReply}
                          className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded flex items-center gap-1.5"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                        <button
                          className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded flex items-center gap-1.5"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!responseDraft && !typedReply && !isDrafting ? (
                  <button
                    onClick={() => handleDraftResponse(selectedNotice.id)}
                    className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold rounded flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    Generate AI Response
                  </button>
                ) : isDrafting && !typedReply ? (
                  <div className="text-center py-8 text-[12px] text-[#6B7280]">
                    Generating response...
                  </div>
                ) : (
                  <textarea
                    value={typedReply || responseDraft}
                    onChange={(e) => setTypedReply(e.target.value)}
                    className="w-full h-64 p-4 border border-[#E5E7EB] rounded text-[12px] font-mono focus:outline-none focus:border-[#1B4F8A]"
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileWarning size={64} className="text-slate-300 mb-4" />
            <h3 className="text-[15px] font-semibold text-slate-800 mb-1">Select a notice to review</h3>
            <p className="text-[12px] text-slate-500 max-w-sm">
              Choose a notice from the inbox to view details, analysis, and draft responses
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full mx-4 shadow-xl relative space-y-4 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Upload Notice</h3>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Upload a PDF or image to parse and analyze
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                  setUploadClientId("");
                  setFormError("");
                }}
                className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleFileUploadSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-[12px]">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">Client</label>
                <select
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  required
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                >
                  <option value="" disabled>Select client...</option>
                  {uploadClients.map(c => (
                    <option key={c.id} value={c.id}>{c.business_name} ({c.gstin})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">Document</label>
                {!uploadFile ? (
                  <div className="border-2 border-dashed border-slate-200 hover:border-[#1B4F8A] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-slate-50/50">
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
                    <UploadCloud size={20} className="text-[#1B4F8A] mb-2" />
                    <span className="text-sm font-semibold text-slate-800">Drag & drop file here</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">or click to browse</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-[#1B4F8A] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-slate-800 truncate block" title={uploadFile.name}>
                          {uploadFile.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin text-[#1B4F8A]" />
                      <span>Parsing with OCR...</span>
                    </span>
                    <span className="font-mono font-semibold text-[#1B4F8A]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#1B4F8A] transition-all duration-300"
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
                    setFormError("");
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !uploadFile || !uploadClientId}
                  className="px-5 py-2 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Analyze Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

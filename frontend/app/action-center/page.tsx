"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Inbox,
  ShieldAlert,
  Clock,
  FileText,
  Gem,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertTriangle,
  User,
  Users,
  Anchor,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { getUnifiedBadgeClass } from '@/lib/badgeHelper';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


interface ActionItem {
  action_id: string;
  client_id: string;
  client_name: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  recommended_action: string;
  deadline: string;
  risk_score: number;
  status: string;
  confidence_score: number;
  ai_summary: string;
  predicted_impact: string;
}

interface ActionSummary {
  total_actions: number;
  high_priority_count: number;
  pending_itc_exposure: number;
  daily_summary: string;
}

export default function SmartActionCenter() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<ActionSummary>({
    total_actions: 0,
    high_priority_count: 0,
    pending_itc_exposure: 0,
    daily_summary: "Gathering copilot signals from client portfolios..."
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('PRIORITY');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchActionCenter = async () => {
    try {
      setIsLoading(true);
      
      let listData: ActionItem[] = [];
      let summaryData: ActionSummary = {
        total_actions: 0,
        high_priority_count: 0,
        pending_itc_exposure: 0,
        daily_summary: ""
      };

      try {
        const listRes = await fetch(`${API_BASE}/api/action-center`);
        if (!listRes.ok) throw new Error("Failed to load actions");
        listData = await listRes.json();
        
        const summaryRes = await fetch(`${API_BASE}/api/action-center/summary`);
        if (!summaryRes.ok) throw new Error("Failed to load summary");
        summaryData = await summaryRes.json();
      } catch (err) {
        console.error("Backend offline:", err);
        setActions([]);
        setSummary({ total_actions: 0, high_priority_count: 0, pending_itc_exposure: 0, daily_summary: "Backend unavailable. Please ensure the API server is running." });
        setIsLoading(false);
        return;
      }
      
      setActions(listData);
      
      // Fetch dynamic narrative briefing from AI Copilot layer
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No auth token");
        const aiBriefingRes = await fetch(`${API_BASE}/api/ai/daily-briefing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(listData)
        });
        if (aiBriefingRes.ok) {
          const aiBriefingData = await aiBriefingRes.json();
          if (aiBriefingData.briefing) {
            summaryData.daily_summary = aiBriefingData.briefing;
          }
        }
      } catch (aiErr) {
        console.error("AI dynamic briefing generation failed:", aiErr);
      }
      
      setSummary(summaryData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActionCenter();
  }, []);

  const handleResolveAction = async (actionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-center/${actionId}/resolve`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to resolve action item");
      showToast("✓ Action resolved and removed from daily task feed!");
      await fetchActionCenter();
    } catch (err) {
      console.error("Resolve failed:", err);
      showToast("⚠ Failed to resolve action. Check API connection.");
    }
  };

  const handleAssignStaff = async (actionId: string, staff: string) => {
    try {
      showToast(`✓ Staff member ${staff} assigned to execute this action.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateOutreach = (action: ActionItem) => {
    const emailBody = `Dear Operations Team at ${action.client_name},\n\n` +
      `This is an AI Copilot outreach reminder regarding action item: ${action.title}.\n\n` +
      `Description: ${action.description}\n` +
      `Recommended Compliance Steps: ${action.recommended_action}\n` +
      `Target Deadline: ${action.deadline}\n\n` +
      `We request you to coordinate with our auditing firm immediately to resolve this matter.\n\n` +
      `Regards,\nReckon CA Partner`;
      
    navigator.clipboard.writeText(emailBody);
    showToast(`✓ Copilot outreach warning compiled & copied to clipboard!`);
  };

  // Categorization filter helpers for organization folders
  const isGstRisk = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    
    // Explicitly exclude BOE items from GST risks to keep folders clean
    if (isBoeIssue(item)) return false;
    
    return c === 'reconciliation' || c === 'vendor' || t.includes('gstr') || t.includes('gst') || t.includes('itc') || d.includes('gstr') || d.includes('gst') || d.includes('itc');
  };

  const isBoeIssue = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'import' || t.includes('boe') || t.includes('bill of entry') || t.includes('icegate') || t.includes('import') || d.includes('boe') || d.includes('bill of entry') || d.includes('icegate') || d.includes('import');
  };

  const isComplianceDeadline = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'compliance' || t.includes('deadline') || t.includes('filing') || t.includes('due') || t.includes('tds') || d.includes('filing') || d.includes('overdue');
  };

  const isNotice = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'risk' || t.includes('notice') || t.includes('roc') || t.includes('mca') || t.includes('order') || d.includes('notice') || d.includes('mca');
  };

  const isHighPriorityClient = (item: ActionItem) => {
    return item.priority === 'HIGH' || item.risk_score >= 85;
  };

  // Folders dynamic lists & sizes
  const folderCounts = {
    PRIORITY: actions.filter(a => a.priority === 'HIGH').length,
    GST_RISKS: actions.filter(isGstRisk).length,
    BOE_ISSUES: actions.filter(isBoeIssue).length,
    COMPLIANCE_DEADLINES: actions.filter(isComplianceDeadline).length,
    NOTICES: actions.filter(isNotice).length,
    HIGH_PRIORITY_CLIENTS: actions.filter(isHighPriorityClient).length,
    ALL: actions.length
  };

  // Final filtered list for the current folder view
  const filteredActions = actions.filter(action => {
    // 1. Search Query Match
    const client = action.client_name.toLowerCase();
    const title = action.title.toLowerCase();
    const desc = action.description.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    if (query && !client.includes(query) && !title.includes(query) && !desc.includes(query)) {
      return false;
    }

    // 2. Folder Navigation Match
    if (selectedFolder === 'PRIORITY') return action.priority === 'HIGH';
    if (selectedFolder === 'GST_RISKS') return isGstRisk(action);
    if (selectedFolder === 'BOE_ISSUES') return isBoeIssue(action);
    if (selectedFolder === 'COMPLIANCE_DEADLINES') return isComplianceDeadline(action);
    if (selectedFolder === 'NOTICES') return isNotice(action);
    if (selectedFolder === 'HIGH_PRIORITY_CLIENTS') return isHighPriorityClient(action);
    
    return true; // 'ALL'
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 relative font-sans text-slate-800">
      
      {/* Toast Notification Notification */}
      {toastMessage && (
        <div 
          className="fixed bottom-8 right-8 bg-white border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3"
          style={{ borderLeft: '4px solid #4F46E5' }}
        >
          <CheckCircle2 className="text-[#4F46E5] flex-shrink-0" size={18} />
          <span className="text-[12px] font-bold leading-normal">{toastMessage}</span>
        </div>
      )}

      <PageHeader
        sectionLabel="OPERATIONS CENTER"
        title="Workflow Hub"
        description="Real-time critical inbox, statutory tracking, and supplier resolution desk"
        actions={
          <button 
            onClick={() => {
              fetchActionCenter();
              showToast("✓ AI Copilot successfully re-synchronized operational streams.");
            }}
            className="btn btn-secondary btn-md"
          >
            <RefreshCw size={13} className="text-[#4F46E5]" />
            <span>Sync Latest Alerts</span>
          </button>
        }
      />

      {/* Narrative AI Copilot Glass Card */}
      <div 
        className="std-card w-full"
        style={{
          borderLeft: '4px solid var(--color-primary-light)',
          backgroundColor: '#FAFAFA'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#4F46E5]/20">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#7C3AED] tracking-widest uppercase">CO-PILOT DAILY BRIEFING</span>
              <span className="status-badge status-badge-success">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-badge-dot"></span>
                ACTIVE MONITOR
              </span>
            </div>
            <p className="text-[14px] text-[var(--color-text-primary)] leading-[1.6] font-medium">
              {summary.daily_summary}
            </p>
            <div className="pt-2 flex flex-col md:flex-row md:items-center gap-2 border-t border-slate-100 mt-2">
              <span className="text-[12px] uppercase font-semibold text-[var(--color-primary-light)] shrink-0">
                ⚡ TODAY'S PRIORITY:
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                {actions.length > 0 ? `Focus on top ${Math.min(3, actions.length)} high-priority items to protect ITC.` : "No critical actions detected today."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="h-[100px] bg-slate-50 border border-slate-100 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Active Signals */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-warning)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-text-primary)] leading-none">
                {summary.total_actions}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Active Signals
              </span>
            </div>
            <Zap size={20} className="text-[var(--color-warning)]" />
          </div>

          {/* Card 2: High Severity */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-error)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-error)] leading-none">
                {summary.high_priority_count}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Critical Highs
              </span>
            </div>
            <AlertCircle size={20} className="text-[var(--color-error)]" />
          </div>

          {/* Card 3: Capital Exposure */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-info)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-info)] leading-none">
                {formatCurrency(summary.pending_itc_exposure)}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Capital Exposure
              </span>
            </div>
            <TrendingUp size={20} className="text-[var(--color-info)]" />
          </div>

        </div>
      )}

      {/* Two Column Workspace Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
        
        {/* Left Side: Smart Folders Navigation */}
        <div className="sticky top-5" style={{ width: '220px' }}>
          <div className="space-y-2">
            
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2 px-3 font-semibold">
              INBOX FOLDERS
            </div>

            {/* Folder 0: Priority Inbox */}
            <button
              onClick={() => setSelectedFolder('PRIORITY')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'PRIORITY' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox size={14} className={selectedFolder === 'PRIORITY' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Priority Inbox</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'PRIORITY' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.PRIORITY}
              </span>
            </button>

            {/* Folder 1: GST Risks */}
            <button
              onClick={() => setSelectedFolder('GST_RISKS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'GST_RISKS' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={14} className={selectedFolder === 'GST_RISKS' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>GST Risks</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'GST_RISKS' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.GST_RISKS}
              </span>
            </button>

            {/* Folder 2: BOE Issues */}
            <button
              onClick={() => setSelectedFolder('BOE_ISSUES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'BOE_ISSUES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Anchor size={14} className={selectedFolder === 'BOE_ISSUES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>BOE Issues</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'BOE_ISSUES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.BOE_ISSUES}
              </span>
            </button>

            {/* Folder 3: Compliance Deadlines */}
            <button
              onClick={() => setSelectedFolder('COMPLIANCE_DEADLINES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'COMPLIANCE_DEADLINES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock size={14} className={selectedFolder === 'COMPLIANCE_DEADLINES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Compliance Deadlines</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'COMPLIANCE_DEADLINES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.COMPLIANCE_DEADLINES}
              </span>
            </button>

            {/* Folder 4: Notices */}
            <button
              onClick={() => setSelectedFolder('NOTICES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'NOTICES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={14} className={selectedFolder === 'NOTICES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Notices</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'NOTICES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.NOTICES}
              </span>
            </button>

            {/* Folder 5: High Priority Clients */}
            <button
              onClick={() => setSelectedFolder('HIGH_PRIORITY_CLIENTS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'HIGH_PRIORITY_CLIENTS' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gem size={14} className={selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>High Priority Clients</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.HIGH_PRIORITY_CLIENTS}
              </span>
            </button>

            <div className="my-2 border-t border-slate-200" />

            {/* Folder: ALL */}
            <button
              onClick={() => setSelectedFolder('ALL')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'ALL' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={14} className={selectedFolder === 'ALL' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>All Alerts</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'ALL' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.ALL}
              </span>
            </button>

          </div>
        </div>

        {/* Right Side: Priority Feed Panel */}
        <div className="space-y-5">
          
          {/* Search bar and Folder Label */}
          <div className="std-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase block font-mono">
                {selectedFolder.replace(/_/g, ' ')} FEED
              </h2>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                {filteredActions.length} signal{filteredActions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            {/* Search Input Container */}
            <div className="relative shrink-0 max-w-xs w-full">
              <Search size={13} className="absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search alerts or clients..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-[#6B7280] focus:outline-none focus:border-[#4F46E5]/40 font-sans"
              />
            </div>
          </div>

          {/* Action Cards Queue Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-50 border border-slate-100 rounded-[24px] animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="data-table-shell">
              <div className="overflow-x-auto hidden-scrollbar">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Client Portfolio</th>
                      <th>Action Required</th>
                      <th className="num-col">Exposure</th>
                      <th>Deadline</th>
                      <th>Staff</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActions.length > 0 ? (
                      filteredActions.map((act) => {
                        const matches = act.description.match(/₹([0-9.,L]+)/);
                        const exposureString = matches ? matches[0] : null;

                        return (
                          <tr key={act.action_id}>
                            <td>
                              <span className={`status-badge ${getUnifiedBadgeClass(act.priority === 'HIGH' ? 'ERROR' : act.priority === 'MEDIUM' ? 'WARNING' : 'NEUTRAL')}`}>
                                {act.priority}
                              </span>
                            </td>
                            <td>
                              <div className="font-semibold text-slate-900">{act.client_name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Risk: {act.risk_score.toFixed(0)}%</div>
                            </td>
                            <td>
                              <div className="font-semibold text-slate-800 line-clamp-1">{act.title}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.description}</div>
                            </td>
                            <td className="num-col">
                              {exposureString || "Material"}
                            </td>
                            <td className="font-mono text-[12px]">
                              {act.deadline}
                            </td>
                            <td>
                              <select 
                                onChange={(e) => handleAssignStaff(act.action_id, e.target.value)}
                                className="bg-transparent border-none text-[12px] text-slate-600 focus:outline-none cursor-pointer font-medium"
                                defaultValue="Aditya Rao"
                                aria-label={`Assign ${act.client_name}`}
                              >
                                <option value="Aditya Rao">Aditya Rao</option>
                                <option value="Neha Sharma">Neha Sharma</option>
                                <option value="Rohan Mehta">Rohan Mehta</option>
                                <option value="Kunal Sen">Kunal Sen</option>
                              </select>
                            </td>
                            <td className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {act.category === 'VENDOR' && (
                                  <button 
                                    onClick={() => handleGenerateOutreach(act)}
                                    className="action-btn"
                                    title="Outreach"
                                  >
                                    <Copy />
                                  </button>
                                )}
                                <Link href={act.category === 'RECONCILIATION' ? `/gst-recon?client=${act.client_id}` : `/clients/${act.client_id}`} title="Open Workspace">
                                  <button className="action-btn">
                                    <ExternalLink />
                                  </button>
                                </Link>
                                <button 
                                  onClick={() => handleResolveAction(act.action_id)}
                                  className="action-btn"
                                  title="Resolve"
                                >
                                  <Check />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Inbox size={20} className="text-[#D1D5DB]" />
                            <span className="text-[13px] text-[#6B7280]">No records found</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
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
import { api } from '@/lib/api';

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
  exposure_amount?: number;
  assigned_to?: string;
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

  // Status and filter chip states
  const [resolvedActions, setResolvedActions] = useState<ActionItem[]>([]);
  const [statusTab, setStatusTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);

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
        listData = await api.get<ActionItem[]>('/api/action-center');
        summaryData = await api.get<ActionSummary>('/api/action-center/summary');
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
        const aiBriefingData = await api.post<{briefing: string}>(
          '/api/ai/daily-briefing',
          listData
        );
        if (aiBriefingData.briefing) {
          summaryData.daily_summary = aiBriefingData.briefing;
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

    const fetchStaff = async () => {
      try {
        const data = await api.get<string[]>('/api/staff');
        setStaffMembers(data);
      } catch (err) {
        console.error("Error fetching staff:", err);
        setStaffMembers([]);
      }
    };
    fetchStaff();
  }, []);

  const handleResolveAction = async (actionId: string) => {
    try {
      const itemToResolve = actions.find(a => a.action_id === actionId);
      if (itemToResolve) {
        setResolvedActions(prev => [...prev, { ...itemToResolve, status: 'RESOLVED' }]);
      }
      await api.put(`/api/action-center/${actionId}/resolve`, {});
      showToast("✓ Action resolved!");
      await fetchActionCenter();
    } catch (err) {
      console.error("Resolve failed:", err);
      showToast("⚠ Failed to resolve action. Check API connection.");
    }
  };

  const handleAssignStaff = async (actionId: string, staff: string) => {
    try {
      // Update local state assignments to reflect in UI immediately
      setActions(prev => prev.map(a => a.action_id === actionId ? { ...a, assigned_to: staff } : a));

      await api.put(`/api/action-center/${actionId}/assign`, { assigned_to: staff });
      showToast(`✓ Staff member ${staff} assigned to execute this action.`);
    } catch (err) {
      console.error(err);
      showToast("⚠ Failed to save staff assignment. Check API connection.");
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
    PRIORITY: actions.filter(a => a.priority === 'HIGH' && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    GST_RISKS: actions.filter(a => isGstRisk(a) && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    BOE_ISSUES: actions.filter(a => isBoeIssue(a) && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    COMPLIANCE_DEADLINES: actions.filter(a => isComplianceDeadline(a) && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    NOTICES: actions.filter(a => isNotice(a) && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    HIGH_PRIORITY_CLIENTS: actions.filter(a => isHighPriorityClient(a) && !resolvedActions.some(ra => ra.action_id === a.action_id)).length,
    ALL: actions.filter(a => !resolvedActions.some(ra => ra.action_id === a.action_id)).length
  };

  // 1. Merge active actions and resolved actions
  const allAvailableActions = [
    ...actions.map(a => resolvedActions.some(ra => ra.action_id === a.action_id) ? { ...a, status: 'RESOLVED' } : { ...a, status: 'PENDING' }),
    ...resolvedActions.filter(ra => !actions.some(a => a.action_id === ra.action_id))
  ];

  // 2. Filter by selected Folder first
  const folderFiltered = allAvailableActions.filter(action => {
    if (selectedFolder === 'PRIORITY') return action.priority === 'HIGH';
    if (selectedFolder === 'GST_RISKS') return isGstRisk(action);
    if (selectedFolder === 'BOE_ISSUES') return isBoeIssue(action);
    if (selectedFolder === 'COMPLIANCE_DEADLINES') return isComplianceDeadline(action);
    if (selectedFolder === 'NOTICES') return isNotice(action);
    if (selectedFolder === 'HIGH_PRIORITY_CLIENTS') return isHighPriorityClient(action);
    return true; // 'ALL'
  });

  // 3. Filter by Status Tab, Search Query, Category Filter Chip, and Priority Filter Chip
  const filteredActions = folderFiltered.filter(action => {
    // Status Tab Match
    const isResolved = action.status === 'RESOLVED' || action.status === 'COMPLETED';
    const statusMatch = statusTab === 'PENDING' ? !isResolved : isResolved;
    if (!statusMatch) return false;

    // Search Query Match
    const client = action.client_name.toLowerCase();
    const title = action.title.toLowerCase();
    const desc = action.description.toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query && !client.includes(query) && !title.includes(query) && !desc.includes(query)) {
      return false;
    }

    // Category Filter Match
    if (selectedCategory && action.category.toUpperCase() !== selectedCategory.toUpperCase()) {
      return false;
    }

    // Priority Filter Match
    if (selectedPriority && action.priority.toUpperCase() !== selectedPriority.toUpperCase()) {
      return false;
    }

    return true;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="pb-16 relative font-sans text-slate-800 bg-[#F8FAFC] min-h-screen">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="fixed bottom-8 right-8 bg-white border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl shadow-fintech-lg z-[100] max-w-sm flex items-center gap-3"
          style={{ borderLeft: '4px solid #1B4F8A' }}
        >
          <CheckCircle2 className="text-[#1B4F8A] flex-shrink-0" size={18} />
          <span className="text-[12px] font-bold leading-normal">{toastMessage}</span>
        </div>
      )}

      {/* Header: same pattern as Dashboard (48px, white, border-bottom) */}
      <div 
        className="w-full h-12 px-6 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between -mt-6 -mx-6 mb-6"
      >
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[14px] font-semibold text-[#111827] leading-none">
            Workflow Hub
          </h1>
          <p className="text-[11px] text-[#6B7280] leading-none">
            Real-time critical inbox, statutory tracking, and supplier resolution desk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              fetchActionCenter();
              showToast("✓ AI Copilot successfully re-synchronized operational streams.");
            }}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-all px-3 py-1.5 border border-[#E5E7EB] rounded-[4px] text-[11px] text-[#6B7280] font-medium h-8"
          >
            <RefreshCw size={12} className="text-[#1B4F8A]" />
            <span>Sync Latest Alerts</span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Narrative AI Copilot Card */}
        <div 
          className="std-card w-full"
          style={{
            borderLeft: '4px solid var(--color-primary-light)',
            backgroundColor: '#FAFAFA',
            boxShadow: 'none'
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4F8A] flex items-center justify-center text-white shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#1B4F8A] tracking-wider uppercase">CO-PILOT DAILY BRIEFING</span>
                <span className="status-badge status-badge-success">
                  ACTIVE MONITOR
                </span>
              </div>
              <p className="text-[13px] text-[var(--color-text-primary)] leading-[1.6] font-medium">
                {summary.daily_summary}
              </p>
            </div>
          </div>
        </div>

        {/* Two-panel layout: left panel 280px fixed, right panel flex-1, divider 1px solid #E5E7EB */}
        <div className="flex flex-col lg:flex-row gap-0 border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
          
          {/* Left Side: Smart Folders Navigation (280px fixed) */}
          <div className="w-full lg:w-[280px] lg:shrink-0 bg-[#F9FAFB] border-r border-[#E5E7EB] p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2 px-3 font-semibold">
              INBOX FOLDERS
            </div>

            {/* Folder 0: Priority Inbox */}
            <button
              onClick={() => setSelectedFolder('PRIORITY')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'PRIORITY' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox size={14} className={selectedFolder === 'PRIORITY' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>Priority Inbox</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'PRIORITY' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.PRIORITY}
              </span>
            </button>

            {/* Folder 1: GST Risks */}
            <button
              onClick={() => setSelectedFolder('GST_RISKS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'GST_RISKS' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={14} className={selectedFolder === 'GST_RISKS' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>GST Risks</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'GST_RISKS' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.GST_RISKS}
              </span>
            </button>

            {/* Folder 2: BOE Issues */}
            <button
              onClick={() => setSelectedFolder('BOE_ISSUES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'BOE_ISSUES' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Anchor size={14} className={selectedFolder === 'BOE_ISSUES' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>BOE Issues</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'BOE_ISSUES' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.BOE_ISSUES}
              </span>
            </button>

            {/* Folder 3: Compliance Deadlines */}
            <button
              onClick={() => setSelectedFolder('COMPLIANCE_DEADLINES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'COMPLIANCE_DEADLINES' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock size={14} className={selectedFolder === 'COMPLIANCE_DEADLINES' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>Compliance Deadlines</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'COMPLIANCE_DEADLINES' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.COMPLIANCE_DEADLINES}
              </span>
            </button>

            {/* Folder 4: Notices */}
            <button
              onClick={() => setSelectedFolder('NOTICES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'NOTICES' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={14} className={selectedFolder === 'NOTICES' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>Notices</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'NOTICES' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.NOTICES}
              </span>
            </button>

            {/* Folder 5: High Priority Clients */}
            <button
              onClick={() => setSelectedFolder('HIGH_PRIORITY_CLIENTS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'HIGH_PRIORITY_CLIENTS' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gem size={14} className={selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>High Priority Clients</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.HIGH_PRIORITY_CLIENTS}
              </span>
            </button>

            <div className="my-2 border-t border-slate-200" />

            {/* Folder: ALL */}
            <button
              onClick={() => setSelectedFolder('ALL')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[4px] text-xs transition-all cursor-pointer ${
                selectedFolder === 'ALL' 
                  ? 'bg-[#EFF6FF] text-[#1B4F8A] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[#F3F4F6] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={14} className={selectedFolder === 'ALL' ? 'text-[#1B4F8A]' : 'text-slate-400'} />
                <span>All Alerts</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[2px] ${selectedFolder === 'ALL' ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]' : 'bg-slate-200/60 text-slate-600'}`}>
                {folderCounts.ALL}
              </span>
            </button>
          </div>

          {/* Right Side: Priority Feed Panel */}
          <div className="flex-1 bg-white p-6 space-y-6">
            
            {/* Status Tabs and Filter chips bar */}
            <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                
                {/* STATUS TABS */}
                <div className="flex gap-6 h-8 items-end">
                  <button
                    onClick={() => setStatusTab('PENDING')}
                    className={`text-[12px] font-medium pb-2 transition-all cursor-pointer bg-transparent border-none ${
                      statusTab === 'PENDING' 
                        ? 'border-b-2 border-solid border-[#1B4F8A] text-[#1B4F8A]' 
                        : 'text-[#6B7280] hover:text-[#111827]'
                    }`}
                    style={{ height: '32px' }}
                  >
                    Pending ({folderFiltered.filter(a => a.status === 'PENDING').length})
                  </button>
                  <button
                    onClick={() => setStatusTab('RESOLVED')}
                    className={`text-[12px] font-medium pb-2 transition-all cursor-pointer bg-transparent border-none ${
                      statusTab === 'RESOLVED' 
                        ? 'border-b-2 border-solid border-[#1B4F8A] text-[#1B4F8A]' 
                        : 'text-[#6B7280] hover:text-[#111827]'
                    }`}
                    style={{ height: '32px' }}
                  >
                    Resolved ({folderFiltered.filter(a => a.status === 'RESOLVED').length})
                  </button>
                </div>
                
                {/* Search Input Container */}
                <div className="relative shrink-0 max-w-xs w-full">
                  <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search actions..."
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-[#6B7280] focus:outline-none focus:border-[#1B4F8A] font-sans"
                  />
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#6B7280] font-medium">Category:</span>
                {['RECONCILIATION', 'NOTICE', 'COMPLIANCE', 'IMPORT', 'VENDOR'].map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(isActive ? null : cat)}
                      className={`h-[24px] border rounded-[2px] text-[11px] px-2 font-medium transition-all cursor-pointer flex items-center justify-center ${
                        isActive 
                          ? 'bg-[#EFF6FF] border-[#1B4F8A] text-[#1B4F8A]' 
                          : 'border-[#D1D5DB] text-[#6B7280] bg-white hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}

                <div className="w-px h-3 bg-slate-200 mx-2" />

                <span className="text-[11px] text-[#6B7280] font-medium">Priority:</span>
                {['HIGH', 'MEDIUM', 'LOW'].map((prio) => {
                  const isActive = selectedPriority === prio;
                  return (
                    <button
                      key={prio}
                      onClick={() => setSelectedPriority(isActive ? null : prio)}
                      className={`h-[24px] border rounded-[2px] text-[11px] px-2 font-medium transition-all cursor-pointer flex items-center justify-center ${
                        isActive 
                          ? 'bg-[#EFF6FF] border-[#1B4F8A] text-[#1B4F8A]' 
                          : 'border-[#D1D5DB] text-[#6B7280] bg-white hover:bg-slate-50'
                      }`}
                    >
                      {prio}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task/Action Cards List Feed */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#E5E7EB] rounded-[4px] p-3 animate-pulse">
                    <div className="h-3 bg-slate-100 rounded w-2/3 mb-2" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredActions.length > 0 ? (
              <div className="space-y-3">
                {filteredActions.map((act) => {
                  // Determine priority border color
                  let leftBorderColor = '#6B7280'; // Low
                  const p = act.priority.toUpperCase();
                  if (p === 'CRITICAL' || act.risk_score >= 85) {
                    leftBorderColor = '#B91C1C';
                  } else if (p === 'HIGH') {
                    leftBorderColor = '#B45309';
                  } else if (p === 'MEDIUM' || p === 'NORMAL') {
                    leftBorderColor = '#1B4F8A';
                  }

                  // Determine due date color
                  let dueDateColor = '#6B7280';
                  try {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const deadline = new Date(act.deadline);
                    deadline.setHours(0,0,0,0);
                    if (deadline.getTime() < today.getTime()) {
                      dueDateColor = '#B91C1C';
                    } else if (deadline.getTime() === today.getTime()) {
                      dueDateColor = '#B45309';
                    }
                  } catch (e) {}

                  return (
                    <div 
                      key={act.action_id}
                      className="group relative flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[4px] p-3 transition-shadow duration-150 hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      style={{ borderLeft: `3px solid ${leftBorderColor}` }}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[13px] font-medium text-[#111827]">
                          {act.title}
                        </div>
                        
                        {/* Meta: inline flex with bullet separator */}
                        <div className="inline-flex items-center flex-wrap gap-1 text-[11px] text-[#6B7280] mt-1 font-sans">
                          <span className="font-semibold text-slate-800">{act.client_name}</span>
                          <span>·</span>
                          <span className="uppercase">{act.category}</span>
                          <span>·</span>
                          <span>Risk: {act.risk_score.toFixed(0)}%</span>
                          <span>·</span>
                          {((act.exposure_amount || 0) > 0) && (
                            <>
                              <span>Exp: {formatCurrency(act.exposure_amount || 0)}</span>
                              <span>·</span>
                            </>
                          )}
                          <span style={{ color: dueDateColor }}>
                            Due: {act.deadline}
                          </span>
                        </div>

                        {act.description && (
                          <div className="text-[11px] text-[#6B7280] mt-1 line-clamp-1">
                            {act.description}
                          </div>
                        )}
                      </div>

                      {/* Right aligned staff selection & action buttons */}
                      <div className="flex items-center gap-4 shrink-0">
                        {act.status !== 'RESOLVED' && (
                          <select 
                            onChange={(e) => handleAssignStaff(act.action_id, e.target.value)}
                            className="bg-transparent border border-slate-200 rounded-[2px] px-1 py-0.5 text-[11px] text-slate-600 focus:outline-none cursor-pointer font-medium"
                            value={act.assigned_to || (staffMembers.length > 0 ? staffMembers[0] : "")}
                            aria-label={`Assign staff for ${act.title}`}
                          >
                            {staffMembers.length > 0 ? (
                              staffMembers.map(staff => (
                                <option key={staff} value={staff}>{staff}</option>
                              ))
                            ) : (
                              <option value="">No staff loaded</option>
                            )}
                          </select>
                        )}

                        {/* Action buttons visible on hover only */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {act.category === 'VENDOR' && (
                            <button 
                              onClick={() => handleGenerateOutreach(act)}
                              className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] bg-white hover:bg-slate-50 text-[#6B7280] transition-colors"
                              title="Copy Outreach warning"
                              style={{ width: '24px', height: '24px' }}
                            >
                              <Copy size={12} />
                            </button>
                          )}
                          <Link 
                            href={act.category === 'RECONCILIATION' ? `/gst-recon?client=${act.client_id}` : `/clients/${act.client_id}`} 
                            title="Open Workspace"
                          >
                            <span 
                              className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] bg-white hover:bg-slate-50 text-[#6B7280] transition-colors"
                              style={{ width: '24px', height: '24px' }}
                            >
                              <ExternalLink size={12} />
                            </span>
                          </Link>
                          {act.status !== 'RESOLVED' && (
                            <button 
                              onClick={() => handleResolveAction(act.action_id)}
                              className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] bg-white hover:bg-emerald-50 hover:border-emerald-200 text-[#6B7280] hover:text-emerald-600 transition-colors"
                              title="Resolve"
                              style={{ width: '24px', height: '24px' }}
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state: Icon 20px #D1D5DB, Text "No actions pending" 13px #6B7280 */
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Inbox size={20} className="text-[#D1D5DB]" />
                <span className="text-[13px] text-[#6B7280]">No actions pending</span>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

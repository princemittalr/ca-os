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
import { useToast } from '@/components/ui/Toast';

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

export default function OperationalMissionControl() {
  const { showToast, ToastComponent } = useToast();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<ActionSummary>({
    total_actions: 0,
    high_priority_count: 0,
    pending_itc_exposure: 0,
    daily_summary: "Gathering copilot signals from client portfolios..."
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffMembers, setStaffMembers] = useState<string[]>([]);

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
        listData = await api.get<ActionItem[]>('/api/action-center?include_resolved=true');
        summaryData = await api.get<ActionSummary>('/api/action-center/summary');
      } catch (err) {
        console.error("Backend offline:", err);
        setActions([]);
        setSummary({ total_actions: 0, high_priority_count: 0, pending_itc_exposure: 0, daily_summary: "Backend unavailable. Please ensure the API server is running." });
        setIsLoading(false);
        return;
      }

      setActions(listData);

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
    setActions(prev => prev.map(a => 
      a.action_id === actionId ? { ...a, status: 'RESOLVED' } : a
    ));

    try {
      await api.put(`/api/action-center/${actionId}/resolve`, {});
      showToast("Action resolved!", "success");
      await fetchActionCenter();
    } catch (err) {
      console.error("Resolve failed:", err);
      setActions(prev => prev.map(a => 
        a.action_id === actionId ? { ...a, status: 'PENDING' } : a
      ));
      showToast("Failed to resolve action. Check API connection.", "error");
    }
  };

  const getCategoryIcon = (category: string) => {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('compliance')) return <Clock size={16} className="text-slate-500" />;
    if (lowerCat.includes('reconciliation') || lowerCat.includes('gst')) return <ShieldAlert size={16} className="text-slate-500" />;
    if (lowerCat.includes('notice') || lowerCat.includes('risk')) return <FileText size={16} className="text-slate-500" />;
    if (lowerCat.includes('vendor')) return <Users size={16} className="text-slate-500" />;
    if (lowerCat.includes('import') || lowerCat.includes('boe')) return <Anchor size={16} className="text-slate-500" />;
    return <AlertTriangle size={16} className="text-slate-500" />;
  };

  const getPriorityColor = (priority: string, riskScore: number) => {
    const p = priority.toUpperCase();
    if (p === 'HIGH' || p === 'CRITICAL' || riskScore >= 85) return 'bg-red-600';
    if (p === 'MEDIUM' || p === 'NORMAL') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getRiskVariant = (score: number) => {
    if (score >= 85) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 30) return 'low';
    return 'default';
  };

  const categoryCounts = {
    ALL: actions.filter(a => a.status === 'PENDING').length,
    COMPLIANCE: actions.filter(a => a.status === 'PENDING' && a.category.toLowerCase().includes('compliance')).length,
    RECONCILIATION: actions.filter(a => a.status === 'PENDING' && (a.category.toLowerCase().includes('reconciliation') || a.category.toLowerCase().includes('gst'))).length,
    NOTICES: actions.filter(a => a.status === 'PENDING' && (a.category.toLowerCase().includes('notice') || a.category.toLowerCase().includes('risk'))).length,
    VENDOR: actions.filter(a => a.status === 'PENDING' && a.category.toLowerCase().includes('vendor')).length,
    RISK: actions.filter(a => a.status === 'PENDING' && a.category.toLowerCase().includes('risk')).length
  };

  const priorityCounts = {
    ALL: actions.filter(a => a.status === 'PENDING').length,
    HIGH: actions.filter(a => a.status === 'PENDING' && (a.priority.toUpperCase() === 'HIGH' || a.priority.toUpperCase() === 'CRITICAL' || a.risk_score >= 85)).length,
    MEDIUM: actions.filter(a => a.status === 'PENDING' && (a.priority.toUpperCase() === 'MEDIUM' || a.priority.toUpperCase() === 'NORMAL' || (a.risk_score >= 60 && a.risk_score < 85))).length,
    LOW: actions.filter(a => a.status === 'PENDING' && (a.priority.toUpperCase() === 'LOW' || (a.risk_score >= 30 && a.risk_score < 60))).length
  };

  const filteredActions = actions.filter(action => {
    const isResolved = action.status === 'RESOLVED' || action.status === 'COMPLETED';
    if (isResolved) return false;

    if (selectedCategory !== 'ALL') {
      const lowerCat = action.category.toLowerCase();
      if (selectedCategory === 'COMPLIANCE' && !lowerCat.includes('compliance')) return false;
      if (selectedCategory === 'RECONCILIATION' && !lowerCat.includes('reconciliation') && !lowerCat.includes('gst')) return false;
      if (selectedCategory === 'NOTICES' && !lowerCat.includes('notice') && !lowerCat.includes('risk')) return false;
      if (selectedCategory === 'VENDOR' && !lowerCat.includes('vendor')) return false;
      if (selectedCategory === 'RISK' && !lowerCat.includes('risk')) return false;
    }

    if (selectedPriority !== 'ALL') {
      const p = action.priority.toUpperCase();
      if (selectedPriority === 'HIGH' && !(p === 'HIGH' || p === 'CRITICAL' || action.risk_score >= 85)) return false;
      if (selectedPriority === 'MEDIUM' && !(p === 'MEDIUM' || p === 'NORMAL' || (action.risk_score >= 60 && action.risk_score < 85))) return false;
      if (selectedPriority === 'LOW' && !(p === 'LOW' || (action.risk_score >= 30 && action.risk_score < 60))) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return action.client_name.toLowerCase().includes(query) || 
             action.title.toLowerCase().includes(query) || 
             action.description.toLowerCase().includes(query);
    }

    return true;
  });

  const highPriorityActions = filteredActions.filter(a => 
    a.priority.toUpperCase() === 'HIGH' || a.priority.toUpperCase() === 'CRITICAL' || a.risk_score >= 85
  );
  const remainingActions = filteredActions.filter(a => 
    !(a.priority.toUpperCase() === 'HIGH' || a.priority.toUpperCase() === 'CRITICAL' || a.risk_score >= 85)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

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

  const resolvedTodayCount = actions.filter(a => {
    if (a.status !== 'RESOLVED') return false;
    const today = new Date().toISOString().split('T')[0];
    return true;
  }).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC] font-sans">
      {ToastComponent}

      {/* Header */}
      <div className="h-16 border-b border-[#E5E7EB] bg-white px-6 flex flex-col justify-center shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-[#111827]">Action Center</h1>
            <span className="px-2 py-1 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded border border-violet-100 flex items-center gap-1">
              <Sparkles size={14} />
              AI Copilot
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                fetchActionCenter();
                showToast("AI Copilot successfully re-synchronized operational streams.", "success");
              }}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-all px-3 py-1.5 border border-[#E5E7EB] rounded text-[12px] text-[#6B7280] font-medium h-8"
            >
              <RefreshCw size={14} className="text-[#1B4F8A]" />
              <span>Sync</span>
            </button>
          </div>
        </div>
        <p className="text-[13px] text-[#6B7280] mt-1">
          {summary.total_actions} critical actions require attention today
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0">
        <div className="grid grid-cols-4 gap-0 divide-x divide-[#E5E7EB]">
          <div className="px-4 py-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">Total Pending</div>
            <div className="text-[20px] font-semibold text-slate-800">{summary.total_actions}</div>
          </div>
          <div className="px-4 py-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">High Priority</div>
            <div className="text-[20px] font-semibold text-red-600">{summary.high_priority_count}</div>
          </div>
          <div className="px-4 py-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">ITC Exposure</div>
            <div className="text-[20px] font-semibold text-[#1B4F8A]">{formatCurrency(summary.pending_itc_exposure)}</div>
          </div>
          <div className="px-4 py-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">Resolved Today</div>
            <div className="text-[20px] font-semibold text-emerald-600">{resolvedTodayCount}</div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (240px fixed) */}
        <div className="w-[240px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3 px-2">
              CATEGORIES
            </div>
            <div className="space-y-1">
              {[
                { id: 'ALL', label: 'All Actions', count: categoryCounts.ALL },
                { id: 'COMPLIANCE', label: 'Compliance', count: categoryCounts.COMPLIANCE },
                { id: 'RECONCILIATION', label: 'Reconciliation', count: categoryCounts.RECONCILIATION },
                { id: 'NOTICES', label: 'Notices', count: categoryCounts.NOTICES },
                { id: 'VENDOR', label: 'Vendor', count: categoryCounts.VENDOR },
                { id: 'RISK', label: 'Risk', count: categoryCounts.RISK }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-[12px] transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#1B4F8A]/5 text-[#1B4F8A] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                    selectedCategory === cat.id
                      ? 'bg-[#1B4F8A]/10 text-[#1B4F8A]'
                      : 'text-slate-500'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Priority Tabs */}
          <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 shrink-0">
            <div className="flex items-center gap-6">
              {[
                { id: 'ALL', label: 'All', count: priorityCounts.ALL, variant: 'default' },
                { id: 'HIGH', label: 'High', count: priorityCounts.HIGH, variant: 'high' },
                { id: 'MEDIUM', label: 'Medium', count: priorityCounts.MEDIUM, variant: 'medium' },
                { id: 'LOW', label: 'Low', count: priorityCounts.LOW, variant: 'low' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedPriority(tab.id)}
                  className={`flex items-center gap-2 px-2 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
                    selectedPriority === tab.id
                      ? 'border-[#1B4F8A] text-[#1B4F8A]'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    tab.variant === 'high' ? 'bg-red-100 text-red-700' :
                    tab.variant === 'medium' ? 'bg-amber-100 text-amber-700' :
                    tab.variant === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
              <div className="flex-1" />
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search actions..."
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg pl-9 pr-3 py-2 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B4F8A]"
                />
              </div>
            </div>
          </div>

          {/* Action Feed */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[64px] bg-white border border-[#E5E7EB] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <h3 className="text-[15px] font-semibold text-slate-800">All caught up!</h3>
                <p className="text-[13px] text-slate-500">No pending actions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* High Priority Section */}
                {highPriorityActions.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Requires Immediate Attention
                    </h3>
                    <div className="space-y-2">
                      {highPriorityActions.map((action) => (
                        <ActionRow 
                          key={action.action_id}
                          action={action}
                          getCategoryIcon={getCategoryIcon}
                          getPriorityColor={getPriorityColor}
                          getRiskVariant={getRiskVariant}
                          handleResolveAction={handleResolveAction}
                          Badge={Badge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Actions */}
                {remainingActions.length > 0 && (
                  <div className="space-y-2">
                    {remainingActions.map((action) => (
                      <ActionRow 
                        key={action.action_id}
                        action={action}
                        getCategoryIcon={getCategoryIcon}
                        getPriorityColor={getPriorityColor}
                        getRiskVariant={getRiskVariant}
                        handleResolveAction={handleResolveAction}
                        Badge={Badge}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ActionRow = ({ 
  action, 
  getCategoryIcon, 
  getPriorityColor, 
  getRiskVariant, 
  handleResolveAction,
  Badge
}: { 
  action: any, 
  getCategoryIcon: (cat: string) => React.ReactNode,
  getPriorityColor: (p: string, s: number) => string,
  getRiskVariant: (s: number) => 'high' | 'medium' | 'low' | 'default',
  handleResolveAction: (id: string) => void,
  Badge: any
}) => {
  const isResolved = action.status === 'RESOLVED' || action.status === 'COMPLETED';

  return (
    <div 
      className={`group relative flex items-center h-[64px] bg-white border border-[#E5E7EB] rounded-lg transition-colors hover:bg-slate-50/50 ${
        isResolved ? 'opacity-40' : ''
      }`}
    >
      {/* Priority Color Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        getPriorityColor(action.priority, action.risk_score)
      }`} />

      <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 shrink-0">
          {getCategoryIcon(action.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[13px] font-semibold text-slate-800 ${isResolved ? 'line-through' : ''}`}>
              {action.client_name}
            </span>
            <span className={`text-[13px] text-slate-700 ${isResolved ? 'line-through' : ''}`}>
              {action.title}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 truncate">
            {action.description}
          </p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-600 font-mono">
            {action.deadline}
          </span>
          <Badge variant={getRiskVariant(action.risk_score)}>
            Risk {action.risk_score}%
          </Badge>
          {!isResolved && (
            <button
              onClick={() => handleResolveAction(action.action_id)}
              className="h-7 px-3 border border-[#E5E7EB] bg-white hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-[12px] font-semibold rounded-lg transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

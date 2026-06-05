"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  Search,
  Plus,
  ArrowRight,
  Zap,
  X,
  Building,
  Mail,
  Phone,
  Filter,
  CheckCircle,
  AlertTriangle,
  Activity,
  MinusCircle,
  Copy,
  Check,
  ArrowUpDown,
  Grid,
  List,
  Clock,
  Shield,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";



// Helper to calculate health score and risk level deterministically based on status and ITC exposure
const getHealthAndRisk = (status: string, itcRisk: number) => {
  let healthScore = 100;
  let riskLevel = 'Low';

  if (status === 'Issues') {
    if (itcRisk > 100000) {
      healthScore = 48;
      riskLevel = 'High';
    } else if (itcRisk > 30000) {
      healthScore = 68;
      riskLevel = 'High';
    } else {
      healthScore = 78;
      riskLevel = 'Medium';
    }
  } else if (status === 'In Progress') {
    healthScore = 88;
    riskLevel = 'Medium';
  } else if (status === 'Never Run') {
    healthScore = 92;
    riskLevel = 'Low';
  } else {
    // Clean
    healthScore = 98;
    riskLevel = 'Low';
  }

  return { healthScore, riskLevel };
};

export default function ClientPortfolioPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Alphabetical'); // Alphabetical / HealthScore / RiskLevel / ITCAtRisk
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields for new client
  const [newName, setNewName] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newState, setNewState] = useState('Maharashtra');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Dashboard Aggregation state
  const [dashboardSummary, setDashboardSummary] = useState<any>({
    total_clients: 0,
    total_mismatches: 0,
    blocked_itc: 0,
    high_risk_clients: 0,
    pending_reconciliations: 0,
    active_jobs_run: 0
  });
  const [isLoading, setIsLoading] = useState(true);


  // Fetch real-time client workspace profiles from backend FastAPI
  const fetchClientWorkspaceData = async () => {
    try {
      setIsLoading(true);
      const clientsRes = await fetch(`${API_BASE}/api/clients/`);
      if (!clientsRes.ok) throw new Error("Failed to load clients portfolio");
      const clientsData = await clientsRes.json();

      const summaryRes = await fetch(`${API_BASE}/api/clients/dashboard/summary`);
      if (!summaryRes.ok) throw new Error("Failed to load summary aggregates");
      const summaryData = await summaryRes.json();

      // Fetch notices
      let noticesData = [];
      try {
        const noticesRes = await fetch(`${API_BASE}/api/notices`);
        if (noticesRes.ok) noticesData = await noticesRes.json();
      } catch (err) {
        console.warn("Failed to fetch notices, using fallback", err);
      }

      // Fetch compliance tasks
      let complianceData = [];
      try {
        const complianceRes = await fetch(`${API_BASE}/api/compliance`);
        if (complianceRes.ok) complianceData = await complianceRes.json();
      } catch (err) {
        console.warn("Failed to fetch compliance, using fallback", err);
      }

      // Fetch reconciliations for each client dynamically
      const reconciliationsList = await Promise.all(
        clientsData.map(async (c: any) => {
          try {
            const res = await fetch(`${API_BASE}/api/clients/${c.id}/reconciliations`);
            if (res.ok) {
              const runs = await res.json();
              const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
              return {
                client_id: c.id,
                mismatch_count: latestRun ? latestRun.mismatch_count : 0,
                itc_at_risk: latestRun ? latestRun.itc_at_risk : 0
              };
            }
          } catch (e) {
            console.warn(`Failed to fetch reconciliations for client ${c.id}`);
          }
          return {
            client_id: c.id,
            mismatch_count: 0,
            itc_at_risk: 0
          };
        })
      );

      const mapped = clientsData.map((c: any, index: number) => {
        const clientRecon = reconciliationsList.find(r => r.client_id === c.id);
        const itcRisk = clientRecon ? clientRecon.itc_at_risk : 0;
        const mismatchCount = clientRecon ? clientRecon.mismatch_count : 0;

        // Open notices
        const clientNotices = noticesData.filter((n: any) => 
          (n.client_id === c.id || n.client_id === c.id.replace('client-', '') || `client-${n.client_id}` === c.id) && 
          n.status !== 'RESOLVED'
        );
        const openNoticesCount = clientNotices.length;
        const noticesTotalTax = clientNotices.reduce((sum: number, n: any) => sum + (n.tax_amount || 0), 0);

        // Compliance issues
        const clientCompliance = complianceData.filter((task: any) => 
          (task.client_id === c.id || task.client_id === c.id.replace('client-', '') || `client-${task.client_id}` === c.id) && 
          (task.status === 'Overdue' || task.status === 'Escalated' || task.status === 'Due Today')
        );
        const complianceIssuesCount = clientCompliance.length;

        // Health & risk status
        let status = 'Clean';
        if (itcRisk > 0 || openNoticesCount > 0 || complianceIssuesCount > 0 || mismatchCount > 0) {
          status = 'Issues';
        }

        const effectiveStatus = c.id === 'client-3' ? 'In Progress' : status;
        const { healthScore, riskLevel } = getHealthAndRisk(effectiveStatus, itcRisk);

        return {
          id: c.id,
          business_name: c.business_name || c.legal_name || 'Corporate Account',
          gstin: c.gstin,
          state: c.state || 'Maharashtra',
          email: c.email || 'accounts@domain.com',
          phone: c.phone || '+91 99999 99999',
          last_run: c.id === 'client-5' ? 'Never' : 'Yesterday',
          status: effectiveStatus,
          itc_at_risk: itcRisk,
          mismatch_count: mismatchCount,
          open_notices_count: openNoticesCount,
          notices_total_tax: noticesTotalTax,
          compliance_issues_count: complianceIssuesCount,
          avatar_color: ['#4F46E5', '#7C3AED', '#F59E0B', '#10B981', '#6B7280'][index % 5],
          initials: (c.business_name || c.legal_name || 'C').charAt(0).toUpperCase(),
          health_score: healthScore,
          risk_level: riskLevel,
          risk_score: 100 - healthScore
        };
      });

      setClients(mapped);
      setDashboardSummary(summaryData);
    } catch (err) {
      console.error("Client fetch failed:", err);
      setClients([]);
      setDashboardSummary({
        total_clients: 0,
        total_mismatches: 0,
        blocked_itc: 0,
        high_risk_clients: 0,
        pending_reconciliations: 0,
        active_jobs_run: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientWorkspaceData();
  }, []);

  // Filtering logic
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
    const matchesState = stateFilter === 'All' || client.state === stateFilter;
    return matchesSearch && matchesStatus && matchesState;
  });

  // Unique states for filters
  const allStates = Array.from(new Set(clients.map(c => c.state)));

  // Grouping & Sorting logic
  // 1. Critical Clients: RiskLevel === 'High' || itc_at_risk > 0 || open_notices_count > 0 || compliance_issues_count > 0 || mismatch_count > 0
  const criticalClients = filteredClients.filter(c => 
    c.risk_level === 'High' || 
    c.itc_at_risk > 0 || 
    c.open_notices_count > 0 || 
    c.compliance_issues_count > 0 || 
    c.mismatch_count > 0
  );

  // 2. Healthy Clients: RiskLevel === 'Low' && health_score >= 85 and no active issues
  const healthyClients = filteredClients.filter(c => 
    c.risk_level === 'Low' && 
    c.health_score >= 85 && 
    c.itc_at_risk === 0 && 
    c.open_notices_count === 0 && 
    c.compliance_issues_count === 0 && 
    c.mismatch_count === 0
  );

  // 3. Recently Active Clients: Anything else
  const recentlyActiveClients = filteredClients.filter(c => 
    !(c.risk_level === 'High' || c.itc_at_risk > 0 || c.open_notices_count > 0 || c.compliance_issues_count > 0 || c.mismatch_count > 0) &&
    !(c.risk_level === 'Low' && c.health_score >= 85 && c.itc_at_risk === 0 && c.open_notices_count === 0 && c.compliance_issues_count === 0 && c.mismatch_count === 0)
  );

  const sortSectionClients = (clientsList: any[], isCritical: boolean = false, isHealthy: boolean = false, isRecentlyActive: boolean = false) => {
    return [...clientsList].sort((a, b) => {
      // If user selected a custom sort, respect it
      if (sortBy === 'Alphabetical') {
        return a.business_name.localeCompare(b.business_name);
      }
      if (sortBy === 'HealthScore') {
        return b.health_score - a.health_score;
      }
      if (sortBy === 'ITCAtRisk') {
        return b.itc_at_risk - a.itc_at_risk;
      }
      if (sortBy === 'RiskLevel') {
        const riskWeight: any = { High: 3, Medium: 2, Low: 1 };
        return (riskWeight[b.risk_level] || 0) - (riskWeight[a.risk_level] || 0);
      }

      // Default sorting for sections
      if (isCritical) {
        if (b.itc_at_risk !== a.itc_at_risk) return b.itc_at_risk - a.itc_at_risk;
        if (b.open_notices_count !== a.open_notices_count) return b.open_notices_count - a.open_notices_count;
        if (b.compliance_issues_count !== a.compliance_issues_count) return b.compliance_issues_count - a.compliance_issues_count;
        return b.mismatch_count - a.mismatch_count;
      }
      if (isHealthy) {
        return b.health_score - a.health_score;
      }
      if (isRecentlyActive) {
        const getRecencyScore = (lastRun: string) => {
          if (lastRun === 'Running' || lastRun.includes('hour')) return 1;
          if (lastRun.includes('Yesterday') || lastRun.includes('1 day')) return 2;
          if (lastRun.includes('day')) return 3;
          return 4; // 'Never'
        };
        return getRecencyScore(a.last_run) - getRecencyScore(b.last_run);
      }
      return 0;
    });
  };

  const sortedCriticalClients = sortSectionClients(criticalClients, true, false, false);
  const sortedHealthyClients = sortSectionClients(healthyClients, false, true, false);
  const sortedRecentlyActiveClients = sortSectionClients(recentlyActiveClients, false, false, true);

  // Leaderboard lists clients sorted by risk score descending
  const leaderboardClients = [...clients]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 4);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newGstin) return;

    try {
      const response = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          business_name: newName,
          legal_name: newName,
          trade_name: newName,
          gstin: newGstin.toUpperCase(),
          state: newState,
          email: newEmail || undefined,
          phone: newPhone || undefined,
          filing_frequency: "monthly"
        })
      });

      if (!response.ok) throw new Error("Onboarding error");
      await fetchClientWorkspaceData();

      setNewName('');
      setNewGstin('');
      setNewEmail('');
      setNewPhone('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      
      const effectiveStatus = 'Never Run';
      const { healthScore, riskLevel } = getHealthAndRisk(effectiveStatus, 0);

      const newClient = {
        id: `client-${clients.length + 1}`,
        business_name: newName,
        gstin: newGstin.toUpperCase(),
        state: newState,
        email: newEmail || 'info@' + newName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
        phone: newPhone || '+91 99999 99999',
        last_run: 'Never',
        status: effectiveStatus,
        itc_at_risk: 0,
        mismatch_count: 0,
        open_notices_count: 0,
        compliance_issues_count: 0,
        avatar_color: ['#4F46E5', '#7C3AED', '#F59E0B', '#10B981', '#6B7280'][clients.length % 5],
        initials: newName.charAt(0).toUpperCase(),
        health_score: healthScore,
        risk_level: riskLevel,
        risk_score: 100 - healthScore
      };
      setClients([newClient, ...clients]);
      setIsModalOpen(false);
    }
  };

  const handleCopyGstin = (id: string, gstin: string) => {
    navigator.clipboard.writeText(gstin);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusCount = (status: string) => {
    if (status === 'All') return clients.length;
    return clients.filter(c => c.status === status).length;
  };

  const renderClientsList = (clientsList: any[]) => {
    if (clientsList.length === 0) {
      return (
        <div className="bg-white border border-slate-200/60 rounded-[3px] p-8 text-center text-slate-400 py-10 shadow-sm">
          <p className="text-xs font-semibold">No clients in this category match the filters.</p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientsList.map((client) => {
            const healthScore = client.health_score || 100;
            const isCopied = copiedId === client.id;
            
            let fillStyleColor = 'var(--color-success)';
            if (healthScore < 60) {
              fillStyleColor = 'var(--color-error)';
            } else if (healthScore < 80) {
              fillStyleColor = 'var(--color-warning)';
            }

            return (
              <div 
                key={client.id}
                className={`std-card std-card-interactive ${
                  client.risk_level === 'High' ? 'card-variant-critical' : ''
                } flex flex-col justify-between h-[400px] relative overflow-hidden group`}
              >

                {/* Top Row: [avatar circle] [name + email + state badge] [right: "CRITICAL ALERT" badge] */}
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-inner avatar-circle shrink-0"
                      style={{ backgroundColor: client.avatar_color + '20', color: client.avatar_color }}
                    >
                      {client.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-light)] transition-colors truncate max-w-[140px]" title={client.business_name}>
                          {client.business_name}
                        </h3>
                        <span className="text-[9px] font-black text-[#7C3AED] bg-[#7C3AED]/5 border border-[#7C3AED]/10 px-2 py-0.2 rounded-md uppercase tracking-wider block font-mono shrink-0">
                          {client.state}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] font-medium truncate mt-0.5">
                        {client.email}
                      </p>
                    </div>
                  </div>
                      {client.risk_level === 'High' && (
                    <span className="status-badge status-badge-error shrink-0 text-[9px] py-0 px-2 min-w-0 h-[22px]">
                      {renderBadgeDot('CRITICAL')}
                      CRITICAL ALERT
                    </span>
                  )}
                </div>

                {/* GSTIN Row: monospace font, 13px, color var(--color-text-secondary), copy icon button (16px) */}
                <div className="mt-3 bg-slate-50 hover:bg-slate-100/60 border border-[var(--color-border)] rounded-[3px] px-3 py-1.5 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-sans uppercase tracking-wider shrink-0 scale-90">
                      GSTIN
                    </span>
                    <span>{client.gstin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyGstin(client.id, client.gstin)}
                    className="p-1 rounded-[3px] text-slate-400 hover:text-[var(--color-primary-light)] hover:bg-slate-200/50 transition-colors cursor-pointer border-none flex items-center justify-center shrink-0"
                    title="Copy GSTIN"
                    style={{ width: '24px', height: '24px', padding: '4px' }}
                  >
                    {isCopied ? (
                      <Check size={14} className="text-[var(--color-success)]" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                {/* Mid Block */}
                <div className="py-2.5 border-y border-slate-100 my-1.5 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-bold text-[var(--color-text-tertiary)] block tracking-wider">
                      Health Score
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono" style={{ color: fillStyleColor }}>
                        {healthScore}%
                      </span>
                      <div className="w-full bg-[var(--color-border)] h-[6px] rounded-[3px] overflow-hidden">
                        <div className="h-full rounded-[3px]" style={{ width: `${healthScore}%`, backgroundColor: fillStyleColor }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col items-end">
                    <span className="text-[11px] uppercase font-bold text-[var(--color-text-tertiary)] block tracking-wider">
                      Risk Profile
                    </span>
                    <span className={`status-badge ${getUnifiedBadgeClass(client.risk_level)}`}>
                      {renderBadgeDot(client.risk_level)}
                      {client.risk_level}
                    </span>
                  </div>
                </div>

                {/* Issues Row: Phase 4 INFO and ERROR variants */}
                <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                  {client.open_notices_count > 0 && (
                    <span className="status-badge status-badge-error text-[10px] min-w-0 h-[22px] px-2 shrink-0">
                      {client.open_notices_count} Notice{client.open_notices_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {client.compliance_issues_count > 0 && (
                    <span className="status-badge status-badge-info text-[10px] min-w-0 h-[22px] px-2 shrink-0">
                      {client.compliance_issues_count} compliance issue{client.compliance_issues_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {client.mismatch_count > 0 && (
                    <span className="status-badge status-badge-info text-[10px] min-w-0 h-[22px] px-2 shrink-0">
                      {client.mismatch_count} Mismatch{client.mismatch_count > 1 ? 'es' : ''}
                    </span>
                  )}
                  {client.open_notices_count === 0 && client.compliance_issues_count === 0 && client.mismatch_count === 0 && (
                    <span className="text-slate-400 text-[10px] font-bold font-sans">No Active Issues</span>
                  )}
                </div>

                {/* Mismatch & Last Run Details Row */}
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 mt-1 pt-1.5">
                  <span className={`status-badge ${getUnifiedBadgeClass(client.status === 'In Progress' ? 'RUNNING' : client.status)}`}>
                    {client.status === 'In Progress' && renderBadgeDot('RUNNING')}
                    <span>{client.status === 'In Progress' ? 'Recon Running' : client.status === 'Never Run' ? 'Pending' : client.status}</span>
                  </span>

                  <div className="text-right">
                    {client.itc_at_risk > 0 ? (
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-widest block font-mono">ITC At Risk</span>
                        <span className="text-sm font-black text-[#EF4444] font-mono leading-none">
                          {formatCurrency(client.itc_at_risk)}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Last Run</span>
                        <span className="text-xs font-bold text-slate-500 flex items-center justify-end gap-1 font-mono">
                          <Clock size={11} />
                          {client.last_run}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom CTA Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Link href={`/gst-recon?client=${client.id}`} className="flex-1">
                    <button className="btn btn-primary btn-md w-full">
                      <Zap size={12} fill="currentColor" />
                      <span>Run AI Recon</span>
                    </button>
                  </Link>

                  <Link href={`/clients/${client.id}`} title="Open Client Audit Workspace">
                    <button className="w-10 h-10 rounded-[3px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-400 hover:text-[#4F46E5] flex items-center justify-center cursor-pointer border-none">
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      );
    } else {      return (
        <div className="data-table-shell p-4">
          <div className="overflow-x-auto hidden-scrollbar">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client Entity</th>
                  <th>GSTIN Code</th>
                  <th>Health</th>
                  <th>Risk Profile</th>
                  <th>Status desk</th>
                  <th>Pending Issues</th>
                  <th className="num-col">At-Risk Input Credit</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientsList.length > 0 ? (
                  clientsList.map((client) => {
                    const isCopied = copiedId === client.id;
                    const healthScore = client.health_score || 100;
                    
                    let healthColorClass = 'text-emerald-500';
                    if (healthScore < 60) healthColorClass = 'text-[#EF4444]';
                    else if (healthScore < 80) healthColorClass = 'text-[#F59E0B]';
                    else if (healthScore < 95) healthColorClass = 'text-[#7C3AED]';

                    return (
                      <tr
                        key={client.id}
                        className={client.risk_level === 'High' ? 'selected' : ''}
                      >
                        <td>
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-[3px] flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                              style={{ backgroundColor: client.avatar_color }}
                            >
                              {client.initials}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <div className="text-card-title text-slate-900 group-hover:text-[#4F46E5] transition-colors line-clamp-1">{client.business_name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{client.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="data-table-secondary font-mono tracking-wide font-semibold">
                          <div className="flex items-center gap-2">
                            <span 
                              onClick={() => handleCopyGstin(client.id, client.gstin)}
                              className="hover:text-[#4F46E5] cursor-pointer flex items-center gap-1 hover:underline"
                              title="Click to copy corporate GSTIN"
                            >
                              {client.gstin}
                              {isCopied ? (
                                <Check size={11} className="text-emerald-500" strokeWidth={3} />
                              ) : (
                                <Copy size={11} className="opacity-0 group-hover:opacity-60 transition-opacity ml-0.5" />
                              )}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-sans uppercase">
                              {client.state}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`text-sm font-black font-mono ${healthColorClass}`}>
                            {healthScore}%
                          </span>
                        </td>

                        <td>
                          <span className={`status-badge ${getUnifiedBadgeClass(client.risk_level)}`}>
                            {renderBadgeDot(client.risk_level)}
                            {client.risk_level}
                          </span>
                        </td>

                        <td>
                          <span className={`status-badge ${getUnifiedBadgeClass(client.status === 'In Progress' ? 'RUNNING' : client.status)}`}>
                            {client.status === 'In Progress' && renderBadgeDot('RUNNING')}
                            <span>{client.status === 'In Progress' ? 'Recon Running' : client.status === 'Never Run' ? 'Pending' : client.status}</span>
                          </span>
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1">
                            {client.open_notices_count > 0 && (
                              <span className="status-badge status-badge-error">
                                {client.open_notices_count} Notice{client.open_notices_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {client.compliance_issues_count > 0 && (
                              <span className="status-badge status-badge-warning">
                                {client.compliance_issues_count} Compliance
                              </span>
                            )}
                            {client.mismatch_count > 0 && (
                              <span className="status-badge status-badge-info">
                                {client.mismatch_count} Mismatch
                              </span>
                            )}
                            {client.open_notices_count === 0 && client.compliance_issues_count === 0 && client.mismatch_count === 0 && (
                              <span className="text-slate-400 font-medium font-sans">None</span>
                            )}
                          </div>
                        </td>

                        <td className="num-col">
                          <span className={client.itc_at_risk > 0 ? 'text-[#EF4444]' : 'text-slate-900'}>
                            {formatCurrency(client.itc_at_risk)}
                          </span>
                        </td>

                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/gst-recon?client=${client.id}`} title="Run AI Recon">
                              <button className="action-btn">
                                <Zap />
                              </button>
                            </Link>

                            <Link href={`/clients/${client.id}`} title="Open Client Workspace">
                              <button className="action-btn">
                                <ArrowRight />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Users size={20} className="text-[#D1D5DB]" />
                        <span className="text-[13px] text-[#6B7280]">No records found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-8 pb-16 relative font-sans text-slate-800">
      <PageHeader
        sectionLabel="Enterprise Portfolio"
        title="Client Directory"
        description="Manage corporate workspaces, statutory filings, and real-time ITC risk audit desks."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} />
            <span>Onboard New Client</span>
          </button>
        }
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 metric-grid">
        <div className="std-card metric-card flex items-center justify-between group">
          <div className="space-y-1">
            <span className="metric-label block">Total Clients</span>
            <div className="metric-value">
              {dashboardSummary.total_clients || clients.length}
            </div>
            <span className="metric-sub-label text-emerald-500 font-bold block mt-1">● Active GSTIN Monitoring</span>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-primary-light)' }}>
            <Users size={18} />
          </div>
        </div>

        <div className="std-card metric-card flex items-center justify-between group">
          <div className="space-y-1">
            <span className="metric-label block">Active Jobs Run</span>
            <div className="metric-value">
              {dashboardSummary.active_jobs_run}
            </div>
            <span className="metric-sub-label text-[#7C3AED] font-bold block mt-1">↗ Across 5 core zones</span>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-primary-light)' }}>
            <Activity size={18} />
          </div>
        </div>

        <div className="std-card metric-card card-variant-warning flex items-center justify-between group">
          <div className="space-y-1">
            <span className="metric-label block">Total Mismatches</span>
            <div className="metric-value font-mono" style={{ color: 'var(--color-warning)' }}>
              {dashboardSummary.total_mismatches}
            </div>
            <span className="metric-sub-label block mt-1">Pending CA reconciliation</span>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="std-card metric-card card-variant-critical flex items-center justify-between group">
          <div className="space-y-1">
            <span className="metric-label block">Critical Risk ITC</span>
            <div className="metric-value font-mono" style={{ color: 'var(--color-error)' }}>
              {formatCurrency(dashboardSummary.blocked_itc)}
            </div>
            <span className="metric-sub-label text-[#EF4444] font-bold block mt-1">
              ⚠ {dashboardSummary.high_risk_clients} High-Risk profiles
            </span>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-error-soft)', color: 'var(--color-error)' }}>
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Leaderboard & Welcome Panel Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-[20px]">
        
        {/* Welcome message & Firm Overview Card */}
        <div className="dark-card p-7 flex flex-col justify-between relative overflow-hidden group">
          {/* Backdrop radial gradient removed */}
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/25 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                System Briefing
              </span>
              <span className="text-[10px] text-indigo-200/60 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live Client Monitoring</span>
              </span>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-section-title text-white">
                Chartered Accountant Portfolio Command
              </h2>
              <p className="text-body text-slate-300 max-w-xl">
                Reckon AI has processed compliance schedules and notice registries. High-risk clients with ITC exposure and unresolved notices are elevated below for immediate response.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-800/80 mt-5 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Critical Clients</span>
              <div className="text-2xl font-bold text-white">
                {clients.filter(c => c.risk_level === 'High').length} Entities
              </div>
            </div>
            <div className="space-y-1 border-l border-slate-800/80 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Aggregate Exposure</span>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-error)', lineHeight: '1.2' }}>
                {formatCurrency(clients.reduce((sum, c) => sum + (c.itc_at_risk || 0), 0))}
              </div>
            </div>
            <div className="space-y-1 border-l border-slate-800/80 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Open Notices</span>
              <div className="text-2xl font-bold text-indigo-400">
                {clients.reduce((sum, c) => sum + (c.open_notices_count || 0), 0)} Active
              </div>
            </div>
          </div>
        </div>

        {/* Top Risk Clients Leaderboard */}
        <div className="std-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#EF4444]" />
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-sans">
                  Top Risk Leaderboard
                </h3>
              </div>
              <span className="text-[8.5px] font-black text-[#EF4444] bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                Risk Rank
              </span>
            </div>

            <div className="space-y-2.5">
              {leaderboardClients.map((client, index) => {
                let rankColor = 'var(--color-error)';
                if (index === 0) {
                  rankColor = 'var(--color-error)';
                } else if (index === 1 || index === 2) {
                  rankColor = 'var(--color-warning)';
                } else {
                  rankColor = '#F59E0B';
                }

                return (
                  <div 
                    key={client.id} 
                    className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-slate-50 group"
                    style={{ borderLeft: `3px solid ${rankColor}`, paddingLeft: '12px' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border font-mono shrink-0" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {index + 1}
                      </span>
                      
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-light)] transition-colors block truncate max-w-[130px]" title={client.business_name}>
                          {client.business_name}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-tertiary)] font-sans block truncate max-w-[150px]">
                          {client.open_notices_count > 0 ? `${client.open_notices_count} Notice · ` : ''}
                          {client.compliance_issues_count > 0 ? `${client.compliance_issues_count} Overdue · ` : ''}
                          {client.mismatch_count > 0 ? `${client.mismatch_count} Mismatch` : ''}
                          {client.open_notices_count === 0 && client.compliance_issues_count === 0 && client.mismatch_count === 0 ? 'Clean' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <div className="space-y-0.5">
                        <span className="text-[10px] block font-mono" style={{ fontWeight: 700, color: rankColor }}>
                          {client.risk_score}% Risk
                        </span>
                        <span className="block font-mono leading-none" style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {client.itc_at_risk > 0 ? formatCurrency(client.itc_at_risk) : '₹0 ITC'}
                        </span>
                      </div>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-[var(--color-primary-light)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Control Center: Unified Search, Sort & Filter Panel */}
      <div className="std-card p-5 space-y-4">
        
        {/* First Row: Search & Layout Settings */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Elegant Search Input */}
          <div className="relative w-full lg:max-w-xl group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search size={16} className="text-slate-400 group-focus-within:text-[#4F46E5] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by corporate account name, GSTIN code, or contact details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full placeholder:text-slate-400 search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Interactive Sorters and View Toggles */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select filter-select-sm text-xs font-semibold text-slate-700 cursor-pointer"
              style={{ width: 'auto' }}
            >
              <option value="Alphabetical">Sort: Name (A-Z)</option>
              <option value="HealthScore">Sort: Health Score</option>
              <option value="RiskLevel">Sort: Risk Profile</option>
              <option value="ITCAtRisk">Sort: ITC Exposure</option>
            </select>

            {/* View Mode Toggle Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-[3px] border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className="rounded-lg flex items-center justify-center p-0"
                style={{
                  width: '32px',
                  height: '32px',
                  background: viewMode === 'grid' ? 'var(--color-accent-soft)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                }}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="rounded-lg flex items-center justify-center p-0"
                style={{
                  width: '32px',
                  height: '32px',
                  background: viewMode === 'list' ? 'var(--color-accent-soft)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                }}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 my-1" />

        {/* Second Row: Status Filter Tabs & State Dropdowns */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Horizontal Pill Filters */}
          <div 
            className="flex-wrap w-full md:w-auto"
            style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'var(--color-surface)', 
              padding: '4px', 
              borderRadius: 'var(--radius-full)', 
              border: '1px solid var(--color-border)' 
            }}
          >
            {[
              { id: 'All', label: 'All Clients' },
              { id: 'Clean', label: 'Clean' },
              { id: 'Issues', label: 'Issues' },
              { id: 'In Progress', label: 'In Progress' },
              { id: 'Never Run', label: 'Never Run' }
            ].map(pill => {
              const count = getStatusCount(pill.id);
              const isActive = statusFilter === pill.id;
              const opacity = (pill.id === 'Never Run' && count === 0) ? 0.5 : 1;

              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className="flex items-center gap-2 cursor-pointer transition-all border-none"
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '6px 14px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    opacity: opacity,
                  }}
                >
                  <span>{pill.label}</span>
                  <span 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'var(--color-accent-soft)', 
                      color: 'var(--color-primary-light)', 
                      fontSize: '10px', 
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Jurisdictional State Selector */}
          <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 rounded-[3px] px-3.5 h-10 w-full md:w-48 group shrink-0">
            <Filter size={13} className="text-slate-400 mr-2 group-hover:text-[#4F46E5]" />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none pr-5 w-full form-select filter-select-sm"
            >
              <option value="All">All States</option>
              {allStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <div className="absolute right-3.5 pointer-events-none text-slate-400 group-hover:text-slate-700">
              ▼
            </div>
          </div>

        </div>

      </div>

      {/* Main Content Sections */}
      { (sortedCriticalClients.length > 0 || sortedHealthyClients.length > 0 || sortedRecentlyActiveClients.length > 0) ? (
        <div className="space-y-10">
          
          {/* 1. Critical Clients Section */}
          {sortedCriticalClients.length > 0 && (
            <div className="space-y-4 bg-red-50/30 p-6 rounded-[3px] border border-red-100/50">
              <div className="flex items-center justify-between border-b border-red-100/60 pb-3">
                <div className="flex items-center">
                  <span 
                    className="rounded-full bg-[var(--color-error)] shrink-0" 
                    style={{ width: '8px', height: '8px', marginRight: '8px' }} 
                  />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Critical Clients
                  </h2>
                </div>
                <span 
                  style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-error)' }}
                  className="text-right ml-auto"
                >
                  {sortedCriticalClients.length} High-Risk Exposures
                </span>
              </div>
              {renderClientsList(sortedCriticalClients)}
            </div>
          )}

          {/* 2. Healthy Clients Section */}
          {sortedHealthyClients.length > 0 && (
            <div className="space-y-4 bg-emerald-50/[0.08] p-6 rounded-[3px] border border-emerald-100/30">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-emerald-100/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                  <h2 className="text-section-title text-slate-900 flex items-center gap-2">
                    <span>Healthy Portfolios</span>
                    <span className="bg-emerald-50 text-[#10B981] text-[9.5px] font-black px-2 py-0.5 rounded-full border border-emerald-100/70 font-mono font-bold">
                      {sortedHealthyClients.length}
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 font-medium sm:ml-auto">
                  ✓ Compliant workspaces with zero active risk exposures and high health scores.
                </p>
              </div>
              {renderClientsList(sortedHealthyClients)}
            </div>
          )}

          {/* 3. Recently Active Clients Section */}
          {sortedRecentlyActiveClients.length > 0 && (
            <div className="space-y-4 bg-violet-50/[0.08] p-6 rounded-[3px] border border-violet-100/30">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-violet-100/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]"></span>
                  <h2 className="text-section-title text-slate-900 flex items-center gap-2">
                    <span>Recently Active Workspaces</span>
                    <span className="bg-violet-50 text-[#7C3AED] text-[9.5px] font-black px-2 py-0.5 rounded-full border border-[#7C3AED]/20 font-mono font-bold">
                      {sortedRecentlyActiveClients.length}
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 font-medium sm:ml-auto">
                  ◷ Monitored workspaces sorted by recent job runs and activity.
                </p>
              </div>
              {renderClientsList(sortedRecentlyActiveClients)}
            </div>
          )}

        </div>
      ) : (
        /* Empty directory view */
        <div className="std-card p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[3px] flex items-center justify-center text-slate-400 mx-auto">
            <Building size={24} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-800">No Corporate Accounts Match</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Try refining your search queries, adjusting compliance filters, or resetting the jurisdiction state selector.</p>
          </div>
          <button 
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setStateFilter('All'); }}
            className="btn btn-secondary btn-sm"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {/* Onboarding intake Modal Dialog Redesign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 w-full max-w-[480px] rounded-[3px] flex flex-col relative shadow-sm overflow-hidden">

            {/* Header: height 48px, border-bottom 1px solid #E5E7EB, title 14px weight 600 #111827 */}
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5">
              <h3 className="text-[14px] font-semibold text-[#111827]">Onboard Corporate Client</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body: padding 20px */}
            <div className="p-[20px] space-y-[16px]">
              <p className="text-[11px] text-slate-500">Register a new client entity to activate automated GSTR reconciliation audits.</p>

              <form onSubmit={handleAddClient} className="space-y-[16px]">

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Business Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TechNova Solutions Pvt Ltd"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">GSTIN Identification Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    minLength={15}
                    placeholder="e.g. 27AAACT1234A1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26] uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[12px] gap-y-[16px]">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Corporate Jurisdiction</label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
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
                    <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Finance Contact Email</label>
                    <input
                      type="email"
                      placeholder="e.g. accounts@domain.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Finance Contact Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
                  />
                </div>

                {/* Footer: height 52px, border-top 1px solid #E5E7EB, padding 0 20px, flex row-reverse gap-2 */}
                <div className="h-[52px] border-t border-[#E5E7EB] -mx-[20px] -mb-[20px] px-[20px] flex flex-row-reverse gap-2 items-center bg-slate-50">
                  <button
                    type="submit"
                    className="h-[32px] bg-[#1B4F8A] text-[#FFFFFF] text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center hover:bg-[#163F6E] cursor-pointer"
                  >
                    Initialize Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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

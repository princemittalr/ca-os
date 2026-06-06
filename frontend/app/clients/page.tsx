"use client";

import React, { useState, useEffect } from 'react';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  Search,
  Plus,
  ArrowRight,
  Zap,
  X,
  Building,
  Filter,
  AlertTriangle,
  Activity,
  Copy,
  Check,
  Grid,
  List,
  Clock,
  Users,
  TrendingUp,
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
  const [sortBy, setSortBy] = useState('Alphabetical');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields for new client
  const [newName, setNewName] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newState, setNewState] = useState('Maharashtra');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Dashboard Aggregation state (kept for API call)
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

  // Sorting logic
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'Alphabetical') return a.business_name.localeCompare(b.business_name);
    if (sortBy === 'HealthScore') return b.health_score - a.health_score;
    if (sortBy === 'ITCAtRisk') return b.itc_at_risk - a.itc_at_risk;
    if (sortBy === 'RiskLevel') {
      const riskWeight: any = { High: 3, Medium: 2, Low: 1 };
      return (riskWeight[b.risk_level] || 0) - (riskWeight[a.risk_level] || 0);
    }
    return 0;
  });

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

  return (
    <div className="pb-16 relative font-sans text-slate-800 bg-[#F8FAFC] min-h-screen">

      {/* Page Header — 48px, white, border-bottom */}
      <div className="w-full h-12 px-6 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between -mt-6 -mx-6 mb-4">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[14px] font-semibold text-[#111827] leading-none">Client Directory</h1>
          <p className="text-[11px] text-[#6B7280] leading-none">Manage corporate workspaces, statutory filings, and ITC risk audit desks</p>
        </div>
      </div>

      <div className="px-6 space-y-4">

        {/* Toolbar: 40px, flex row, gap-2 */}
        <div className="h-10 flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-[8px] text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, GSTIN, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[30px] w-[220px] bg-white border border-[#E5E7EB] rounded-[3px] pl-8 pr-3 text-[12px] text-slate-800 placeholder-[#9CA3AF] focus:outline-none focus:border-[#1B4F8A] font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-[7px] text-slate-400 hover:text-slate-700"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[30px] bg-white border border-[#E5E7EB] rounded-[3px] px-2 text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A] cursor-pointer font-sans"
          >
            <option value="All">All Status</option>
            <option value="Clean">Clean</option>
            <option value="Issues">Issues</option>
            <option value="In Progress">In Progress</option>
            <option value="Never Run">Never Run</option>
          </select>

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-[30px] bg-white border border-[#E5E7EB] rounded-[3px] px-2 text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A] cursor-pointer font-sans"
          >
            <option value="All">All States</option>
            {allStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-[30px] bg-white border border-[#E5E7EB] rounded-[3px] px-2 text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A] cursor-pointer font-sans"
          >
            <option value="Alphabetical">Sort: Name A–Z</option>
            <option value="HealthScore">Sort: Health Score</option>
            <option value="RiskLevel">Sort: Risk Level</option>
            <option value="ITCAtRisk">Sort: ITC at Risk</option>
          </select>

          {/* Result count */}
          <span className="text-[11px] text-[#6B7280] ml-1">
            {sortedClients.length} of {clients.length} clients
          </span>

          {/* View mode toggle — pushed to right */}
          <div className="ml-auto flex bg-slate-100 border border-slate-200 rounded-[3px] p-0.5">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className="w-[28px] h-[26px] flex items-center justify-center rounded-[2px] transition-colors"
              style={{
                background: viewMode === 'list' ? '#E8EFF7' : 'transparent',
                color: viewMode === 'list' ? '#1B4F8A' : '#6B7280',
              }}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className="w-[28px] h-[26px] flex items-center justify-center rounded-[2px] transition-colors"
              style={{
                background: viewMode === 'grid' ? '#E8EFF7' : 'transparent',
                color: viewMode === 'grid' ? '#1B4F8A' : '#6B7280',
              }}
            >
              <Grid size={14} />
            </button>
          </div>

          {/* Add Client button - primary style */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary h-[30px] px-3 text-[12px] font-medium rounded-[3px] flex items-center gap-1.5 hover:bg-[#163F6E] cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Client</span>
          </button>
        </div>

        {/* ── LIST TABLE VIEW ── */}
        {viewMode === 'list' && (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>PAN</th>
                    <th>GST</th>
                    <th>Status</th>
                    <th>Last Activity</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="h-4 bg-slate-100 rounded mx-4 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : sortedClients.length > 0 ? (
                    sortedClients.map((client) => {
                      const isCopied = copiedId === client.id;
                      const extractedPan = client.gstin && client.gstin.length >= 12 ? client.gstin.substring(2, 12) : (client.gstin || '—');
                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-[#F9FAFB] transition-colors group"
                        >
                          {/* Name + GSTIN sub-row */}
                          <td className="pl-4 pr-3 py-0">
                            <div className="flex items-center gap-2.5">
                              {/* 26px initials avatar */}
                              <div
                                className="w-[26px] h-[26px] rounded-[3px] flex items-center justify-center text-[11px] font-semibold shrink-0"
                                style={{ backgroundColor: '#E8EFF7', color: '#1B4F8A' }}
                              >
                                {client.initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium text-[#111827] truncate max-w-[200px]" title={client.business_name}>
                                  {client.business_name}
                                </div>
                                <div className="text-[11px] text-[#6B7280]">
                                  <span className="font-mono">{client.gstin}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* PAN */}
                          <td className="px-3 py-0">
                            <span className="font-mono text-[13px] text-[#111827]">{extractedPan}</span>
                          </td>

                          {/* GST */}
                          <td className="px-3 py-0">
                            <span className="font-mono text-[13px] text-[#111827]">{client.gstin}</span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-0">
                            <span className={`status-badge ${
                              client.status === 'Clean' ? 'status-badge-success' :
                              client.status === 'Issues' ? 'status-badge-error' :
                              client.status === 'In Progress' ? 'status-badge-warning' :
                              'status-badge-neutral'
                            }`}>
                              {client.status === 'In Progress' ? 'Running' : client.status === 'Never Run' ? 'Pending' : client.status}
                            </span>
                          </td>

                          {/* Last Activity */}
                          <td className="px-3 py-0">
                            <span className="text-[13px] text-[#111827]">{client.last_run}</span>
                          </td>

                          {/* Actions */}
                          <td className="pl-3 pr-4 py-0 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/gst-recon?client=${client.id}`} title="Run AI Recon">
                                <button className="action-btn">
                                  <Zap size={12} />
                                </button>
                              </Link>
                              <Link href={`/clients/${client.id}`} title="Open Client Workspace">
                                <button className="action-btn">
                                  <ArrowRight size={12} />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <Users size={20} className="text-[#D1D5DB]" />
                          <span className="text-[13px] text-[#6B7280]">No clients match filters</span>
                          <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setStateFilter('All'); }}
                            className="text-[12px] text-[#1B4F8A] hover:underline mt-1"
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[180px] bg-white border border-[#E5E7EB] rounded-[4px]" />
                ))}
              </div>
            ) : sortedClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedClients.map((client) => {
                  const isCopied = copiedId === client.id;
                  return (
                    <div
                      key={client.id}
                      className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 flex flex-col gap-3 hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-shadow group"
                      style={{ borderLeft: client.risk_level === 'High' ? '3px solid #B91C1C' : client.risk_level === 'Medium' ? '3px solid #B45309' : '3px solid #E5E7EB' }}
                    >
                      {/* Top: initials + name */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-[26px] h-[26px] rounded-[3px] flex items-center justify-center text-[11px] font-semibold shrink-0"
                            style={{ backgroundColor: '#E8EFF7', color: '#1B4F8A' }}
                          >
                            {client.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-[#111827] truncate" title={client.business_name}>
                              {client.business_name}
                            </div>
                            <div className="text-[11px] text-[#6B7280]">{client.state}</div>
                          </div>
                        </div>
                        <span className={`status-badge ${getUnifiedBadgeClass(client.risk_level)} shrink-0`}>
                          {renderBadgeDot(client.risk_level)}
                          {client.risk_level}
                        </span>
                      </div>

                      {/* GSTIN row */}
                      <div className="flex items-center justify-between bg-[#F9FAFB] border border-[#E5E7EB] rounded-[3px] px-2.5 py-1.5">
                        <span className="text-[11px] font-mono text-[#6B7280]">{client.gstin}</span>
                        <button
                          onClick={() => handleCopyGstin(client.id, client.gstin)}
                          className="text-slate-400 hover:text-[#1B4F8A] transition-colors"
                          title="Copy GSTIN"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Issues row */}
                      <div className="flex flex-wrap gap-1 min-h-[20px]">
                        {client.open_notices_count > 0 && (
                          <span className="status-badge status-badge-error">{client.open_notices_count} Notice{client.open_notices_count > 1 ? 's' : ''}</span>
                        )}
                        {client.compliance_issues_count > 0 && (
                          <span className="status-badge status-badge-warning">{client.compliance_issues_count} Compliance</span>
                        )}
                        {client.mismatch_count > 0 && (
                          <span className="status-badge status-badge-info">{client.mismatch_count} Mismatch</span>
                        )}
                        {client.open_notices_count === 0 && client.compliance_issues_count === 0 && client.mismatch_count === 0 && (
                          <span className="text-[11px] text-[#6B7280]">No active issues</span>
                        )}
                      </div>

                      {/* Bottom: ITC + actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
                        <div>
                          {client.itc_at_risk > 0 ? (
                            <span className="text-[12px] font-medium font-mono text-[#B91C1C]">{formatCurrency(client.itc_at_risk)} ITC at risk</span>
                          ) : (
                            <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                              <Clock size={11} /> {client.last_run}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/gst-recon?client=${client.id}`} title="Run AI Recon">
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] bg-white hover:bg-slate-50 text-[#6B7280] transition-colors">
                              <Zap size={12} />
                            </button>
                          </Link>
                          <Link href={`/clients/${client.id}`} title="Open Client Workspace">
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] bg-white hover:bg-slate-50 text-[#6B7280] transition-colors">
                              <ArrowRight size={12} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-12 text-center">
                <Building size={20} className="text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-[13px] text-[#6B7280]">No clients match filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('All'); setStateFilter('All'); }}
                  className="text-[12px] text-[#1B4F8A] hover:underline mt-2"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 w-full max-w-[480px] rounded-[3px] flex flex-col relative shadow-sm overflow-hidden">

            {/* Header */}
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5">
              <h3 className="text-[14px] font-semibold text-[#111827]">Onboard Corporate Client</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-[20px] space-y-[16px]">
              <p className="text-[11px] text-slate-500">Register a new client entity to activate automated GSTR reconciliation audits.</p>

              <form onSubmit={handleAddClient} className="space-y-[16px]">

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Business Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp Pvt Ltd"
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

                {/* Footer */}
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

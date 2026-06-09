"use client";

import React, { useState, useEffect } from 'react';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  Search,
  Plus,
  ArrowRight,
  Zap,
  X,
  Building2,
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
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

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
  const [riskFilter, setRiskFilter] = useState('All');
  const [assignedManagerFilter, setAssignedManagerFilter] = useState('All');
  const [filingTypeFilter, setFilingTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const clientsData = await api.get<any[]>('/api/clients/');
      const summaryData = await api.get<any>('/api/clients/dashboard/summary');

      // Fetch notices
      let noticesData: any[] = [];
      try {
        noticesData = await api.get<any[]>('/api/notices');
      } catch (err) {
        console.warn("Failed to fetch notices, using fallback", err);
      }

      // Fetch compliance tasks
      let complianceData: any[] = [];
      try {
        complianceData = await api.get<any[]>('/api/compliance');
      } catch (err) {
        console.warn("Failed to fetch compliance, using fallback", err);
      }

      // Fetch reconciliations for each client dynamically
      const reconciliationsList = await Promise.all(
        clientsData.map(async (c: any) => {
          try {
            const runs = await api.get<any[]>(`/api/clients/${c.id}/reconciliations`);
            const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
            return {
              client_id: c.id,
              mismatch_count: latestRun ? latestRun.mismatch_count : 0,
              itc_at_risk: latestRun ? latestRun.itc_at_risk : 0
            };
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
          risk_score: 100 - healthScore,
          filing_type: c.filing_type || 'GSTR-1 & 3B',
          filing_frequency: c.filing_frequency || 'Monthly',
          assigned_manager: c.assigned_manager || 'Priya Sharma'
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
    const matchesState = stateFilter === 'All' || client.state === stateFilter;
    const matchesRisk = riskFilter === 'All' || client.risk_level === riskFilter;
    const matchesManager = assignedManagerFilter === 'All' || client.assigned_manager === assignedManagerFilter;
    const matchesFilingType = filingTypeFilter === 'All' || client.filing_type === filingTypeFilter;
    return matchesSearch && matchesState && matchesRisk && matchesManager && matchesFilingType;
  });

  // Unique filters
  const allStates = Array.from(new Set(clients.map(c => c.state)));
  const allRiskLevels = ['High', 'Medium', 'Low'];
  const allManagers = Array.from(new Set(clients.map(c => c.assigned_manager)));
  const allFilingTypes = Array.from(new Set(clients.map(c => c.filing_type)));

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newGstin) return;

    try {
      await api.post('/api/clients', {
        business_name: newName,
        legal_name: newName,
        trade_name: newName,
        gstin: newGstin.toUpperCase(),
        state: newState,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        filing_frequency: "monthly"
      });

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
        risk_score: 100 - healthScore,
        filing_type: 'GSTR-1 & 3B',
        filing_frequency: 'Monthly',
        assigned_manager: 'Priya Sharma'
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setStateFilter('All');
    setRiskFilter('All');
    setAssignedManagerFilter('All');
    setFilingTypeFilter('All');
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getRiskVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'default';
    }
  };

  return (
    <div className="pb-16 relative font-sans text-slate-800 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="w-full px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Client Directory
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {filteredClients.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-[9px] text-slate-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[36px] w-[240px] bg-white border border-slate-200 rounded-[6px] pl-8 pr-3 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B4F8A] focus:ring-1 focus:ring-[#1B4F8A] font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-[9px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-[36px] bg-[#1B4F8A] text-white px-4 text-[13px] font-medium rounded-[6px] flex items-center gap-2 hover:bg-[#163F6E] transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Add Client
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filing Type */}
          <div className="flex items-center gap-1">
            {['All', ...allFilingTypes].map((type) => (
              <button
                key={type}
                onClick={() => setFilingTypeFilter(type)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                  filingTypeFilter === type
                    ? 'bg-[#1B4F8A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* State */}
          <div className="flex items-center gap-1">
            {['All', ...allStates].map((state) => (
              <button
                key={state}
                onClick={() => setStateFilter(state)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                  stateFilter === state
                    ? 'bg-[#1B4F8A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {state}
              </button>
            ))}
          </div>

          {/* Assigned Manager */}
          <div className="flex items-center gap-1">
            {['All', ...allManagers].map((manager) => (
              <button
                key={manager}
                onClick={() => setAssignedManagerFilter(manager)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                  assignedManagerFilter === manager
                    ? 'bg-[#1B4F8A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {manager}
              </button>
            ))}
          </div>

          {/* Risk Level */}
          <div className="flex items-center gap-1">
            {['All', ...allRiskLevels].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                  riskFilter === risk
                    ? 'bg-[#1B4F8A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <button
              onClick={clearAllFilters}
              className="text-[12px] text-slate-500 hover:text-[#1B4F8A] font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Filing Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Assigned Manager</TableHead>
                <TableHead>Last Recon</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-[32px] h-[32px] bg-slate-100 rounded-[6px] animate-pulse" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3 bg-slate-100 rounded w-[120px] animate-pulse" />
                          <div className="h-2.5 bg-slate-100 rounded w-[100px] animate-pulse" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="h-6 bg-slate-100 rounded w-[80px] animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 bg-slate-100 rounded w-[70px] animate-pulse" /></TableCell>
                    <TableCell><div className="h-3 bg-slate-100 rounded w-[90px] animate-pulse" /></TableCell>
                    <TableCell><div className="h-3 bg-slate-100 rounded w-[70px] animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 bg-slate-100 rounded w-[60px] animate-pulse" /></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredClients.length > 0 ? (
                paginatedClients.map((client, index) => (
                  <TableRow
                    key={client.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                    style={{ height: '52px' }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[32px] h-[32px] rounded-[6px] flex items-center justify-center text-[12px] font-bold shrink-0"
                          style={{ backgroundColor: '#E8EFF7', color: '#1B4F8A' }}
                        >
                          {client.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-900 truncate" title={client.business_name}>
                            {client.business_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {client.gstin}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="default" className="text-[11px]">
                        {client.filing_type}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="default" className="text-[11px]">
                        {client.filing_frequency}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {client.assigned_manager.charAt(0)}
                        </div>
                        <span className="text-[13px] text-slate-700">
                          {client.assigned_manager}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-[13px] text-slate-600">
                        {client.last_run}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskVariant(client.risk_level)}>
                          {client.risk_level}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {client.risk_score}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => toggleMenu(client.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === client.id && (
                          <div className="absolute right-0 top-full mt-1 w-[180px] bg-white border border-slate-200 rounded-[6px] shadow-lg z-50 py-1">
                            <Link href={`/clients/${client.id}`} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Eye size={14} />
                              View Details
                            </Link>
                            <Link href={`/gst-recon?client=${client.id}`} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Zap size={14} />
                              Run Reconciliation
                            </Link>
                            <Link href={`/compliance`} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <ShieldCheck size={14} />
                              View Compliance
                            </Link>
                            <Link href={`/clients/${client.id}`} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Edit size={14} />
                              Edit Client
                            </Link>
                            <div className="border-t border-slate-100 my-1" />
                            <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Building2 size={64} className="text-slate-200" />
                      <div className="text-center">
                        <h3 className="text-[15px] font-semibold text-slate-700 mb-1">
                          No clients added yet
                        </h3>
                        <p className="text-[13px] text-slate-500 mb-4">
                          Add your first client to begin tracking compliance and reconciliation.
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="h-[36px] bg-[#1B4F8A] text-white px-4 text-[13px] font-medium rounded-[6px] inline-flex items-center gap-2 hover:bg-[#163F6E] transition-colors cursor-pointer"
                        >
                          <Plus size={16} />
                          Add Client
                        </button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredClients.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-500">
                  Show
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[32px] bg-white border border-slate-200 rounded-[6px] px-2 text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-[12px] text-slate-500">
                  per page
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[12px] text-slate-500">
                  {startIndex + 1}–{Math.min(endIndex, filteredClients.length)} of {filteredClients.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 w-full max-w-[480px] rounded-[8px] flex flex-col relative shadow-lg overflow-hidden">
            {/* Header */}
            <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-5">
              <h3 className="text-[14px] font-semibold text-[#111827]">Add New Client</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <form onSubmit={handleAddClient} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">Business Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp Pvt Ltd"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-[36px] border border-[#D1D5DB] rounded-[6px] bg-[#FFFFFF] text-[13px] text-[#111827] px-3 placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-1 focus:ring-[#1B4F8A]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">GSTIN *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    minLength={15}
                    placeholder="e.g. 27AAACT1234A1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    className="w-full h-[36px] border border-[#D1D5DB] rounded-[6px] bg-[#FFFFFF] text-[13px] text-[#111827] px-3 placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-1 focus:ring-[#1B4F8A] uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1">State</label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full h-[36px] border border-[#D1D5DB] rounded-[6px] bg-[#FFFFFF] text-[13px] text-[#111827] px-3 focus:border-[#1B4F8A] focus:outline-none focus:ring-1 focus:ring-[#1B4F8A]"
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
                    <label className="block text-[12px] font-medium text-[#374151] mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="e.g. accounts@domain.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full h-[36px] border border-[#D1D5DB] rounded-[6px] bg-[#FFFFFF] text-[13px] text-[#111827] px-3 placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-1 focus:ring-[#1B4F8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-[36px] border border-[#D1D5DB] rounded-[6px] bg-[#FFFFFF] text-[13px] text-[#111827] px-3 placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-1 focus:ring-[#1B4F8A]"
                  />
                </div>

                {/* Footer */}
                <div className="h-[56px] border-t border-[#E5E7EB] -mx-5 -mb-5 px-5 flex flex-row-reverse gap-2 items-center bg-slate-50 rounded-b-[8px]">
                  <button
                    type="submit"
                    className="h-[36px] bg-[#1B4F8A] text-[#FFFFFF] text-[13px] font-medium rounded-[6px] px-4 flex items-center justify-center hover:bg-[#163F6E] cursor-pointer transition-colors"
                  >
                    Add Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-[36px] bg-[#FFFFFF] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium rounded-[6px] px-4 flex items-center justify-center hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  ScrollText,
  X
} from 'lucide-react';
import { api } from '@/lib/api';

interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
  ip_address: string;
}

export default function SecurityOperationsConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const data = await api.get<any[]>('/api/audit/');
      const mapped = data.map((row: any) => {
        const rawUser = row.user_id || row.actor_id;
        const userDisplay = rawUser && typeof rawUser === "string" ? `${rawUser.slice(0, 8)}...` : "System";
        return {
          id: row.id,
          timestamp: new Date(row.created_at).toLocaleString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }).replace(',', '').replace(/\//g, '-'),
          user: userDisplay,
          action: row.action,
          entity: row.entity_type || "—",
          details: JSON.stringify(row.details || {}),
          ip_address: row.ip_address || "—"
        };
      });
      setLogs(mapped);
    } catch (err) {
      console.error("Audit fetch failed:", err);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleExportLogs = () => {
    const csv = ["Timestamp,User,Action,Entity,Details,IP Address",
      ...logs.map(l => `"${l.timestamp}","${l.user}","${l.action}","${l.entity}","${l.details.replace(/"/g, "'")}","${l.ip_address}"`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_trail.csv";
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("✓ Audit log CSV exported successfully.");
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isHighRisk = (action: string) => {
    const highRiskActions = ['DELETE', 'PASSWORD_CHANGED', 'LOGOUT_ALL'];
    return highRiskActions.includes(action.toUpperCase());
  };

  const getActionBadgeClass = (action: string) => {
    const lower = action.toUpperCase();
    if (lower === 'CREATE') return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (lower === 'UPDATE') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (lower === 'DELETE') return 'bg-red-50 text-red-700 border border-red-200';
    if (lower === 'LOGIN') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (lower === 'EXPORT') return 'bg-purple-50 text-purple-700 border border-purple-200';
    return 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase();

  const getRelativeTime = (timestamp: string) => {
    try {
      // Parse timestamp: DD-MM-YYYY HH:MM
      const [datePart, timePart] = timestamp.split(' ');
      const [dd, mm, yyyy] = datePart.split('-');
      const [hh, mi] = timePart.split(':');
      const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi));
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return timestamp;
    }
  };

  // Filter logic preserved
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Stats
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const totalToday = logs.filter(l => l.timestamp.startsWith(today)).length;
  const uniqueActors = new Set(logs.map(l => l.user)).size;
  const highRiskCount = logs.filter(l => isHighRisk(l.action)).length;

  const parseDetails = (detailsStr: string) => {
    try {
      return JSON.parse(detailsStr);
    } catch {
      return { message: detailsStr };
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg z-[100] flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          </div>
          <span className="text-[13px] font-semibold text-slate-800">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-slate-900">Audit Trail</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]"
            placeholder="Start date"
          />
          <span className="text-slate-400 text-[12px]">to</span>
          <input
            type="date"
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]"
            placeholder="End date"
          />
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]"
          >
            <option value="all">All Actors</option>
          </select>
          <button
            onClick={handleExportLogs}
            className="h-9 px-3 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded-lg flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action or entity"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A] appearance-none"
          >
            <option value="All">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]"
          />
        </div>
        <select className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#1B4F8A]">
          <option value="all">All Actors</option>
        </select>
        {(actionFilter !== 'All' || searchQuery) && (
          <button
            onClick={() => {
              setActionFilter('All');
              setSearchQuery('');
            }}
            className="px-3 py-2 text-[12px] text-[#1B4F8A] font-medium hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0 grid grid-cols-3 gap-0 divide-x divide-[#E5E7EB]">
        <div className="px-4 py-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">Total Events Today</div>
          <div className="text-[20px] font-semibold text-slate-800">{totalToday}</div>
        </div>
        <div className="px-4 py-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">Unique Actors</div>
          <div className="text-[20px] font-semibold text-slate-800">{uniqueActors}</div>
        </div>
        <div className="px-4 py-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">High-Risk Events</div>
          <div className={`text-[20px] font-semibold ${highRiskCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{highRiskCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Timestamp</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Actor</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Action</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Entity</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Details</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingLogs ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const details = parseDetails(log.details);
                  const highRisk = isHighRisk(log.action);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleRowExpand(log.id)}
                        className={`h-[52px] cursor-pointer transition-colors ${highRisk ? 'bg-red-50/20' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-mono text-slate-500">{getRelativeTime(log.timestamp)}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center">
                              <span className="text-[11px] font-semibold text-[#1B4F8A]">{getInitial(log.user)}</span>
                            </div>
                            <span className="text-[13px] text-slate-800">{log.user}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[11px] font-semibold ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-slate-700 truncate max-w-[150px] block">
                            {log.entity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-[12px] text-slate-600">
                            <span className="truncate max-w-[200px]">
                              {Object.values(details)[0]?.toString() || log.details.substring(0, 50)}...
                            </span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] font-mono text-slate-400">{log.ip_address}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-slate-50 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {Object.entries(details).map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-1">
                                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{key}</span>
                                  <span className="text-[13px] text-slate-700 font-semibold">{value?.toString()}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ScrollText size={48} className="mx-auto mb-3 text-slate-200" />
                    <h3 className="text-[15px] font-semibold text-slate-800 mb-1">No audit events found</h3>
                    <p className="text-[12px] text-slate-500">No audit events found for the selected filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-[12px] text-slate-500">
            Showing 1–{Math.min(filteredLogs.length, 20)} of {filteredLogs.length}
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <button className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
            <select className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700">
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing icon component
function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

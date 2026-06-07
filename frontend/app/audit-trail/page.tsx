"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass } from '@/lib/badgeHelper';
import { api } from '@/lib/api';
import { 
  ClipboardList, 
  Search, 
  Download, 
  X,
  CheckCircle,
  Clock,
  Filter,
  Shield,
  ChevronDown
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
  ip_address: string;
}

/** Parse "DD-MM-YYYY HH:MM" → { dateLabel, timeLabel } */
function parseTimestamp(raw: string): { dateLabel: string; timeLabel: string } {
  const [datePart, timePart] = raw.split(' ');
  if (!datePart || !timePart) return { dateLabel: raw, timeLabel: '' };
  const [dd, mm, yyyy] = datePart.split('-');
  const monthNames: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  };
  const monthName = monthNames[mm] || mm;
  return {
    dateLabel: `${dd} ${monthName} ${yyyy}`,
    timeLabel: timePart,
  };
}

/** Get uppercase initial for avatar */
function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const data = await api.get<any[]>('/api/audit/');
      // Map Supabase audit_logs fields to LogEntry format
      const mapped = data.map((row: any) => {
        const rawUser = row.user_id || row.actor_id;
        const userDisplay =
          rawUser && typeof rawUser === "string"
            ? `${rawUser.slice(0, 8)}...`
            : "System";

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
  
  useEffect(() => {
    fetchLogs();
  }, []);

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

  const getActionBadgeStyle = (action: string) => {
    return getUnifiedBadgeClass(action);
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

  // Filter logic — unchanged
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const activeFilterCount = (actionFilter !== 'All' ? 1 : 0);

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 relative">

      {/* ── Audit Trail Row Detail CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .audit-detail-row {
          max-height: 0;
          overflow: hidden;
          transition: max-height 320ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .audit-detail-row.expanded {
          max-height: 120px;
        }
        .audit-row-chevron {
          transition: transform 220ms ease;
          color: var(--color-text-tertiary);
          flex-shrink: 0;
        }
        .audit-row-chevron.open {
          transform: rotate(180deg);
        }
        .audit-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-accent-soft);
          color: var(--color-primary-light);
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          letter-spacing: 0;
        }
        .audit-timestamp-primary {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-primary);
          line-height: 1.3;
        }
        .audit-timestamp-secondary {
          font-size: 12px;
          color: var(--color-text-tertiary);
          line-height: 1.3;
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
        }
        .audit-ip {
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .audit-entity {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .audit-desc-cell {
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .audit-detail-inner {
          padding: 12px 16px 14px 16px;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .audit-detail-desc {
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.6;
          white-space: normal;
        }
        .audit-detail-hash {
          font-size: 12px;
          color: var(--color-text-tertiary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .audit-detail-hash-val {
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
          font-size: 12px;
          color: var(--color-text-tertiary);
        }
        .filter-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 18px;
          min-width: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: var(--color-primary-light);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          margin-left: 4px;
        }
        .audit-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 24px;
          gap: 12px;
        }
        .audit-empty-icon {
          color: var(--color-text-tertiary);
          margin-bottom: 4px;
        }
        .audit-empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .audit-empty-sub {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }
      `}} />

      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 px-6 py-4 rounded-[20px] shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <CheckCircle className="text-[#10B981] flex-shrink-0" size={18} />
          <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{toastMsg}</span>
        </div>
      )}

      {/* ── 1. PAGE HEADER — Phase 3 pattern ── */}
      <PageHeader
        sectionLabel="Security & Operations"
        title="Audit Trail"
        description="Immutable security logging and cryptographic activity records for auditing."
        actions={
          <button
            id="btn-export-logs"
            onClick={handleExportLogs}
            className="btn btn-md btn-secondary"
          >
            <Download size={16} />
            <span>Export Logs</span>
          </button>
        }
      />

      {/* ── 2. INFO BANNER — Phase 5 standard card, max-width 800px ── */}
      <div className="std-card flex gap-5 items-start" style={{ maxWidth: 800 }}>
        {/* 48×48 circle icon */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--color-accent-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ClipboardList size={22} style={{ color: 'var(--color-primary-light)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
            Cryptographic Log Integrity
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Every user action, excel report download, GSTR matching run, and pipeline execution is cryptographically logged to establish a tamper-proof activity ledger. This system conforms to standard ICAI audit mandates and enterprise SaaS compliance metrics for Chartered Accountants in India.
          </p>
        </div>
      </div>

      {/* ── 3. SEARCH + FILTER ROW ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {/* Phase 8 Search bar — flex 1, max-width 600px */}
        <div className="relative group" style={{ flex: 1, maxWidth: 600, minWidth: 200 }}>
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-[var(--color-primary-light)] transition-colors" />
          </div>
          <input
            id="input-search-logs"
            type="text"
            placeholder="Search action logs, target profiles, audit hashes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 40, width: '100%' }}
          />
        </div>

        {/* Right side: filter select + filter count badge + labeled filter button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Action filter select */}
          <div className="relative">
            <select
              id="select-action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="form-select filter-select-sm"
              style={{ paddingLeft: 14, minWidth: 170 }}
            >
              <option value="All">All Audit Events</option>
              <option value="RECONCILE">AI Recon Runs</option>
              <option value="CREATE">Client Registrations</option>
              <option value="UPDATE">Client Updates</option>
              <option value="DELETE">Record Deletions</option>
              <option value="EXPORT">Ledger Exports</option>
              <option value="LOGIN">Auth Events</option>
            </select>
          </div>

          {/* Labeled Filter button with active count badge */}
          <button
            id="btn-filter-toggle"
            onClick={() => {/* filter panel toggle – hook preserved */}}
            className="btn btn-md btn-secondary"
          >
            <Filter size={16} />
            <span>Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 4 & 5. TABLE — Phase 7 styles + expand-on-click rows ── */}
      <div className="data-table-shell shadow-fintech-lg">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User Profile</th>
                <th>Action Code</th>
                <th>Entity Target</th>
                <th style={{ maxWidth: 400 }}>Detailed Event Description</th>
                <th className="num-col">IP Address</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoadingLogs ? (
                <tr><td colSpan={7} className="text-center py-12 text-secondary text-xs font-bold">Loading audit logs...</td></tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const { dateLabel, timeLabel } = parseTimestamp(log.timestamp);
                  const isExpanded = expandedRows.has(log.id);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        id={`row-${log.id}`}
                        onClick={() => toggleRowExpand(log.id)}
                        className={`data-table-row-clickable ${isExpanded ? 'selected' : ''}`}
                      >
                        {/* ── Timestamp: two-line ── */}
                        <td>
                          <div className="audit-timestamp-primary">{dateLabel}</div>
                          <div className="audit-timestamp-secondary">{timeLabel}</div>
                        </td>

                        {/* ── User Profile: avatar + name, or em dash ── */}
                        <td>
                          {log.user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="audit-avatar">{getInitial(log.user)}</span>
                              <span style={{ fontWeight: 500 }}>
                                {log.user}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)', display: 'block', textAlign: 'center' }}>—</span>
                          )}
                        </td>

                        {/* ── Action Code ── */}
                        <td>
                          <span className={`status-badge status-badge-action ${getActionBadgeStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* ── Entity Target ── */}
                        <td>
                          <span className="audit-entity">{log.entity}</span>
                        </td>

                        {/* ── Detailed Description ── */}
                        <td>
                          <span
                            className="audit-desc-cell"
                            title={log.details}
                          >
                            {log.details}
                          </span>
                        </td>

                        {/* ── IP Address ── */}
                        <td className="num-col">
                          <span>{log.ip_address}</span>
                        </td>

                        {/* ── Chevron toggle ── */}
                        <td className="text-right">
                          <button className="action-btn" aria-label="Toggle Log details">
                            <ChevronDown
                              id={`chevron-${log.id}`}
                              className={`audit-row-chevron${isExpanded ? ' open' : ''}`}
                            />
                          </button>
                        </td>
                      </tr>

                      {/* ── 5. Expanded detail row ── */}
                      <tr className={isExpanded ? 'selected' : ''}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className={`audit-detail-row${isExpanded ? ' expanded' : ''}`}>
                            <div className="audit-detail-inner">
                              <p className="audit-detail-desc">{log.details}</p>
                              <div className="audit-detail-hash">
                                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Audit Hash:</span>
                                <span className="audit-detail-hash-val">—</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                /* ── 6. EMPTY STATE ── */
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Shield size={20} className="text-[#D1D5DB]" />
                      <span className="text-[13px] text-[#6B7280]">No records found</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Detail Inspector Modal (existing — preserved exactly) ── */}
      {selectedLog && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 p-8 flex flex-col gap-6 relative shadow-fintech-lg animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setSelectedLog(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:border-slate-200 flex items-center justify-center"
            >
              <X size={16} />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-white tracking-tight">
                    Audit Log Inspector
                  </h3>
                  <p className="text-[12.5px] text-slate-400 mt-0.5">ICAI Cryptographic Compliance Ledger Record.</p>
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-4 font-sans text-[13.5px] text-white">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-slate-400">Timestamp</span>
                <span className="font-mono text-slate-500">{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-400">Authorized Profile</span>
                <span className="font-bold text-white">{selectedLog.user}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-400">Operation Code</span>
                <span className={`status-badge status-badge-action ${getActionBadgeStyle(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-400">Target Entity</span>
                <span className="font-bold text-white">{selectedLog.entity}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-400">Client IP Address</span>
                <span className="font-mono text-slate-500">{selectedLog.ip_address}</span>
              </div>
              
              <div className="pt-3 flex flex-col gap-2">
                <span className="text-slate-400 text-[11px] uppercase tracking-widest font-bold">Ledger Event Summary</span>
                <div className="text-[14px] leading-relaxed text-gray-200 bg-white p-4 rounded-xl border border-slate-200 italic">
                  &quot;{selectedLog.details}&quot;
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1B4F8A] hover:opacity-90 transition-all text-[13px] font-bold text-white shadow-lg cursor-pointer"
              >
                Close Audit Entry
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

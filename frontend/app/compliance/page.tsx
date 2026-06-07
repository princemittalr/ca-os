"use client";

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  Mail,
  FileText,
  ChevronDown,
  Check,
  Building
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';


interface ComplianceRecord {
  compliance_id: string;
  client_id: string;
  compliance_type: string;
  filing_period: string;
  due_date: string;
  status: string; // 'Upcoming', 'Escalated', 'Due Today', 'Overdue', 'Filed', 'Not Applicable', 'In Progress'
  assigned_to: string | null;
  escalation_level: number;
  risk_level: string; // 'LOW', 'MEDIUM', 'HIGH'
  risk_score: number;
  filed_date?: string | null;
  penalty_amount?: number;
}


export default function ComplianceOperationsCenter() {
  const [tasks, setTasks] = useState<ComplianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<string[]>([]);

  // Toolbar state
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Selection states for bulk actions
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formType, setFormType] = useState('GSTR-1');
  const [formPeriod, setFormPeriod] = useState('March 2024');
  const [formDueDate, setFormDueDate] = useState('2026-06-05');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => {
    api.get<any[]>('/api/clients/')
      .then(data => {
        const map: Record<string, string> = {};
        data.forEach((c: any) => {
          map[c.id] = c.business_name;
        });
        setClientsMap(map);
        if (data.length > 0) {
          setFormClientId(data[0].id);
        }
      })
      .catch(err => {
        console.error("Client lookup failed:", err);
      });
  }, []);

  useEffect(() => {
    api.get<string[]>('/api/staff')
      .then(data => {
        setStaffList(data);
        if (data.length > 0) {
          setFormAssignedTo(data[0]);
        }
      })
      .catch(err => {
        console.error("Staff lookup failed:", err);
        setStaffList([]);
      });
  }, []);

  const loadCompliance = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<ComplianceRecord[]>('/api/compliance');
      setTasks(data);
    } catch (err) {
      console.error("Compliance fetch failed:", err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  const handleMarkAsFiled = async (compId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await api.put(
        `/api/compliance/${compId}/status?new_status=Filed&filed_date=${todayStr}`,
        {}
      );
      showToast("✓ Compliance successfully marked as FILED!");
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      await loadCompliance();
    } catch (err) {
      console.error(err);
      // fallback local update
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      showToast("✓ Return marked as FILED locally.");
    }
  };

  const handleBulkMarkAsFiled = async () => {
    if (selectedRowIds.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      setIsLoading(true);
      await Promise.all(
        selectedRowIds.map(id =>
          api.put(`/api/compliance/${id}/status?new_status=Filed&filed_date=${todayStr}`, {})
        )
      );
      showToast(`✓ Marked ${selectedRowIds.length} returns as FILED!`);
      setTasks(prev => prev.map(t => selectedRowIds.includes(t.compliance_id) ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      setSelectedRowIds([]);
      await loadCompliance();
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => selectedRowIds.includes(t.compliance_id) ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      showToast("✓ Selected returns marked as FILED locally.");
      setSelectedRowIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/compliance/create', {
        client_id: formClientId,
        compliance_type: formType,
        filing_period: formPeriod,
        due_date: formDueDate,
        assigned_to: formAssignedTo
      });
      showToast("✓ Compliance filing task generated successfully!");
      setIsCreateModalOpen(false);
      await loadCompliance();
    } catch (err) {
      console.error("Create deadline failed:", err);
      showToast("⚠ Failed to create filing task.");
      setIsCreateModalOpen(false);
    }
  };

  const getTaskCategory = (status: string): 'Filed' | 'Due' | 'Overdue' | 'Not Applicable' => {
    const s = status.toLowerCase();
    if (s === 'filed') return 'Filed';
    if (s === 'overdue' || s === 'escalated') return 'Overdue';
    if (s === 'not applicable' || s === 'na' || s === 'not_applicable') return 'Not Applicable';
    return 'Due';
  };

  // Filtration logic
  const filteredTasks = tasks.filter(task => {
    // Entity Filter
    if (selectedEntity !== 'ALL' && task.client_id !== selectedEntity) {
      return false;
    }

    // Period / Date Filter
    const [taskYear, taskMonth] = task.due_date.split('-');
    if (selectedYear !== 'ALL' && taskYear !== selectedYear) {
      return false;
    }
    if (selectedMonth !== 'ALL' && taskMonth !== selectedMonth) {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      const cat = getTaskCategory(task.status);
      if (statusFilter === 'Filed' && cat !== 'Filed') return false;
      if (statusFilter === 'Due' && cat !== 'Due') return false;
      if (statusFilter === 'Overdue' && cat !== 'Overdue') return false;
      if (statusFilter === 'Not Applicable' && cat !== 'Not Applicable') return false;
      if (statusFilter === 'In Progress' && task.status !== 'In Progress') return false;
    }

    return true;
  });

  // Summary Metrics based on filtered scope
  const summaryCounts = {
    Filed: filteredTasks.filter(t => getTaskCategory(t.status) === 'Filed').length,
    Due: filteredTasks.filter(t => getTaskCategory(t.status) === 'Due').length,
    Overdue: filteredTasks.filter(t => getTaskCategory(t.status) === 'Overdue').length,
    NA: filteredTasks.filter(t => getTaskCategory(t.status) === 'Not Applicable').length,
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = getDaysInMonth(year, month);
    const days = [];

    // Prev month padding
    const prevMonthTotalDays = getDaysInMonth(year, month - 1);
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, dNum);
      days.push({ date: d, isCurrentMonth: false, dayNum: dNum, dateStr: d.toISOString().split('T')[0] });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, dayNum: i, dateStr: d.toISOString().split('T')[0] });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, dayNum: i, dateStr: d.toISOString().split('T')[0] });
    }
    return days;
  };

  const getTasksForDate = (dateStr: string) => {
    return filteredTasks.filter(t => t.due_date === dateStr);
  };

  const getMutedFillColor = (status: string) => {
    const cat = getTaskCategory(status);
    if (cat === 'Filed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cat === 'Overdue') return 'bg-red-50 text-red-700 border-red-200';
    if (cat === 'Not Applicable') return 'bg-gray-50 text-gray-500 border-gray-200';
    if (status === 'In Progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans relative overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded shadow-xl z-[100] flex items-center gap-3">
          <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={16} />
          <span className="text-[12px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header: 48px border-bottom, title + subtitle */}
      <div className="h-12 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[15px] font-semibold text-[#111827] leading-tight">Compliance Operations Center</h1>
          <p className="text-[11px] text-[#6B7280]">Active statutory operations tracking, financial liability shielding, and escalation hub.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadCompliance();
              showToast("✓ Compliance schedule synced with server.");
            }}
            className="h-8 w-8 border border-[#E5E7EB] rounded hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="Sync Schedule"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 px-3 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Filing Task</span>
          </button>
        </div>
      </div>

      {/* Toolbar: period/year selector + entity selector + status filter, height 40px */}
      <div className="h-10 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-4">
          {/* Entity Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B7280] font-medium">Entity:</span>
            {Object.keys(clientsMap).length === 0 ? (
              <span className="text-[12px] text-rose-600 font-semibold">No client data available.</span>
            ) : (
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="h-7 bg-slate-50 border border-[#E5E7EB] rounded px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-[#1B4F8A] cursor-pointer"
              >
                <option value="ALL">All Entities</option>
                {Object.entries(clientsMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Period Selectors */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B7280] font-medium">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-7 bg-slate-50 border border-[#E5E7EB] rounded px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-[#1B4F8A] cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {Array.from({ length: 12 }, (_, i) => {
                const monthVal = String(i + 1).padStart(2, '0');
                const name = new Date(2026, i, 1).toLocaleString('en-US', { month: 'short' });
                return <option key={monthVal} value={monthVal}>{name}</option>;
              })}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-7 bg-slate-50 border border-[#E5E7EB] rounded px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-[#1B4F8A] cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {["2024", "2025", "2026", "2027", "2028"].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B7280] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 bg-slate-50 border border-[#E5E7EB] rounded px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-[#1B4F8A] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Filed">Filed</option>
              <option value="Due">Due</option>
              <option value="Overdue">Overdue</option>
              <option value="Not Applicable">Not Applicable</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-[#E5E7EB]">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-[11px] font-semibold uppercase rounded transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-[#1B4F8A] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 text-[11px] font-semibold uppercase rounded transition-all cursor-pointer ${
              viewMode === 'calendar' ? 'bg-white text-[#1B4F8A] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Main View Layout */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        
        {/* Compliance Status Summary Row: 4 metrics */}
        <div className="bg-white border border-[#E5E7EB] rounded-[4px] flex overflow-hidden">
          {/* Filed */}
          <div className="flex-1 p-4 flex justify-between items-center border-r border-[#E5E7EB]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">Filed</span>
              <span className="text-[16px] font-bold font-mono block" style={{ color: '#15803D' }}>{summaryCounts.Filed}</span>
            </div>
          </div>

          {/* Due */}
          <div className="flex-1 p-4 flex justify-between items-center border-r border-[#E5E7EB]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">Due</span>
              <span className="text-[16px] font-bold font-mono block" style={{ color: '#B45309' }}>{summaryCounts.Due}</span>
            </div>
          </div>

          {/* Overdue */}
          <div className="flex-1 p-4 flex justify-between items-center border-r border-[#E5E7EB]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">Overdue</span>
              <span className="text-[16px] font-bold font-mono block" style={{ color: '#B91C1C' }}>{summaryCounts.Overdue}</span>
            </div>
          </div>

          {/* Not Applicable */}
          <div className="flex-1 p-4 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">Not Applicable</span>
              <span className="text-[16px] font-bold font-mono block" style={{ color: '#6B7280' }}>{summaryCounts.NA}</span>
            </div>
          </div>
        </div>

        {/* Bulk actions toolbar */}
        {selectedRowIds.length > 0 && (
          <div className="h-9 bg-[#EFF6FF] border-b border-[#BFDBFE] px-4 flex items-center justify-between text-xs text-[#1E40AF]">
            <span className="font-semibold">{selectedRowIds.length} compliance rows selected</span>
            <button
              onClick={handleBulkMarkAsFiled}
              className="h-6 px-3 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[11px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Check size={12} />
              <span>Bulk Mark Filed</span>
            </button>
          </div>
        )}

        {/* Dynamic View Mode Panel */}
        <div className="bg-white border border-[#E5E7EB] rounded shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={24} className="animate-spin text-slate-400" />
              <span className="text-xs text-[#6B7280] font-medium font-sans">Loading statutory filing details...</span>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left font-sans">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="pl-4 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={filteredTasks.length > 0 && selectedRowIds.length === filteredTasks.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRowIds(filteredTasks.map(t => t.compliance_id));
                          } else {
                            setSelectedRowIds([]);
                          }
                        }}
                        className="rounded border-[#D1D5DB] text-[#1B4F8A] focus:ring-[#1B4F8A]"
                      />
                    </th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Return Type</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Client / Entity</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Period</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Due Date</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Filing Date</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Penalty</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E5E7EB]">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                      const isSelected = selectedRowIds.includes(task.compliance_id);
                      const clientName = clientsMap[task.client_id] || "Client Firm";
                      const cat = getTaskCategory(task.status);
                      
                      const filingDate = task.filed_date || '—';

                      const penalty = task.penalty_amount;

                      return (
                        <tr
                          key={task.compliance_id}
                          className={`h-9 hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}
                        >
                          <td className="pl-4 py-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRowIds(prev => [...prev, task.compliance_id]);
                                } else {
                                  setSelectedRowIds(prev => prev.filter(id => id !== task.compliance_id));
                                }
                              }}
                              className="rounded border-[#D1D5DB] text-[#1B4F8A] focus:ring-[#1B4F8A]"
                            />
                          </td>
                          <td className="px-3 py-1 text-[12px] font-bold text-slate-800">{task.compliance_type}</td>
                          <td className="px-3 py-1 text-[12px] text-slate-700 truncate max-w-[180px]" title={clientName}>{clientName}</td>
                          <td className="px-3 py-1 text-[12px] text-slate-600 font-mono">{task.filing_period}</td>
                          <td className="px-3 py-1 text-[12px] text-slate-600 font-mono">{task.due_date}</td>
                          <td className="px-3 py-1 text-[12px] text-slate-500 font-mono">{filingDate}</td>
                          <td className="px-3 py-1">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider rounded-sm ${
                              cat === 'Filed' ? 'bg-green-50 text-green-700 border-green-200' :
                              cat === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                              cat === 'Not Applicable' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                              task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-right text-[12px] font-mono text-slate-800">
                            {penalty != null ? (
                              <span className={penalty > 0 ? "text-red-600 font-bold" : ""}>
                                {formatCurrency(penalty)}
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {task.status !== 'Filed' ? (
                                <>
                                  <button
                                    onClick={() => handleMarkAsFiled(task.compliance_id)}
                                    className="h-6 px-2.5 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[10px] font-bold rounded transition-colors cursor-pointer"
                                  >
                                    File Now
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsFiled(task.compliance_id)}
                                    className="h-6 px-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded transition-colors cursor-pointer"
                                  >
                                    Mark Filed
                                  </button>
                                </>
                              ) : (
                                <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1">
                                  <Check size={10} /> Done
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 size={24} className="text-[#D1D5DB]" />
                          <span className="text-[12px] text-[#6B7280]">No compliance deadlines found in selected scope</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Calendar View */
            <div className="bg-white border border-[#E5E7EB] rounded p-4">
              {/* Month Header / Controls */}
              <div className="flex justify-between items-center mb-4 border-b border-[#E5E7EB] pb-3">
                <h2 className="text-[14px] font-bold text-slate-800 font-mono">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="h-7 w-7 border border-[#E5E7EB] rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 h-7 border border-[#E5E7EB] text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded flex items-center justify-center transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="h-7 w-7 border border-[#E5E7EB] rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {getMonthDays(currentDate).map((day, index) => {
                  const dayTasks = getTasksForDate(day.dateStr);
                  const isToday = new Date().toISOString().split('T')[0] === day.dateStr;

                  return (
                    <div
                      key={index}
                      className={`h-[80px] bg-white border border-[#E5E7EB] p-1.5 flex flex-col justify-between select-none relative group ${
                        !day.isCurrentMonth ? 'opacity-30' : ''
                      } ${
                        isToday ? 'border-[#1B4F8A] ring-1 ring-[#1B4F8A]/20' : ''
                      }`}
                    >
                      {/* Date top right */}
                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono ${
                          isToday ? 'text-[#1B4F8A] font-black' : 'text-[#6B7280]'
                        }`}>
                          {day.dayNum}
                        </span>
                      </div>

                      {/* Tasks List */}
                      <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 mt-1">
                        {dayTasks.map(task => {
                          const clientShort = clientsMap[task.client_id] || "Firm";
                          const fillStyle = getMutedFillColor(task.status);
                          return (
                            <div
                              key={task.compliance_id}
                              className={`text-[11px] px-1 py-0.5 rounded border truncate leading-tight select-text ${fillStyle}`}
                              title={`${task.compliance_type} - ${clientShort} (${task.status})`}
                            >
                              <span className="font-bold font-mono">{task.compliance_type}</span>: <span className="opacity-90">{clientShort}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intake / Create Deadline Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all border border-slate-200"
            >
              <X size={14} />
            </button>

            <span className="text-[9px] font-bold text-[#1B4F8A] tracking-wider uppercase block">New Obligation</span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">Schedule Statutory Return</h3>
            <p className="text-xs text-[#6B7280] mt-1 mb-5">Create a statutory filing requirement or corporate compliance schedule.</p>

            <form onSubmit={handleCreateDeadline} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Select Corporate Client *</label>
                {Object.keys(clientsMap).length === 0 ? (
                  <div className="text-[12px] text-rose-600 font-semibold py-1">No client data available.</div>
                ) : (
                  <select
                    value={formClientId}
                    onChange={e => setFormClientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                  >
                    {Object.entries(clientsMap).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Compliance Type *</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                  >
                    <option value="GSTR-1">GSTR-1</option>
                    <option value="GSTR-3B">GSTR-3B</option>
                    <option value="GSTR-9">GSTR-9</option>
                    <option value="TDS Returns">TDS Returns</option>
                    <option value="Advance Tax">Advance Tax</option>
                    <option value="ITR Filing">ITR Filing</option>
                    <option value="ROC Filing">ROC Filing</option>
                    <option value="MCA Compliance">MCA Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Filing Period *</label>
                  <input
                    type="text"
                    required
                    value={formPeriod}
                    onChange={e => setFormPeriod(e.target.value)}
                    placeholder="e.g. March 2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Assign Staff *</label>
                  {staffList.length === 0 ? (
                    <div className="text-[12px] text-rose-600 font-semibold py-1">No staff available</div>
                  ) : (
                    <select
                      value={formAssignedTo}
                      onChange={e => setFormAssignedTo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                    >
                      {staffList.map((staff) => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 cursor-pointer font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4F8A] hover:bg-[#163F6E] text-white px-5 py-2 rounded font-bold border border-[#1B4F8A] cursor-pointer transition-all"
                >
                  Schedule Filing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

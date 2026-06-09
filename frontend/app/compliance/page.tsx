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
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';


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
  const { showToast, ToastComponent } = useToast();
  const [tasks, setTasks] = useState<ComplianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<string[]>([]);

  // New state for redesign
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'dueToday' | 'upcoming' | 'filed'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formType, setFormType] = useState('GSTR-1');
  const [formPeriod, setFormPeriod] = useState('March 2024');
  const [formDueDate, setFormDueDate] = useState('2026-06-05');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

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
      showToast("Compliance successfully marked as FILED!", "success");
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      await loadCompliance();
    } catch (err) {
      console.error(err);
      // fallback local update
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, status: 'Filed', filed_date: todayStr, risk_score: 0, risk_level: 'LOW' } : t));
      showToast("Return marked as FILED locally.", "success");
    }
  };

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      await api.post('/api/compliance/create', {
        client_id: formClientId,
        compliance_type: formType,
        filing_period: formPeriod,
        due_date: formDueDate,
        assigned_to: formAssignedTo
      });
      showToast("Compliance filing task generated successfully!", "success");
      setIsCreateModalOpen(false);
      await loadCompliance();
    } catch (err: any) {
      console.error("Create deadline failed:", err);
      setFormError(err.message || 'Failed to create filing task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskCategory = (status: string): 'Filed' | 'Due' | 'Overdue' | 'Not Applicable' => {
    const s = status.toLowerCase();
    if (s === 'filed') return 'Filed';
    if (s === 'overdue' || s === 'escalated') return 'Overdue';
    if (s === 'not applicable' || s === 'na' || s === 'not_applicable') return 'Not Applicable';
    return 'Due';
  };

  // Calculate days difference for statuses
  const calculateDaysInfo = (dueDateStr: string, status: string, filedDateStr?: string | null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let displayStatus = status;
    let statusVariant: 'high' | 'medium' | 'low' | 'default' = 'default';
    let statusText = '';

    if (status.toLowerCase() === 'filed' && filedDateStr) {
      displayStatus = 'Filed';
      statusVariant = 'low';
      statusText = `Filed on ${filedDateStr}`;
    } else if (diffDays < 0) {
      displayStatus = 'Overdue';
      statusVariant = 'high';
      statusText = `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      displayStatus = 'Due Today';
      statusVariant = 'medium';
      statusText = 'Due Today';
    } else {
      displayStatus = 'Upcoming';
      statusVariant = 'default';
      statusText = `${diffDays} days remaining`;
    }

    return { displayStatus, statusVariant, statusText, diffDays };
  };

  // Filtration logic for the new design
  const filteredTasks = tasks.filter(task => {
    const { displayStatus } = calculateDaysInfo(task.due_date, task.status, task.filed_date);

    if (selectedDate) {
      return task.due_date === selectedDate;
    }

    if (activeTab === 'overdue') return displayStatus === 'Overdue';
    if (activeTab === 'dueToday') return displayStatus === 'Due Today';
    if (activeTab === 'upcoming') return displayStatus === 'Upcoming';
    if (activeTab === 'filed') return displayStatus === 'Filed';
    
    return true;
  }).sort((a, b) => {
    const aDiff = calculateDaysInfo(a.due_date, a.status, a.filed_date).diffDays;
    const bDiff = calculateDaysInfo(b.due_date, b.status, b.filed_date).diffDays;
    return aDiff - bDiff;
  });

  // Summary Metrics for new design
  const summaryCounts = {
    overdue: filteredTasks.filter(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Overdue').length,
    dueToday: filteredTasks.filter(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Due Today').length,
    upcoming: filteredTasks.filter(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Upcoming').length,
    filed: filteredTasks.filter(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Filed').length
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

  const getDateDotClass = (dateStr: string) => {
    const dayTasks = tasks.filter(t => t.due_date === dateStr);
    if (dayTasks.length === 0) return '';
    
    const hasOverdue = dayTasks.some(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Overdue');
    const hasDueToday = dayTasks.some(t => calculateDaysInfo(t.due_date, t.status, t.filed_date).displayStatus === 'Due Today');
    
    if (hasOverdue) return 'bg-red-500';
    if (hasDueToday) return 'bg-amber-500';
    return 'bg-blue-500';
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

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans relative overflow-hidden">
      {/* Toast */}
      {ToastComponent}

      {/* Header: 48px border-bottom, title + right side */}
      <div className="h-12 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0">
        <h1 className="text-[16px] font-semibold text-[#111827]">Compliance Center</h1>
        
        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1 text-[11px] font-semibold uppercase rounded transition-colors ${
                  periodFilter === p ? 'bg-white text-[#1B4F8A] shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Filing
          </button>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0">
        <div className="grid grid-cols-4 gap-0 divide-x divide-[#E5E7EB]">
          {/* Overdue */}
          <div className="px-4 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">
              Overdue
            </div>
            <div className="text-[24px] font-bold text-red-600">
              {summaryCounts.overdue}
            </div>
          </div>
          {/* Due Today */}
          <div className="px-4 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">
              Due Today
            </div>
            <div className="text-[20px] font-bold text-amber-600">
              {summaryCounts.dueToday}
            </div>
          </div>
          {/* Upcoming */}
          <div className="px-4 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">
              Upcoming
            </div>
            <div className="text-[20px] font-bold text-slate-700">
              {summaryCounts.upcoming}
            </div>
          </div>
          {/* Filed This Month */}
          <div className="px-4 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-1">
              Filed This Month
            </div>
            <div className="text-[20px] font-bold text-emerald-600">
              {summaryCounts.filed}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout with 70/30 split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: 70% - Filing Table */}
        <div className="flex-[7] flex flex-col border-r border-[#E5E7EB] overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b border-[#E5E7EB] px-6 shrink-0">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All', count: filteredTasks.length },
                { id: 'overdue', label: 'Overdue', count: summaryCounts.overdue },
                { id: 'dueToday', label: 'Due Today', count: summaryCounts.dueToday },
                { id: 'upcoming', label: 'Upcoming', count: summaryCounts.upcoming },
                { id: 'filed', label: 'Filed', count: summaryCounts.filed }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-[#1B4F8A] text-[#1B4F8A]'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                <SkeletonTable rows={6} />
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Client</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Period</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Due Date</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned To</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map(task => {
                      const clientName = clientsMap[task.client_id] || "Client Firm";
                      const { displayStatus, statusVariant, statusText, diffDays } = calculateDaysInfo(task.due_date, task.status, task.filed_date);
                      const isOverdue = displayStatus === 'Overdue';

                      return (
                        <tr
                          key={task.compliance_id}
                          className={`h-[52px] hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="px-6 py-3 text-[12px] font-semibold text-slate-800">{clientName}</td>
                          <td className="px-6 py-3 text-[12px] text-slate-700">{task.compliance_type}</td>
                          <td className="px-6 py-3 text-[12px] text-slate-600">{task.filing_period}</td>
                          <td className={`px-6 py-3 text-[12px] font-mono ${isOverdue ? 'text-red-700 font-bold' : 'text-slate-600'}`}>{task.due_date}</td>
                          <td className="px-6 py-3">
                            <Badge variant={statusVariant}>{statusText}</Badge>
                          </td>
                          <td className="px-6 py-3 text-[12px] text-slate-700">{task.assigned_to || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {displayStatus !== 'Filed' && (
                                <>
                                  <button className="text-[11px] text-[#1B4F8A] hover:underline font-medium">View Details</button>
                                  <button
                                    onClick={() => handleMarkAsFiled(task.compliance_id)}
                                    className="text-[11px] text-emerald-600 hover:underline font-medium"
                                  >
                                    Mark Filed
                                  </button>
                                </>
                              )}
                              {displayStatus === 'Filed' && (
                                <span className="text-emerald-600 font-bold text-[11px]">✓ Filed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
                <Building size={64} className="text-slate-200" />
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-slate-800 mb-1">No compliance tasks found</h3>
                  <p className="text-[12px] text-slate-500 mb-4">Add your first filing to begin tracking compliance.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-9 px-4 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded flex items-center gap-1.5 mx-auto"
                  >
                    <Plus size={14} />
                    Add Filing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 30% - Calendar */}
        <div className="flex-[3] bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#E5E7EB]">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[14px] font-bold text-slate-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="h-7 w-7 border border-[#E5E7EB] rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 h-7 border border-[#E5E7EB] text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded flex items-center justify-center transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="h-7 w-7 border border-[#E5E7EB] rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {getMonthDays(currentDate).map((day, index) => {
                const dayTasks = getTasksForDate(day.dateStr);
                const isToday = new Date().toISOString().split('T')[0] === day.dateStr;
                const dotClass = getDateDotClass(day.dateStr);
                const isSelected = selectedDate === day.dateStr;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : day.dateStr);
                    }}
                    className={`h-[56px] bg-white border border-[#E5E7EB] rounded-lg p-1.5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      !day.isCurrentMonth ? 'opacity-30' : ''
                    } ${isToday ? 'border-[#1B4F8A]' : ''} ${isSelected ? 'bg-[#EFF6FF] border-[#1B4F8A]' : ''} hover:bg-slate-50`}
                  >
                    <span className={`text-[11px] font-bold font-mono ${isToday ? 'text-[#1B4F8A]' : 'text-slate-600'}`}>
                      {day.dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${dotClass}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Filing Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all"
            >
              <X size={14} />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-5">Add New Filing</h3>

            <form onSubmit={handleCreateDeadline} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Client</label>
                {Object.keys(clientsMap).length === 0 ? (
                  <div className="text-[12px] text-rose-600 font-semibold py-1">No client data available</div>
                ) : (
                  <select
                    value={formClientId}
                    onChange={e => setFormClientId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                  >
                    {Object.entries(clientsMap).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Period</label>
                  <input
                    type="text"
                    required
                    value={formPeriod}
                    onChange={e => setFormPeriod(e.target.value)}
                    placeholder="e.g. March 2024"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Assign To</label>
                  {staffList.length === 0 ? (
                    <div className="text-[12px] text-rose-600 font-semibold py-1">No staff available</div>
                  ) : (
                    <select
                      value={formAssignedTo}
                      onChange={e => setFormAssignedTo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#1B4F8A] font-medium"
                    >
                      {staffList.map((staff) => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1B4F8A] hover:bg-[#163F6E] text-white px-5 py-2 rounded-lg font-bold"
                >
                  Add Filing
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[12px] mt-4">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

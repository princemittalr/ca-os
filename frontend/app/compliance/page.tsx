"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import {
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  Plus,
  RefreshCw,
  User,
  Filter,
  AlertTriangle,
  Mail,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  CheckSquare,
  ShieldAlert,
  Sparkles,
  FileWarning
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


interface ComplianceRecord {
  compliance_id: string;
  client_id: string;
  compliance_type: string;
  filing_period: string;
  due_date: string;
  status: string; // 'Upcoming', 'Escalated', 'Due Today', 'Overdue', 'Filed'
  assigned_to: string | null;
  escalation_level: number;
  risk_level: string; // 'LOW', 'MEDIUM', 'HIGH'
  risk_score: number;
}

interface SummaryStats {
  upcoming_filings: number;
  overdue_filings: number;
  high_risk_clients: number;
  filings_completed_this_month: number;
}

const CLIENTS_LOOKUP: Record<string, string> = {
  "client-1": "TechNova Solutions Pvt Ltd",
  "client-2": "Apex Innovations Pvt Ltd",
  "client-3": "Wayne Enterprises Ltd",
  "client-4": "Global Trade LLC",
  "client-5": "Sharma Traders"
};

export default function ComplianceOperationsCenter() {
  const [tasks, setTasks] = useState<ComplianceRecord[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    upcoming_filings: 0,
    overdue_filings: 0,
    high_risk_clients: 0,
    filings_completed_this_month: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Primary Navigation Tab state
  const [activeTab, setActiveTab] = useState<'operations' | 'calendar' | 'heatmap'>('operations');

  // Calendar Focus and View Controls
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'agenda'>('agenda');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedStaff, setSelectedStaff] = useState('ALL');

  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/clients/`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        data.forEach((c: any) => {
          map[c.id] = c.business_name;
        });
        setClientsMap(map);
      })
      .catch(err => {
        console.error("Client lookup failed:", err);
      });
  }, []);

  // Fetch compliance tasks from backend
  const loadCompliance = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(`${API_BASE}/api/compliance`);
      if (!res.ok) {
        throw new Error("Failed to load compliance tasks");
      }

      const data = await res.json();
      setTasks(data);

      const overdue = data.filter((t: ComplianceRecord) => ['Overdue', 'Escalated'].includes(t.status)).length;
      const upcoming = data.filter((t: ComplianceRecord) => ['Upcoming', 'Due Today'].includes(t.status)).length;
      const highRisk = data.filter((t: ComplianceRecord) => t.risk_level === "HIGH").length;
      const filed = data.filter((t: ComplianceRecord) => t.status === "Filed").length;

      setStats({
        upcoming_filings: upcoming,
        overdue_filings: overdue,
        high_risk_clients: highRisk,
        filings_completed_this_month: filed
      });
    } catch (err) {
      console.error("Compliance fetch failed:", err);
      setTasks([]);
      setStats({
        upcoming_filings: 0,
        overdue_filings: 0,
        high_risk_clients: 0,
        filings_completed_this_month: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  // Intake Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formClientId, setFormClientId] = useState('client-1');
  const [formType, setFormType] = useState('GSTR-1');
  const [formPeriod, setFormPeriod] = useState('March 2024');
  const [formDueDate, setFormDueDate] = useState('2026-06-05');
  const [formAssignedTo, setFormAssignedTo] = useState('Aditya Rao');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Dynamic Date Difference Calculation (Anchor: May 31, 2026)
  const getDaysDiff = (dueDateStr: string) => {
    const today = new Date();
    const dueDate = new Date(dueDateStr + 'T00:00:00');
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // dynamic escalation mapping (0 to 3)
  const getEscalationLevel = (task: ComplianceRecord): number => {
    if (task.status === 'Filed') return 0;
    const daysDiff = getDaysDiff(task.due_date);
    if (daysDiff < -7) return 3; // Partner Review Required
    if (daysDiff < 0) return 2;  // Overdue
    if (daysDiff <= 3) return 1; // Due Soon
    return 0;                    // Upcoming
  };

  const getEscalationLabel = (level: number): string => {
    switch (level) {
      case 3: return "Partner Review Required";
      case 2: return "Overdue";
      case 1: return "Due Soon";
      case 0:
      default: return "Upcoming";
    }
  };

  const getEscalationBadgeStyle = (level: number): string => {
    switch (level) {
      case 3: return "status-badge-error";
      case 2: return "status-badge-error";
      case 1: return "status-badge-warning";
      case 0:
      default: return "status-badge-neutral";
    }
  };

  // Replacement parameters for Dynamic late-fee calculations
  const getEstimatedLateFeeRisk = (task: ComplianceRecord): string => {
    if (task.status === 'Filed') return "None";
    const daysDiff = getDaysDiff(task.due_date);
    if (daysDiff > 3) return "Minimal Risk";
    if (daysDiff >= 0) return "Moderate Risk (impending)";
    const overdueDays = -daysDiff;
    if (overdueDays > 7) return `Severe (Compounding accrued)`;
    return `High Risk (Compounding daily)`;
  };

  const getComplianceRiskLevel = (task: ComplianceRecord): string => {
    if (task.status === 'Filed') return "Compliant";
    const level = getEscalationLevel(task);
    switch (level) {
      case 3: return "CRITICAL (Statutory Penalty)";
      case 2: return "HIGH (Overdue)";
      case 1: return "MEDIUM (Action Required)";
      case 0:
      default: return "LOW (Monitored)";
    }
  };

  const getPotentialFinancialImpact = (task: ComplianceRecord): string => {
    if (task.status === 'Filed') return "₹0 (Compliant)";
    if (task.compliance_type.includes('GSTR')) {
      return "High (ITC blocks up to ₹1.5L + fees)";
    } else if (task.compliance_type.includes('TDS')) {
      return "Medium (₹200/day up to ₹20k fine)";
    } else if (task.compliance_type.includes('ROC') || task.compliance_type.includes('MCA')) {
      return "Critical (Director disqualification risk)";
    } else if (task.compliance_type.includes('ITR')) {
      return "High (Interest liability + ₹5k fee)";
    }
    return "Standard statutory late fees";
  };

  const getStatusCategory = (status: string) => {
    if (status === 'Filed') return 'filed';
    if (['Overdue', 'Escalated'].includes(status)) return 'overdue';
    return 'due';
  };

  const getStatusStyle = (status: string) => {
    const category = getStatusCategory(status);
    if (category === 'filed') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/25',
        text: 'text-success',
        badge: 'bg-emerald-50 text-success border-emerald-200',
        indicator: 'bg-emerald-500'
      };
    }
    if (category === 'overdue') {
      return {
        bg: 'bg-rose-500/10 border-rose-500/25',
        text: 'text-danger',
        badge: 'bg-rose-50 text-danger border-rose-200',
        indicator: 'bg-rose-500'
      };
    }
    return {
      bg: 'bg-amber-500/10 border-amber-500/25',
      text: 'text-warning',
      badge: 'bg-amber-50 text-warning border-amber-200',
      indicator: 'bg-amber-500'
    };
  };

  const handleMarkAsFiled = async (compId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/compliance/${compId}/status?new_status=Filed`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to update status");
      showToast("✓ Compliance successfully marked as FILED!");
      await loadCompliance();
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, status: 'Filed', risk_score: 0.0, risk_level: 'LOW' } : t));
      setStats(prev => ({
        ...prev,
        overdue_filings: Math.max(0, prev.overdue_filings - 1),
        filings_completed_this_month: prev.filings_completed_this_month + 1
      }));
      showToast("✓ Return marked as FILED locally.");
      await loadCompliance();
    }
  };

  const handleAssignStaff = async (compId: string, staff: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/compliance/${compId}/status?assigned_to=${encodeURIComponent(staff)}`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to re-assign task");
      showToast(`✓ Deadline re-assigned to ${staff}`);
      await loadCompliance();
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.compliance_id === compId ? { ...t, assigned_to: staff } : t));
      showToast(`✓ Re-assigned to ${staff} locally.`);
      await loadCompliance();
    }
  };

  const handleGenerateReminder = (task: ComplianceRecord) => {
    const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
    const riskLvl = getComplianceRiskLevel(task);
    const finImpact = getPotentialFinancialImpact(task);
    const feeRisk = getEstimatedLateFeeRisk(task);

    const emailBody = `Dear Management at ${clientName},\n\n` +
      `This is a priority alert from Reckon Compliance Operations Center regarding your outstanding statutory return:\n\n` +
      `Return Category: ${task.compliance_type}\n` +
      `Filing Period: ${task.filing_period}\n` +
      `Filing Deadline: ${task.due_date}\n` +
      `Compliance Risk Level: ${riskLvl}\n` +
      `Potential Financial Impact: ${finImpact}\n` +
      `Late Fee Exposure: ${feeRisk}\n\n` +
      `To avoid further compounding risk penalties, please share the invoice data logs immediately.\n\n` +
      `Best Regards,\nReckon Partner Desk`;

    navigator.clipboard.writeText(emailBody);
    showToast(`✓ Dynamic reminder email copied to clipboard for ${task.compliance_type}!`);
  };

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/compliance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formClientId,
          compliance_type: formType,
          filing_period: formPeriod,
          due_date: formDueDate,
          assigned_to: formAssignedTo
        })
      });
      if (!res.ok) throw new Error("Failed to insert filing record");
      showToast("✓ Compliance filing task generated successfully!");
      setIsCreateModalOpen(false);
      await loadCompliance();
    } catch (err) {
      console.error("Create deadline failed:", err);
      showToast("⚠ Failed to create filing task. Check API connection.");
      setIsCreateModalOpen(false);
    }
  };

  // Date Formatting Helper
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevPeriod = () => {
    if (calendarView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      });
    }
  };

  const handleNextPeriod = () => {
    if (calendarView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      });
    }
  };

  const handleToday = () => {
    setSelectedCalendarDate(null);
    setCurrentDate(new Date());
  };

  const handleMonthChange = (mIndex: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), mIndex, 1));
  };

  const handleYearChange = (year: number) => {
    setCurrentDate(prev => new Date(year, prev.getMonth(), 1));
  };

  // Task filtering core logic
  const filteredTasks = tasks.filter(task => {
    const clientName = (clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query && !clientName.includes(query) && !task.compliance_type.toLowerCase().includes(query)) {
      return false;
    }
    if (selectedType !== 'ALL' && task.compliance_type !== selectedType) {
      return false;
    }
    if (selectedStatus !== 'ALL') {
      const cat = getStatusCategory(task.status);
      if (selectedStatus === 'FILED' && cat !== 'filed') return false;
      if (selectedStatus === 'DUE' && cat !== 'due') return false;
      if (selectedStatus === 'OVERDUE' && cat !== 'overdue') return false;
    }
    if (selectedStaff !== 'ALL' && task.assigned_to !== selectedStaff) {
      return false;
    }
    if (selectedCalendarDate && task.due_date !== selectedCalendarDate) {
      return false;
    }
    return true;
  });

  const getIsDueThisWeek = (dueDateStr: string) => {
    const diffDays = getDaysDiff(dueDateStr);
    return diffDays >= 0 && diffDays <= 7;
  };

  // Filter tasks into feeds for Operations Workspace
  const overdueTasks = tasks.filter(t => t.status === 'Overdue');
  const escalatedTasks = tasks.filter(t => t.status === 'Escalated' || getEscalationLevel(t) === 3);
  const dueThisWeekTasks = tasks.filter(t => ['Upcoming', 'Due Today'].includes(t.status) && getIsDueThisWeek(t.due_date));

  // Critical clients computation
  const criticalClients = Array.from(
    new Set(tasks.filter(t => t.risk_level === 'HIGH' || getEscalationLevel(t) >= 2 || t.risk_score >= 70).map(t => t.client_id))
  ).map(clientId => {
    const clientTasks = tasks.filter(t => t.client_id === clientId);
    const maxRiskScore = clientTasks.length > 0 ? Math.max(...clientTasks.map(t => t.risk_score)) : 0;
    const clientName = clientsMap[clientId] || CLIENTS_LOOKUP[clientId] || "Client Firm";
    return {
      clientId,
      clientName,
      maxRiskScore,
      pendingCount: clientTasks.filter(t => t.status !== 'Filed').length
    };
  }).sort((a, b) => b.maxRiskScore - a.maxRiskScore);

  // Heatmap helper calculations
  const heatmapClients = Object.keys(CLIENTS_LOOKUP);
  const heatmapTypes = ["GSTR-1", "GSTR-3B", "TDS Returns", "Advance Tax", "MCA Compliance", "ITR Filing", "ROC Filing"];

  const getHeatmapColor = (clientId: string, type: string) => {
    const task = tasks.find(t => t.client_id === clientId && t.compliance_type === type);
    if (!task) return 'bg-slate-100/50 border-slate-200 text-muted';
    const style = getStatusStyle(task.status);
    return `${style.bg} ${style.text} border-current`;
  };

  const getHeatmapTask = (clientId: string, type: string) => {
    return tasks.find(t => t.client_id === clientId && t.compliance_type === type);
  };

  // Calendar cells tasks lookup
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(task => {
      const clientName = (clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      if (query && !clientName.includes(query) && !task.compliance_type.toLowerCase().includes(query)) {
        return false;
      }
      if (selectedType !== 'ALL' && task.compliance_type !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'ALL') {
        const cat = getStatusCategory(task.status);
        if (selectedStatus === 'FILED' && cat !== 'filed') return false;
        if (selectedStatus === 'DUE' && cat !== 'due') return false;
        if (selectedStatus === 'OVERDUE' && cat !== 'overdue') return false;
      }
      if (selectedStaff !== 'ALL' && task.assigned_to !== selectedStaff) {
        return false;
      }
      return task.due_date === dateStr;
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = getDaysInMonth(year, month);
    const days = [];
    
    // Previous month padding
    const prevMonthTotalDays = getDaysInMonth(year, month - 1);
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, dNum);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNum: dNum,
        dateStr: formatDateStr(d)
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dayNum: i,
        dateStr: formatDateStr(d)
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNum: i,
        dateStr: formatDateStr(d)
      });
    }
    return days;
  };

  const getWeekDays = (date: Date) => {
    const currentDayOfWeek = date.getDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const diff = i - currentDayOfWeek;
      const d = new Date(date);
      d.setDate(date.getDate() + diff);
      days.push({
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        dateStr: formatDateStr(d)
      });
    }
    return days;
  };

  const getDisplayHeader = () => {
    if (calendarView === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (calendarView === 'week') {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      
      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();

      if (sameMonth) {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      if (sameYear) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `As of ${currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  const getGroupedAgenda = () => {
    const groups: Record<string, ComplianceRecord[]> = {};
    const sorted = [...filteredTasks].sort((a, b) => {
      const catA = getStatusCategory(a.status);
      const catB = getStatusCategory(b.status);
      if (catA === 'overdue' && catB !== 'overdue') return -1;
      if (catA !== 'overdue' && catB === 'overdue') return 1;
      if (catA === 'due' && catB === 'filed') return -1;
      if (catA === 'filed' && catB === 'due') return 1;
      return a.due_date.localeCompare(b.due_date);
    });

    sorted.forEach(t => {
      if (!groups[t.due_date]) {
        groups[t.due_date] = [];
      }
      groups[t.due_date].push(t);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  // AI Compliance Brief Section UI
  const renderAIComplianceBrief = () => {
    const dueTodayCount = tasks.filter(t => t.status === 'Due Today').length;
    const highRiskCount = criticalClients.length;
    const escalationsCount = tasks.filter(t => t.status === 'Escalated' || getEscalationLevel(t) === 3).length;

    let recommendation = "";
    if (escalationsCount > 0) {
      recommendation = `🚨 Critical Overdue Action: Re-allocate statutory files to resolve the ${escalationsCount} Overdue/Partner Review cases immediately to block statutory penalty risks.`;
    } else if (tasks.filter(t => getEscalationLevel(t) === 2).length > 0) {
      recommendation = `⚠️ High Risk Portfolio Alert: Overdue return registers detected. Trigger dynamic email reminders with compliance risk metrics to ${criticalClients[0]?.clientName || 'high-risk clients'}.`;
    } else if (dueTodayCount > 0) {
      recommendation = `⏰ Impending Return Deadline: ${dueTodayCount} filings due today. Verify invoice XML sheets and finalize partner review.`;
    } else {
      recommendation = `✨ System Stable: All portfolios fully aligned. Recommend initiating early document extraction for upcoming GSTR filings.`;
    }

    return (
      <div className="dark-card p-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-110 duration-1000" />
        <div className="absolute left-1/3 -bottom-10 w-60 h-60 bg-purple-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 items-center">
          {/* Left: title + recommended focus text */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                <span>AI Compliance Brief</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-badge-dot" />
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white leading-tight">
              Operations Center Intelligence
            </h2>
            <p className="text-indigo-200/80 text-[13px] leading-relaxed font-semibold">
              <span className="text-indigo-300 block text-[10px] font-black uppercase tracking-wider mb-0.5">Recommended Focus:</span>
              {recommendation}
            </p>
          </div>

          {/* Right: 3 stat boxes */}
          <div className="grid grid-cols-3 gap-4">
            {/* Due Today */}
            <div className="bg-[rgba(255,255,255,0.06)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider block">Due Today</span>
              <span className="text-[32px] font-bold text-white leading-none mt-2 block" style={{ fontWeight: 700 }}>{dueTodayCount}</span>
            </div>
            {/* High Risk Clients */}
            <div className="bg-[rgba(255,255,255,0.06)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider block">High Risk Clients</span>
              <span className="text-[32px] font-bold text-[var(--color-warning)] leading-none mt-2 block" style={{ fontWeight: 700 }}>{highRiskCount}</span>
            </div>
            {/* Escalations */}
            <div className="bg-[rgba(255,255,255,0.06)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider block">Escalations</span>
              <span className="text-[32px] font-bold text-[var(--color-error)] leading-none mt-2 block" style={{ fontWeight: 700 }}>{escalationsCount}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 relative font-sans w-full max-w-7xl mx-auto px-4 lg:px-6">
      
      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px !important;
          height: 4px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border-strong) !important;
          border-radius: var(--radius-sm) !important;
        }
      `}} />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-emerald-500 text-slate-800 px-6 py-4 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      <PageHeader
        sectionLabel="Statutory Control Workspace"
        liveIndicator={true}
        title="Compliance Operations Center"
        description="Active statutory operations tracking, financial liability shielding, and escalation hub."
        hasSeparator={true}
        actions={
          <>
            <button
              onClick={() => {
                loadCompliance();
                showToast("✓ Compliance schedule synced with server.");
              }}
              className="btn btn-secondary btn-icon-md"
              title="Sync Schedule"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary btn-md"
            >
              <Plus size={16} />
              <span>Create Filing Task</span>
            </button>
          </>
        }
      />

      {/* Dynamic AI Compliance Briefing Deck */}
      {!isLoading && renderAIComplianceBrief()}

      {/* Main Module Tabs Switcher */}
      <div className="flex border-b border-slate-200/80 gap-6 mt-4">
        <button
          onClick={() => setActiveTab('operations')}
          style={{
            height: 'auto',
            paddingTop: 0,
            paddingBottom: '16px',
            paddingLeft: '8px',
            paddingRight: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeTab === 'operations' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'operations' ? '2px solid var(--color-primary-light)' : '2px solid transparent'
          }}
          className="pb-4 px-2 uppercase tracking-wider transition-all cursor-pointer flex items-center animate-none"
        >
          <span>Operations Workspace</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            height: 'auto',
            paddingTop: 0,
            paddingBottom: '16px',
            paddingLeft: '8px',
            paddingRight: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeTab === 'calendar' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'calendar' ? '2px solid var(--color-primary-light)' : '2px solid transparent'
          }}
          className="pb-4 px-2 uppercase tracking-wider transition-all cursor-pointer flex items-center animate-none"
        >
          <span>Filing Calendar</span>
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] text-[10px] font-medium ml-1.5">
            {stats.upcoming_filings}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          style={{
            height: 'auto',
            paddingTop: 0,
            paddingBottom: '16px',
            paddingLeft: '8px',
            paddingRight: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeTab === 'heatmap' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'heatmap' ? '2px solid var(--color-primary-light)' : '2px solid transparent'
          }}
          className="pb-4 px-2 uppercase tracking-wider transition-all cursor-pointer flex items-center animate-none"
        >
          <span>Compliance Risk Heatmap</span>
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] text-[10px] font-medium ml-1.5">
            {tasks.filter(t => t.risk_level === 'HIGH').length}
          </span>
        </button>
      </div>

      {/* View 1: OPERATIONS WORKSPACE HUB (Default Tab) */}
      {activeTab === 'operations' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* KPIs Summary Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white border border-slate-200/60 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 metric-grid">
              {/* Overdue card — critical variant */}
              <div className="std-card std-card-interactive metric-card card-variant-critical flex-row flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1 z-10">
                  <span className="metric-label block">Overdue Filings</span>
                  <span className="metric-value block" style={{ color: 'var(--color-error)' }}>{stats.overdue_filings}</span>
                  <span className="block uppercase" style={{ fontSize: '11px', color: 'var(--color-error)', fontWeight: 600 }}>Statutory Penalty Exposure</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[var(--color-error)] shrink-0 z-10 group-hover:scale-105 transition-transform">
                  <AlertTriangle size={20} className="animate-bounce" />
                </div>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/[0.02] rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Due card — warning variant */}
              <div className="std-card std-card-interactive metric-card card-variant-warning flex-row flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1 z-10">
                  <span className="metric-label block">Upcoming Due</span>
                  <span className="metric-value block" style={{ color: 'var(--color-warning)' }}>{stats.upcoming_filings}</span>
                  <span className="metric-sub-label block">Filing Next 7 Days</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[var(--color-warning)] shrink-0 z-10 group-hover:scale-105 transition-transform">
                  <Clock size={20} />
                </div>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/[0.02] rounded-full blur-xl pointer-events-none" />
              </div>

              {/* High Risk Portfolios — count in error color, no critical left border */}
              <div className="std-card std-card-interactive metric-card flex-row flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1 z-10">
                  <span className="metric-label block">Critical Portfolios</span>
                  <span className="metric-value block" style={{ color: 'var(--color-error)' }}>{stats.high_risk_clients}</span>
                  <span className="metric-sub-label block">Risk Score &gt; 70%</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 z-10 group-hover:scale-105 transition-transform">
                  <ShieldAlert size={20} />
                </div>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/[0.02] rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Completed Filings — success variant */}
              <div className="std-card std-card-interactive metric-card card-variant-success flex-row flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1 z-10">
                  <span className="metric-label block">Filed Returns</span>
                  <span className="metric-value block" style={{ color: 'var(--color-success)' }}>{stats.filings_completed_this_month}</span>
                  <span className="text-[9px] text-success bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-bold uppercase block tracking-wide w-fit">Filed This Month</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0 z-10 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={20} />
                </div>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
              </div>
            </div>
          )}


          {/* Actionable Workspaces Grid Layout */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-5 lg:p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Compliance Risk Workspace</h2>
                </div>
                <p className="text-xs text-secondary mt-1">
                  Immediate statutory reassignments, high-impact exposure feeds, and dynamic client outreach.
                </p>
              </div>
              <div className="btn btn-secondary btn-sm shrink-0 cursor-default ml-auto">
                <ShieldAlert className="text-[var(--color-primary-light)]" size={14} />
                <span>
                  {tasks.filter(t => ['Overdue', 'Escalated'].includes(t.status) || getEscalationLevel(t) >= 2).length} High-Risk Exposures
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* 1. OVERDUE TASKS FEED */}
              <div className="std-card flex flex-col justify-between shadow-sm relative group hover:shadow-md transition-all" style={{ padding: 0, paddingBottom: 0 }}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--color-border)]" style={{ padding: '16px 20px 12px' }}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="text-rose-600" size={16} />
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Overdue Tasks</span>
                    </div>
                    <span className="status-badge status-badge-error" style={{ minWidth: 'auto', height: '20px', padding: '0 8px', fontSize: '10px' }}>
                      {overdueTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '380px', padding: '12px' }}>
                    {overdueTasks.length > 0 ? (
                      overdueTasks.map(task => {
                        const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
                        const daysDiff = getDaysDiff(task.due_date);
                        const isHighRisk = task.risk_level === 'HIGH' || getEscalationLevel(task) >= 2;
                        return (
                          <div key={task.compliance_id} className={`std-card ${isHighRisk ? 'card-variant-critical' : 'card-variant-warning'} flex flex-col gap-2 relative transition-all hover:scale-[1.02] transform duration-250`} style={{ padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div className="flex justify-between items-center gap-1">
                              <span className="bg-rose-50 text-danger border border-rose-100 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider">
                                {task.compliance_type}
                              </span>
                              <span className="status-badge status-badge-error" style={{ minWidth: 'auto', height: '18px', padding: '0 6px', fontSize: '8.5px' }}>
                                OVERDUE
                              </span>
                            </div>
                            
                            <div>
                              <h4 className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                {clientName}
                              </h4>
                              <span className="text-[9.5px] text-secondary block font-mono mt-0.5">
                                Due: {task.due_date} ({task.filing_period})
                              </span>
                            </div>

                            {/* Risk Elements */}
                            <div className="bg-rose-50/50 border border-rose-100/60 p-2 rounded-lg text-[9px] space-y-1">
                              <div className="flex justify-between"><span className="text-secondary">Late Fee Risk:</span><span className="font-semibold text-rose-700">{getEstimatedLateFeeRisk(task)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-secondary">Risk Level:</span><span className={`status-badge ${getUnifiedBadgeClass(getComplianceRiskLevel(task))}`}>{renderBadgeDot(getComplianceRiskLevel(task))}{getComplianceRiskLevel(task)}</span></div>
                              <div className="flex justify-between"><span className="text-secondary">Impact:</span><span className="font-medium text-slate-800 line-clamp-1">{getPotentialFinancialImpact(task)}</span></div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                              <button
                                onClick={() => handleMarkAsFiled(task.compliance_id)}
                                className="btn btn-success btn-sm"
                                title="Mark as Filed"
                              >
                                File
                              </button>
                              <button
                                onClick={() => handleGenerateReminder(task)}
                                className="btn btn-secondary btn-sm"
                                title="Outreach"
                              >
                                Outreach
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[10px] text-secondary font-bold border border-dashed border-slate-200 rounded-xl bg-white/50">
                        ✓ No overdue filings
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. ESCALATIONS FEED */}
              <div className="std-card flex flex-col justify-between shadow-sm relative group hover:shadow-md transition-all" style={{ padding: 0, paddingBottom: 0 }}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--color-border)]" style={{ padding: '16px 20px 12px' }}>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="text-purple-600" size={16} />
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Escalations Feed</span>
                    </div>
                    <span className="status-badge status-badge-error" style={{ minWidth: 'auto', height: '20px', padding: '0 8px', fontSize: '10px' }}>
                      {escalatedTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '380px', padding: '12px' }}>
                    {escalatedTasks.length > 0 ? (
                      escalatedTasks.map(task => {
                        const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
                        const level = getEscalationLevel(task);
                        return (
                          <div key={task.compliance_id} className="std-card card-variant-critical flex flex-col gap-2 relative transition-all hover:scale-[1.02] transform duration-250" style={{ padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div className="flex justify-between items-start gap-1">
                              <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider">
                                {task.compliance_type}
                              </span>
                              <span className={`status-badge ${getEscalationBadgeStyle(level)}`}>
                                {renderBadgeDot(getEscalationLabel(level))}
                                {getEscalationLabel(level)}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                {clientName}
                              </h4>
                              <span className="text-[9px] text-secondary block font-mono mt-0.5">
                                Staff: {task.assigned_to || "Unassigned"}
                              </span>
                            </div>

                            {/* Risk Parameters */}
                            <div className="bg-purple-50/40 border border-purple-100/60 p-2 rounded-lg text-[9px] space-y-1">
                              <div className="flex justify-between"><span className="text-secondary">Fee Exposure:</span><span className="font-semibold text-purple-800">{getEstimatedLateFeeRisk(task)}</span></div>
                              <div className="flex justify-between"><span className="text-secondary">Impact:</span><span className="font-medium text-slate-800 line-clamp-1">{getPotentialFinancialImpact(task)}</span></div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                              <button
                                onClick={() => handleMarkAsFiled(task.compliance_id)}
                                className="btn btn-success btn-sm"
                              >
                                File
                              </button>
                              <button
                                onClick={() => handleGenerateReminder(task)}
                                className="btn btn-secondary btn-sm"
                              >
                                Outreach
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[10px] text-secondary font-bold border border-dashed border-slate-200 rounded-xl bg-white/50">
                        ✓ No escalated cases
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. DEADLINES FEED */}
              <div className="std-card flex flex-col justify-between shadow-sm relative group hover:shadow-md transition-all" style={{ padding: 0, paddingBottom: 0 }}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--color-border)]" style={{ padding: '16px 20px 12px' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="text-amber-600" size={16} />
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Deadlines Feed</span>
                    </div>
                    <span className="status-badge status-badge-warning" style={{ minWidth: 'auto', height: '20px', padding: '0 8px', fontSize: '10px' }}>
                      {dueThisWeekTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '380px', padding: '12px' }}>
                    {dueThisWeekTasks.length > 0 ? (
                      dueThisWeekTasks.map(task => {
                        const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
                        const daysDiff = getDaysDiff(task.due_date);
                        return (
                          <div key={task.compliance_id} className="std-card card-variant-warning flex flex-col gap-2 relative transition-all hover:scale-[1.02] transform duration-250" style={{ padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div className="flex justify-between items-start gap-1">
                              <span className="bg-amber-50 text-warning border border-amber-100 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider">
                                {task.compliance_type}
                              </span>
                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                daysDiff === 0 ? 'bg-amber-500 text-white font-black animate-pulse' : 'bg-amber-50 text-warning border border-amber-100'
                              }`}>
                                {daysDiff === 0 ? 'Due Today' : `In ${daysDiff} days`}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                {clientName}
                              </h4>
                              <span className="text-[9px] text-secondary block font-mono mt-0.5">
                                Due: {task.due_date} ({task.filing_period})
                              </span>
                            </div>

                            {/* Risk metrics */}
                            <div className="bg-amber-50/50 border border-amber-100/60 p-2 rounded-lg text-[9px] space-y-1">
                              <div className="flex justify-between"><span className="text-secondary">Fee Risk:</span><span className="font-semibold text-amber-700">{getEstimatedLateFeeRisk(task)}</span></div>
                              <div className="flex justify-between"><span className="text-secondary">Impact:</span><span className="font-medium text-slate-800 line-clamp-1">{getPotentialFinancialImpact(task)}</span></div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                              <button
                                onClick={() => handleMarkAsFiled(task.compliance_id)}
                                className="btn btn-success btn-sm"
                              >
                                File
                              </button>
                              <button
                                onClick={() => handleGenerateReminder(task)}
                                className="btn btn-secondary btn-sm"
                              >
                                Outreach
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[10px] text-secondary font-bold border border-dashed border-slate-200 rounded-xl bg-white/50">
                        ✓ No filings due this week
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. AT-RISK CLIENT PORTFOLIO */}
              <div className="std-card flex flex-col justify-between shadow-sm relative group hover:shadow-md transition-all" style={{ padding: 0, paddingBottom: 0 }}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--color-border)]" style={{ padding: '16px 20px 12px' }}>
                    <div className="flex items-center gap-1.5">
                      <Building className="text-indigo-700" size={16} />
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>At-Risk Clients</span>
                    </div>
                    <span className="status-badge status-badge-info" style={{ minWidth: 'auto', height: '20px', padding: '0 8px', fontSize: '10px' }}>
                      {criticalClients.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '380px', padding: '12px' }}>
                    {criticalClients.length > 0 ? (
                      criticalClients.map(client => (
                        <div key={client.clientId} className="border-b border-[var(--color-border)] last:border-b-0 pb-3 pt-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[12px] font-bold text-slate-800 leading-tight truncate max-w-[170px]" title={client.clientName}>
                              {client.clientName}
                            </h4>
                            <Link
                              href={`/clients/${client.clientId}`}
                              className="btn btn-secondary btn-icon-sm shrink-0 font-normal"
                              style={{ width: '22px', height: '22px', minWidth: 'auto' }}
                              title="View Portfolio"
                            >
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-secondary font-medium">Liability Risk</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: client.maxRiskScore > 80 ? 'var(--color-error)' : 'var(--color-warning)' }}>
                                {client.maxRiskScore}%
                              </span>
                            </div>
                            <div className="w-full h-1 bg-[var(--color-border)] rounded-[2px] overflow-hidden" style={{ height: '4px' }}>
                              <div
                                className="h-full rounded-[2px]"
                                style={{
                                  width: `${client.maxRiskScore}%`,
                                  backgroundColor: client.maxRiskScore > 80 ? 'var(--color-error)' : 'var(--color-warning)'
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-secondary">
                              {client.pendingCount} pending returns
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-[10px] text-secondary font-bold border border-dashed border-slate-200 rounded-xl bg-white/50">
                        ✓ No critical clients
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Today's Urgent Critical Alert Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-8">
            <div className="std-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Partner Level Alerts</h2>
                </div>
                <span className="text-[9px] text-danger font-black bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  {tasks.filter(t => getEscalationLevel(t) === 3).length} critical
                </span>
              </div>

              <div className="space-y-3.5 max-h-[315px] overflow-y-auto pr-1">
                {tasks.filter(t => getEscalationLevel(t) === 3).length > 0 ? (
                  tasks.filter(t => getEscalationLevel(t) === 3).map(task => {
                    const style = getStatusStyle(task.status);
                    const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";

                    return (
                      <div
                        key={task.compliance_id}
                        className="p-3.5 rounded-2xl border border-rose-200 bg-rose-500/[0.02] transition-all flex justify-between items-start gap-4"
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-rose-500 block font-mono">
                            {task.compliance_type} · {task.filing_period}
                          </span>
                          <span className="text-xs font-bold text-slate-800 block truncate max-w-[170px]" title={clientName}>
                            {clientName}
                          </span>
                          <div className="mt-1 mb-1">
                            <span className="status-badge status-badge-warning" style={{ minWidth: 'auto', height: '20px', padding: '0 8px', fontSize: '9px' }}>
                              PARTNER REVIEW REQUIRED
                            </span>
                          </div>
                          <span className="text-[8.5px] text-secondary block font-mono">
                            Impact: {getPotentialFinancialImpact(task)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleMarkAsFiled(task.compliance_id)}
                          className="btn btn-primary btn-sm shrink-0"
                        >
                          File
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-secondary font-sans font-bold text-xs">
                    ✓ No escalated cases require Partner Review.
                  </div>
                )}
              </div>
            </div>

            {/* Quick action overview list */}
            <div className="std-card p-6 space-y-5 lg:col-span-2">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Actionable Compliance Queue</h2>
                  <p className="text-[10.5px] text-secondary mt-0.5">Chronologically ordered pending tasks and statutory obligations.</p>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[315px] overflow-y-auto pr-1">
                {tasks.filter(t => t.status !== 'Filed').slice(0, 5).map(task => {
                  const style = getStatusStyle(task.status);
                  const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
                  const level = getEscalationLevel(task);

                  return (
                    <div key={task.compliance_id} className="p-3.5 border border-slate-200/80 bg-slate-50/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50/50">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* [badge] column */}
                        <div className="flex flex-col gap-1 shrink-0 items-center justify-center">
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider font-mono text-center block w-full">
                            {task.compliance_type}
                          </span>
                          {level >= 2 ? (
                            <span className="status-badge status-badge-error" style={{ minWidth: '70px', height: '18px', padding: '0 4px', fontSize: '8.5px' }}>
                              OVERDUE
                            </span>
                          ) : level === 1 ? (
                            <span className="status-badge status-badge-warning" style={{ minWidth: '70px', height: '18px', padding: '0 4px', fontSize: '8.5px' }}>
                              DUE SOON
                            </span>
                          ) : (
                            <span className="status-badge status-badge-neutral" style={{ minWidth: '70px', height: '18px', padding: '0 4px', fontSize: '8.5px' }}>
                              UPCOMING
                            </span>
                          )}
                        </div>

                        {/* [client name + period + due date] column */}
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-[12px] font-black text-slate-800 truncate max-w-[200px]" title={clientName}>{clientName}</h4>
                          <span className="text-[10px] text-secondary block font-mono">
                            Period: {task.filing_period} · Due: {task.due_date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleMarkAsFiled(task.compliance_id)}
                          className="btn btn-success btn-sm"
                        >
                          Mark Filed
                        </button>
                        <button
                          onClick={() => handleGenerateReminder(task)}
                          className="btn btn-secondary btn-sm"
                        >
                          Outreach
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* View 2: FILING CALENDAR TAB (De-prioritized, Secondary) */}
      {activeTab === 'calendar' && (
        <div className="std-card p-5 lg:p-7 space-y-6 animate-in fade-in duration-300">
          
          {/* Calendar Navigation header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
            
            {/* Calendar view toggles */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl shrink-0 shadow-sm">
              {(['month', 'week', 'agenda'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => {
                    setCalendarView(view);
                    setSelectedCalendarDate(null);
                  }}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    calendarView === view
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-secondary hover:text-slate-800 hover:bg-slate-100/60'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Navigators */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start font-mono">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevPeriod}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={handleNextPeriod}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={currentDate.getMonth()}
                  onChange={e => handleMonthChange(parseInt(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2026, i, 1).toLocaleString('en-US', { month: 'short' })}
                    </option>
                  ))}
                </select>
                <select
                  value={currentDate.getFullYear()}
                  onChange={e => handleYearChange(parseInt(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-right hidden lg:block">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest block font-mono">Scope Focus</span>
              <span className="text-xs font-black text-slate-900 font-mono block mt-0.5">{getDisplayHeader()}</span>
            </div>
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 border border-slate-200/50 p-4 rounded-2xl filter-row">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3.5 text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Client or Return Category..."
                className="w-full pl-9.5 pr-4 placeholder-slate-400 search-input"
              />
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-3.5 appearance-none form-select filter-select-sm"
              >
                <option value="ALL">Filing Type: All</option>
                <option value="GSTR-1">GSTR-1 Return</option>
                <option value="GSTR-3B">GSTR-3B Offset</option>
                <option value="TDS Returns">TDS Returns</option>
                <option value="Advance Tax">Advance Tax</option>
                <option value="MCA Compliance">MCA Corporate</option>
                <option value="ITR Filing">ITR Income Tax</option>
                <option value="ROC Filing">ROC Filing</option>
              </select>
              <ChevronDown size={12} className="absolute right-3.5 top-3.5 text-secondary pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 appearance-none form-select filter-select-sm"
              >
                <option value="ALL">Filing Status: All</option>
                <option value="OVERDUE">🔴 Overdue / Escalated</option>
                <option value="DUE">🟡 Due Today / Upcoming</option>
                <option value="FILED">🟢 Filed Returns</option>
              </select>
              <ChevronDown size={12} className="absolute right-3.5 top-3.5 text-secondary pointer-events-none" />
            </div>

            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="w-full px-3.5 appearance-none form-select filter-select-sm"
                >
                  <option value="ALL">Assigned Staff: All</option>
                  <option value="Aditya Rao">Aditya Rao</option>
                  <option value="Neha Sharma">Neha Sharma</option>
                  <option value="Rohan Mehta">Rohan Mehta</option>
                  <option value="Kunal Sen">Kunal Sen</option>
                </select>
                <ChevronDown size={12} className="absolute right-3.5 top-3.5 text-secondary pointer-events-none" />
              </div>

              {(searchQuery || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedStaff !== 'ALL' || selectedCalendarDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('ALL');
                    setSelectedStatus('ALL');
                    setSelectedStaff('ALL');
                    setSelectedCalendarDate(null);
                    showToast("✓ Filter settings reset.");
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                  title="Clear Filters"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Calendar Views Area */}
          <div className="min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-80 gap-3">
                <RefreshCw size={24} className="animate-spin text-secondary" />
                <span className="text-xs text-secondary font-medium">Assembling calendar grid...</span>
              </div>
            ) : (
              <>
                {/* 1. MONTH VIEW */}
                {calendarView === 'month' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-secondary uppercase tracking-widest py-2 border-b border-slate-100">
                      <span>Sunday</span>
                      <span>Monday</span>
                      <span>Tuesday</span>
                      <span>Wednesday</span>
                      <span>Thursday</span>
                      <span>Friday</span>
                      <span>Saturday</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2.5">
                      {getMonthDays(currentDate).map((day, index) => {
                        const dayTasks = getTasksForDate(day.dateStr);
                        const isSelected = selectedCalendarDate === day.dateStr;
                        const isToday = formatDateStr(new Date()) === day.dateStr;

                        const hasOverdue = dayTasks.some(t => ['overdue'].includes(getStatusCategory(t.status)));
                        const hasDue = dayTasks.some(t => ['due'].includes(getStatusCategory(t.status)));
                        const hasFiled = dayTasks.some(t => ['filed'].includes(getStatusCategory(t.status)));

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              setSelectedCalendarDate(isSelected ? null : day.dateStr);
                            }}
                            className={`min-h-[110px] bg-slate-50/40 hover:bg-slate-50 border rounded-2xl p-2 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                              !day.isCurrentMonth ? 'opacity-40 hover:opacity-75' : ''
                            } ${
                              isSelected
                                ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/15'
                                : isToday
                                ? 'border-slate-800 bg-slate-900/[0.02]'
                                : hasOverdue
                                ? 'border-rose-200/80 bg-rose-50/10 shadow-sm ring-1 ring-rose-500/[0.04]'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              {isToday && (
                                <span className="text-[7.5px] font-black text-white bg-slate-900 px-1 rounded uppercase tracking-wider scale-90 origin-left">
                                  Today
                                </span>
                              )}
                              <span className={`text-xs font-mono font-bold ml-auto ${
                                isToday ? 'w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[10px]' : 'text-secondary group-hover:text-slate-800'
                              }`}>
                                {day.dayNum}
                              </span>
                            </div>

                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[68px] scrollbar-thin pr-0.5">
                              {dayTasks.slice(0, 3).map(task => {
                                const style = getStatusStyle(task.status);
                                const clientShortName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Firm";
                                return (
                                  <div
                                    key={task.compliance_id}
                                    className={`text-[8.5px] font-bold p-1 rounded-md border truncate ${style.bg} ${style.text} flex items-center gap-1`}
                                    title={`${task.compliance_type} - ${clientShortName}`}
                                  >
                                    <span className={`w-1 h-1 rounded-full ${style.indicator}`} />
                                    <span className="font-mono shrink-0">{task.compliance_type}</span>
                                    <span className="truncate opacity-80 font-normal">{clientShortName}</span>
                                  </div>
                                );
                              })}
                              {dayTasks.length > 3 && (
                                <div className="text-[8px] font-black text-secondary pl-1">
                                  +{dayTasks.length - 3} more
                                </div>
                              )}
                            </div>

                            {dayTasks.length > 0 && (
                              <div className="flex gap-1 justify-center mt-1 border-t border-slate-100/50 pt-1">
                                {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                                {hasDue && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                                {hasFiled && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. WEEK VIEW */}
                {calendarView === 'week' && (
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {getWeekDays(currentDate).map((day, index) => {
                      const dayTasks = getTasksForDate(day.dateStr);
                      const isSelected = selectedCalendarDate === day.dateStr;
                      const isToday = formatDateStr(new Date()) === day.dateStr;

                      return (
                        <div
                          key={index}
                          className={`bg-slate-50/20 border rounded-2xl p-3 flex flex-col gap-3 min-h-[380px] ${
                            isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/5' : isToday ? 'border-slate-800 bg-slate-900/[0.01]' : 'border-slate-200/70 hover:border-slate-300'
                          }`}
                        >
                          <div
                            onClick={() => setSelectedCalendarDate(isSelected ? null : day.dateStr)}
                            className="text-center cursor-pointer group pb-2 border-b border-slate-200/60"
                          >
                            <span className="text-[9.5px] font-black text-secondary uppercase tracking-widest block">{day.dayName}</span>
                            <span className={`text-lg font-mono font-bold mt-1 inline-flex items-center justify-center ${
                              isToday ? 'w-7 h-7 bg-slate-950 text-white rounded-full text-sm' : 'text-slate-800 group-hover:text-indigo-700'
                            }`}>{day.dayNum}</span>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 max-h-[380px] hidden-scrollbar">
                            {dayTasks.length > 0 ? (
                              dayTasks.map(task => {
                                const style = getStatusStyle(task.status);
                                const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";

                                return (
                                  <div key={task.compliance_id} className="p-3 rounded-xl border bg-white shadow-sm flex flex-col gap-2 hover:shadow-md transition-all relative border-l-4 border-l-indigo-500">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono">{task.compliance_type}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider border ${style.badge}`}>{task.status}</span>
                                    </div>

                                    <div>
                                      <h4 className="text-[11px] font-bold text-slate-800 leading-tight truncate">{clientName}</h4>
                                      <span className="text-[9px] text-secondary block font-mono mt-0.5">Period: {task.filing_period}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                                      {task.status !== 'Filed' && (
                                        <button
                                          onClick={() => handleMarkAsFiled(task.compliance_id)}
                                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase"
                                        >
                                          File
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleGenerateReminder(task)}
                                        className="bg-slate-100 hover:bg-slate-200 text-secondary px-2 py-0.5 rounded text-[8px] font-black uppercase"
                                      >
                                        Mail
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-[10px] text-secondary font-bold border border-dashed border-slate-200 rounded-xl bg-white/50">No files</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. AGENDA VIEW */}
                {calendarView === 'agenda' && (
                  <div className="space-y-6">
                    {getGroupedAgenda().length > 0 ? (
                      getGroupedAgenda().map(([dateStr, dayTasks]) => {
                        const dateObj = new Date(dateStr + 'T00:00:00');
                        return (
                          <div key={dateStr} className="grid grid-cols-1 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100 last:border-b-0">
                            <div className="lg:col-span-1 py-1">
                              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block font-mono">Filing Deadline</span>
                              <h3 className="text-sm font-black text-slate-900 font-mono mt-0.5">
                                {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </h3>
                            </div>

                            <div className="lg:col-span-3 space-y-3">
                              {dayTasks.map(task => {
                                const style = getStatusStyle(task.status);
                                const clientName = clientsMap[task.client_id] || CLIENTS_LOOKUP[task.client_id] || "Client Firm";
                                const level = getEscalationLevel(task);

                                return (
                                  <div key={task.compliance_id} className="border border-slate-200 hover:border-slate-300 bg-slate-50/10 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider font-mono">{task.compliance_type}</span>
                                        <span className={`status-badge ${getEscalationBadgeStyle(level)}`}>
                                          {renderBadgeDot(getEscalationLabel(level))}
                                          {getEscalationLabel(level)}
                                        </span>
                                      </div>
                                      <h4 className="text-xs font-black text-slate-800 mt-1">{clientName}</h4>
                                      <span className="text-[10px] text-secondary block font-mono">Period: {task.filing_period} · Due: {task.due_date}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {task.status !== 'Filed' && (
                                        <button
                                          onClick={() => handleMarkAsFiled(task.compliance_id)}
                                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                        >
                                          Mark Filed
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleGenerateReminder(task)}
                                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                      >
                                        Outreach
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-16 text-secondary font-bold border-2 border-dashed border-slate-100 rounded-3xl">No statutory deadlines found.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* View 3: COMPLIANCE RISK HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="std-card p-6 space-y-6 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Compliance Risk Heatmap</h2>
              <p className="text-[11px] text-secondary mt-0.5">Corporate statutory returns filing density and risk exposure matrix.</p>
            </div>
            {/* Legend */}
            <div className="flex gap-2.5 text-[8.5px] font-bold text-secondary">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/30"></span><span>Filed</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30"></span><span>Due</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/10 border border-rose-500/30"></span><span>Overdue</span></div>
            </div>
          </div>

          <div className="overflow-x-auto pr-1 pb-1">
            <div className="min-w-[650px] space-y-2.5 font-sans">
              {/* Columns Header */}
              <div className="grid grid-cols-8 gap-2 border-b border-slate-100 pb-2 text-[9px] font-black text-secondary uppercase tracking-wider">
                <span className="col-span-2">Client Portfolio</span>
                {heatmapTypes.map(type => (
                  <span key={type} className="text-center truncate" title={type}>{type}</span>
                ))}
              </div>

              {/* Rows */}
              {heatmapClients.map(cId => (
                <div key={cId} className="grid grid-cols-8 gap-2 items-center text-xs">
                  <span className="col-span-2 font-bold text-slate-700 truncate pr-3" title={CLIENTS_LOOKUP[cId]}>
                    {CLIENTS_LOOKUP[cId]}
                  </span>

                  {heatmapTypes.map(type => {
                    const task = getHeatmapTask(cId, type);
                    return (
                      <div key={type} className="flex justify-center">
                        <button
                          onClick={() => {
                            if (task) {
                              setSelectedCalendarDate(task.due_date);
                              setActiveTab('operations');
                              showToast(`Focused on ${task.compliance_type} for ${CLIENTS_LOOKUP[cId]}`);
                            } else {
                              showToast(`No schedule for ${type} in this portfolio.`);
                            }
                          }}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center text-[9px] font-mono font-black shadow-inner transition-all hover:scale-105 cursor-pointer ${getHeatmapColor(cId, type)}`}
                          title={task ? `${type}: ${task.status} (Due: ${task.due_date})` : `No scheduling`}
                        >
                          {type.charAt(0)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Intake / Create Deadline Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-fintech-lg relative animate-in scale-in duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-secondary hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all border border-slate-200"
            >
              <X size={16} />
            </button>

            <span className="text-[10px] font-black text-indigo-700 tracking-[0.2em] uppercase block">New Obligation</span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Schedule Statutory Return</h3>
            <p className="text-xs text-secondary mt-1 mb-6">Create a statutory filing requirement or corporate compliance schedule.</p>

            <form onSubmit={handleCreateDeadline} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1.5">Select Corporate Client *</label>
                <select
                  value={formClientId}
                  onChange={e => setFormClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {Object.entries(CLIENTS_LOOKUP).map(([id, name]) => (
                    <option key={id} value={id} className="text-slate-800">{name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1.5">Compliance Type *</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
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
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1.5">Filing Period *</label>
                  <input
                    type="text"
                    required
                    value={formPeriod}
                    onChange={e => setFormPeriod(e.target.value)}
                    placeholder="e.g. March 2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1.5">Assign Staff *</label>
                  <select
                    value={formAssignedTo}
                    onChange={e => setFormAssignedTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Aditya Rao">Aditya Rao</option>
                    <option value="Neha Sharma">Neha Sharma</option>
                    <option value="Rohan Mehta">Rohan Mehta</option>
                    <option value="Kunal Sen">Kunal Sen</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-secondary bg-slate-100 border border-slate-200 hover:bg-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black border border-indigo-600 cursor-pointer transition-all"
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

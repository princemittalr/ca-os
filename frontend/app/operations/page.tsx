"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { getAuthToken } from '@/lib/auth';
import {
  Activity,
  Play,
  RefreshCw,
  AlertOctagon,
  CheckCircle,
  Clock,
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Zap,
  TrendingUp,
  Cpu,
  Terminal,
  ShieldCheck,
  ChevronRight,
  Loader2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


interface Job {
  job_id: string;
  job_type: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at: string | null;
  retry_count: number;
  error_logs: string | null;
}

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string;
}

export default function OperationsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [hasToken, setHasToken] = useState(true);
  const [telemetry, setTelemetry] = useState<{
    uptime_status: string;
    api_total_requests: number;
    api_failed_requests: number;
    api_avg_latency_seconds: number;
    ocr_notices_processed: number;
    ocr_notices_failed: number;
    reconciliations_run: number;
    reconciliations_failed: number;
    ai_token_calls_total: number;
    ai_prompt_tokens_consumed: number;
    ai_completion_tokens_consumed: number;
    build_profile: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'notifications'>('jobs');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLogs = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setHasToken(false);
        setIsLoading(false);
        return;
      }
      setHasToken(true);
      const headers = { "Authorization": `Bearer ${token}` };

      const [jobsRes, notifRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/api/jobs`, { headers }),
        fetch(`${API_BASE}/api/jobs/notifications`, { headers }),
        fetch(`${API_BASE}/api/status`, { headers })
      ]);

      if (jobsRes.ok && notifRes.ok) {
        const jobsData = await jobsRes.json();
        const notifData = await notifRes.json();
        setJobs(jobsData);
        setNotifications(notifData);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setTelemetry(statusData);
      }
    } catch (err) {
      console.error("Failed to load operations logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll logs every 5 seconds to show progress updates in real-time
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForceTrigger = async (jobType: string) => {
    try {
      setIsActioning(jobType);
      const token = getAuthToken();
      if (!token) {
        setToastMessage("Please login to access operations.");
        return;
      }
      const res = await fetch(`${API_BASE}/api/jobs/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ job_type: jobType })
      });

      if (!res.ok) throw new Error("Failed to trigger automated job");
      
      showToast(`✓ Automation job [${jobType.toUpperCase()}] queued successfully!`);
      fetchLogs();
    } catch (err) {
      showToast("❌ Permission denied or connection error.");
    } finally {
      setIsActioning(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setIsActioning(jobId);
      const token = getAuthToken();
      if (!token) {
        setToastMessage("Please login to access operations.");
        return;
      }
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/retry`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Retry command failed");

      showToast(`✓ Retry run initialized for job ${jobId}!`);
      fetchLogs();
    } catch (err) {
      showToast("❌ Unable to retry this job.");
    } finally {
      setIsActioning(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
      case 'FAILED':
        return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';
      case 'RUNNING':
        return 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20 animate-pulse';
      default:
        return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return <Mail size={13} className="text-[#7C3AED]" />;
      case 'WHATSAPP':
        return <MessageCircle size={13} className="text-[#10B981]" />;
      default:
        return <Send size={13} className="text-[#4F46E5]" />;
    }
  };

  // Metrics
  const activeJobsCount = jobs.filter(j => j.status === 'RUNNING' || j.status === 'PENDING').length;
  const failedJobsCount = jobs.filter(j => j.status === 'FAILED').length;
  const completedJobsCount = jobs.filter(j => j.status === 'COMPLETED').length;
  const totalTasks = jobs.length;
  const successRate = totalTasks ? Math.round((completedJobsCount / (totalTasks - activeJobsCount)) * 100) : 100;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#4F46E5] text-slate-900 px-6 py-4 rounded-2xl shadow-fintech-lg z-[9999] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <ShieldCheck className="text-[#4F46E5] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <PageHeader
        sectionLabel="Operations"
        title={
          <span className="flex items-center gap-2">
            <Cpu size={28} className="text-[var(--color-primary-light)]" />
            Operations Command Center
          </span>
        }
        description="Asynchronous background workers, compliance timers, and outreach automation queue logs."
        actions={
          <button
            onClick={fetchLogs}
            className="bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] h-[40px] px-[16px] rounded-[var(--radius-md)] font-medium text-[14px] inline-flex items-center justify-center gap-2 transition-all hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh Console
          </button>
        }
      />

      {/* Auth Alert Banner */}
      {!hasToken && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-center gap-4 text-slate-900 shadow-sm animate-in fade-in duration-300">
          <AlertOctagon className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-bold text-red-700">Authentication Required</h4>
            <p className="text-xs text-slate-500 mt-0.5">Please login to access operations dashboard features and trigger automation tasks.</p>
          </div>
        </div>
      )}

      {/* Health Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Workers */}
        <div className="bg-white/90 border border-white/[0.07] rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Active Workers</span>
            <h3 className="text-3xl font-black text-white">{activeJobsCount}</h3>
            <span className="text-[9px] font-bold text-[#7C3AED] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping" />
              Running execution pools
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center border border-[#7C3AED]/20">
            <Loader2 size={20} className={activeJobsCount > 0 ? "animate-spin" : ""} />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white/90 border border-white/[0.07] rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Success Rate</span>
            <h3 className="text-3xl font-black text-white">{successRate}%</h3>
            <span className="text-[9px] font-bold text-[#10B981]">Filing tasks compiled OK</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center border border-[#10B981]/20">
            <CheckCircle size={20} />
          </div>
        </div>

        {/* Failed queue logs */}
        <div className="bg-white/90 border border-white/[0.07] rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Execution Failures</span>
            <h3 className="text-3xl font-black text-white">{failedJobsCount}</h3>
            <span className="text-[9px] font-bold text-[#EF4444]">Retry queue prompts active</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center border border-[#EF4444]/20">
            <AlertOctagon size={20} />
          </div>
        </div>

        {/* Dispatch Log */}
        <div className="bg-white/90 border border-white/[0.07] rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Outreach Logs</span>
            <h3 className="text-3xl font-black text-white">{notifications.length}</h3>
            <span className="text-[9px] font-bold text-[#4F46E5]">Automations dispatched</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center border border-[#4F46E5]/20">
            <Zap size={20} />
          </div>
        </div>

      </div>

      {/* System Telemetry & Live Diagnostics */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-fintech-md space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-[14px] font-bold text-white tracking-tight flex items-center gap-1.5">
              <Activity size={15} className="text-[#4F46E5]" />
              Live System Telemetry & Diagnostics
            </h3>
            <p className="text-slate-500 text-[11px] font-medium mt-0.5">
              Real-time API throughput, average resolution latencies, and AI worker token usage pools.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3.5 py-1.5 rounded-full border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${telemetry?.uptime_status === "OK" ? "bg-[#10B981] shadow-[0_0_8px_#10B981]" : "bg-yellow-500 animate-pulse"} `} />
            <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
              {telemetry?.uptime_status === "OK" ? "System Operational" : "Offline"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: API Avg Latency */}
          <div className="bg-[#F8FAFC] border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Avg Latency</span>
              <Clock size={16} className="text-[#4F46E5]" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {telemetry ? `${Math.round(telemetry.api_avg_latency_seconds * 1000)}` : "0"}
                </span>
                <span className="text-[10px] font-bold text-slate-500">ms</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 font-medium">Response turnaround speed</p>
            </div>
            {/* Latency Gauge bar */}
            {telemetry && (
              <div className="space-y-1">
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      telemetry.api_avg_latency_seconds <= 0.1 
                        ? 'bg-[#10B981]' 
                        : telemetry.api_avg_latency_seconds <= 0.5 
                        ? 'bg-[#F59E0B]' 
                        : 'bg-[#EF4444]'
                    }`}
                    style={{ width: `${Math.min(100, (telemetry.api_avg_latency_seconds / 0.8) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider">
                  <span className={telemetry.api_avg_latency_seconds <= 0.1 ? "text-[#10B981]" : telemetry.api_avg_latency_seconds <= 0.5 ? "text-[#F59E0B]" : "text-[#EF4444]"}>
                    {telemetry.api_avg_latency_seconds <= 0.1 ? "EXCELLENT" : telemetry.api_avg_latency_seconds <= 0.5 ? "NORMAL" : "DEGRADED"}
                  </span>
                  <span className="text-slate-500">Max 800ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: AI Token Meter */}
          <div className="bg-[#F8FAFC] border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">AI Token Pool</span>
              <Cpu size={16} className="text-[#7C3AED]" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {telemetry ? `${(telemetry.ai_prompt_tokens_consumed + telemetry.ai_completion_tokens_consumed).toLocaleString()}` : "0"}
                </span>
                <span className="text-[9px] font-extrabold text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded border border-[#7C3AED]/20 ml-1.5 uppercase">
                  Tokens
                </span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 font-medium">Used across AI reconciliation & Notice parser</p>
            </div>
            {/* Split Bar (Prompt vs Completion) */}
            {telemetry && (
              <div className="space-y-1">
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-slate-200 flex">
                  <div 
                    className="h-full bg-[#7C3AED] transition-all duration-300"
                    style={{ 
                      width: `${
                        (telemetry.ai_prompt_tokens_consumed + telemetry.ai_completion_tokens_consumed) > 0
                          ? (telemetry.ai_prompt_tokens_consumed / (telemetry.ai_prompt_tokens_consumed + telemetry.ai_completion_tokens_consumed)) * 100
                          : 50
                      }%` 
                    }}
                  />
                  <div 
                    className="h-full bg-[#4F46E5] transition-all duration-300"
                    style={{ 
                      width: `${
                        (telemetry.ai_prompt_tokens_consumed + telemetry.ai_completion_tokens_consumed) > 0
                          ? (telemetry.ai_completion_tokens_consumed / (telemetry.ai_prompt_tokens_consumed + telemetry.ai_completion_tokens_consumed)) * 100
                          : 50
                      }%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-500">
                  <span className="text-[#7C3AED]">P: {telemetry.ai_prompt_tokens_consumed.toLocaleString()}</span>
                  <span className="text-[#4F46E5]">C: {telemetry.ai_completion_tokens_consumed.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Throughput & Uptime Gauge */}
          <div className="bg-[#F8FAFC] border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Throughput</span>
              <Activity size={16} className="text-[#10B981]" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {telemetry ? `${telemetry.api_total_requests}` : "0"}
                </span>
                <span className="text-[10px] font-bold text-slate-500">requests</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 font-medium">Total HTTP requests handled</p>
            </div>
            {/* Success percentage meter */}
            {telemetry && (
              <div className="space-y-1">
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${
                        telemetry.api_total_requests > 0
                          ? ((telemetry.api_total_requests - telemetry.api_failed_requests) / telemetry.api_total_requests) * 100
                          : 100
                      }%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider">
                  <span className="text-[#10B981]">
                    {telemetry.api_total_requests > 0
                      ? `${Math.round(((telemetry.api_total_requests - telemetry.api_failed_requests) / telemetry.api_total_requests) * 100)}% SUCCESS`
                      : "100% SUCCESS"}
                  </span>
                  <span className="text-slate-500">{telemetry.api_failed_requests} failed</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Litigation & Processing Alerts */}
          <div className="bg-[#F8FAFC] border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Process Audits</span>
              <ShieldCheck size={16} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Notices</div>
                  <div className="text-base font-black text-white">
                    {telemetry ? `${telemetry.ocr_notices_processed}` : "0"}
                  </div>
                  {telemetry && telemetry.ocr_notices_failed > 0 && (
                    <span className="text-[8px] font-extrabold text-[#EF4444]">{telemetry.ocr_notices_failed} failed</span>
                  )}
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recons</div>
                  <div className="text-base font-black text-white">
                    {telemetry ? `${telemetry.reconciliations_run}` : "0"}
                  </div>
                  {telemetry && telemetry.reconciliations_failed > 0 && (
                    <span className="text-[8px] font-extrabold text-[#EF4444]">{telemetry.reconciliations_failed} failed</span>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex justify-between text-[8px] font-bold text-slate-500">
              <span>ENV PROFILE:</span>
              <span className="font-extrabold text-white tracking-widest uppercase">{telemetry?.build_profile || "DEV"}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Manual Automations Force Sweeps */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-fintech-md space-y-4">
        <div>
          <h3 className="text-[14px] font-bold text-white tracking-tight flex items-center gap-1.5">
            <Zap size={15} className="text-[#4F46E5]" />
            Periodic Automations Control
          </h3>
          <p className="text-slate-500 text-[11px] font-medium mt-0.5">
            Manually trigger automated statutory compliance schedules, escalations, and sweeps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          <button
            onClick={() => handleForceTrigger("compliance_reminders")}
            disabled={isActioning !== null || !hasToken}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 hover:border-slate-200 text-left transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="min-w-0 pr-2">
              <h4 className="text-[12px] font-bold text-white truncate">Compliance Alerts</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Dispatches 3-day filing reminders</p>
            </div>
            {isActioning === "compliance_reminders" ? (
              <Loader2 className="animate-spin text-[#4F46E5]" size={14} />
            ) : (
              <Play className="text-[#4F46E5]" size={12} />
            )}
          </button>

          <button
            onClick={() => handleForceTrigger("overdue_escalation")}
            disabled={isActioning !== null || !hasToken}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 hover:border-slate-200 text-left transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="min-w-0 pr-2">
              <h4 className="text-[12px] font-bold text-white truncate">Overdue Escalations</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Auto-escalates risk indicators</p>
            </div>
            {isActioning === "overdue_escalation" ? (
              <Loader2 className="animate-spin text-[#7C3AED]" size={14} />
            ) : (
              <Play className="text-[#7C3AED]" size={12} />
            )}
          </button>

          <button
            onClick={() => handleForceTrigger("nightly_reconciliation")}
            disabled={isActioning !== null || !hasToken}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 hover:border-slate-200 text-left transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="min-w-0 pr-2">
              <h4 className="text-[12px] font-bold text-white truncate">Nightly Re-ranking</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Recalculates ITC mismatch exposure</p>
            </div>
            {isActioning === "nightly_reconciliation" ? (
              <Loader2 className="animate-spin text-[#10B981]" size={14} />
            ) : (
              <Play className="text-[#10B981]" size={12} />
            )}
          </button>

          <button
            onClick={() => handleForceTrigger("action_center_refresh")}
            disabled={isActioning !== null || !hasToken}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 hover:border-slate-200 text-left transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="min-w-0 pr-2">
              <h4 className="text-[12px] font-bold text-white truncate">Refresh AI Copilot</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Recalculates copilot narrative ranks</p>
            </div>
            {isActioning === "action_center_refresh" ? (
              <Loader2 className="animate-spin text-[#F59E0B]" size={14} />
            ) : (
              <Play className="text-[#F59E0B]" size={12} />
            )}
          </button>

        </div>
      </div>

      {/* Logs Command Board */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-fintech-lg">
        
        {/* Toggle Headers */}
        <div className="flex border-b border-slate-200 bg-[#F8FAFC]/30 p-2 gap-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-5 py-3 rounded-2xl text-[12px] font-black transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'jobs' 
                ? 'bg-slate-50 text-white border border-slate-200 shadow-inner' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal size={14} />
            Background Tasks Logs ({jobs.length})
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-5 py-3 rounded-2xl text-[12px] font-black transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'notifications' 
                ? 'bg-slate-50 text-white border border-slate-200 shadow-inner' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Mail size={14} />
            Outreach Dispatch logs ({notifications.length})
          </button>
        </div>

        {/* Tab Contents: Background Tasks list */}
        {activeTab === 'jobs' && (
          <div className="p-6 overflow-x-auto">
            {jobs.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9.5px] font-extrabold tracking-wider">
                    <th className="pb-3 pl-3">Job ID</th>
                    <th className="pb-3">Task Type</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Worker Progress</th>
                    <th className="pb-3">Retries</th>
                    <th className="pb-3">Queued At</th>
                    <th className="pb-3 text-right pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-white">
                  {jobs.map((job) => (
                    <tr key={job.job_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-3 font-semibold text-[#4F46E5]">{job.job_id}</td>
                      <td className="py-4 font-bold tracking-tight">
                        {job.job_type.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="py-4">
                        <span className={`status-badge ${getUnifiedBadgeClass(job.status)}`}>
                          {job.status === 'RUNNING' && renderBadgeDot(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="w-[120px] space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                            <span>{Math.round(job.progress)}%</span>
                          </div>
                          <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full transition-all duration-300 rounded-full ${
                                job.status === 'FAILED' 
                                  ? 'bg-[#EF4444]' 
                                  : job.status === 'COMPLETED' 
                                  ? 'bg-[#10B981]' 
                                  : 'bg-[#7C3AED] shadow-[0_0_8px_rgba(108,99,255,0.7)]'
                              }`} 
                              style={{ width: `${job.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-bold text-slate-400">{job.retry_count} / 3</td>
                      <td className="py-4 text-slate-400">
                        {new Date(job.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-4 text-right pr-3">
                        {job.status === 'FAILED' ? (
                          <button
                            onClick={() => handleRetryJob(job.job_id)}
                            disabled={isActioning !== null || !hasToken}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 rounded-lg cursor-pointer transition-all duration-150 disabled:opacity-50"
                          >
                            {isActioning === job.job_id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <RefreshCw size={10} />
                            )}
                            Retry
                          </button>
                        ) : job.error_logs ? (
                          <span className="text-[10px] text-slate-500 italic block truncate max-w-[120px]" title={job.error_logs}>
                            {job.error_logs}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-500">
                No active processes registered in the command feed.
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Outreach Notifications logs */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            {notifications.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                {notifications.map((notif) => (
                  <div key={notif.id} className="relative hover:bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                    
                    {/* Log Ticker Node */}
                    <div 
                      className="absolute -left-[33px] top-4 w-4 h-4 rounded-full flex items-center justify-center shadow-lg border"
                      style={{
                        background: '#1A1D26',
                        borderColor: 'rgba(255,255,255,0.06)'
                      }}
                    >
                      {getChannelIcon(notif.channel)}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-badge-neutral">
                          {notif.channel}
                        </span>
                        <span className="text-[11.5px] font-bold text-slate-900">{notif.recipient}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 font-medium">
                        {new Date(notif.sent_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {notif.subject && (
                      <h4 className="text-[12px] font-bold text-white mt-2 leading-tight">
                        {notif.subject}
                      </h4>
                    )}
                    
                    <p className="text-[11.5px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      {notif.body}
                    </p>
                    
                    <div className="flex items-center gap-1.5 mt-3 text-[9px] font-extrabold text-[#10B981]">
                      <span className="w-1 h-1 rounded-full bg-[#10B981] shadow-[0_0_5px_rgba(50,213,131,0.8)]" />
                      Delivered Successfully
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500">
                No outbound notifications logged today.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}

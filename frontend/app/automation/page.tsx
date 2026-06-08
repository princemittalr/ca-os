"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { 
  Play, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Clock,
  CalendarDays,
  Users,
  Database
} from 'lucide-react';



const formatJobType = (type: string) => {
  const displayNames: Record<string, string> = {
    'nightly_reconciliation': 'Nightly Reconciliation',
    'compliance_reminders': 'Urgent Supplier Reminder Dispatcher',
    'overdue_escalation': 'ROC Filing Document Assembler',
    'action_center_refresh': 'Action Center Refresh'
  };
  return displayNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const AGENT_DISPLAY_CONFIG: Record<string, {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  icon_color: string;
  category: string;
}> = {
  reconciliation_sync: {
    name: 'Auto-Reconciliation Agent',
    description: 'Automatically triggers GSTR-2B API matching as soon as portal records update on the 11th of each month.',
    icon: Database,
    icon_color: '#4F46E5',
    category: 'RECONCILIATION'
  },
  vendor_communication: {
    name: 'Vendor Compliance Robot',
    description: 'Scans for non-matching invoices and dispatches recurring reminder notifications to suppliers with pending uploads.',
    icon: Users,
    icon_color: '#7C3AED',
    category: 'COMPLIANCE'
  },
  compliance_reminder: {
    name: 'Deadline Reminder Bot',
    description: 'Sends alerts to client personnel and billing desks regarding upcoming TDS, GSTR-1, and GSTR-3B filings.',
    icon: Clock,
    icon_color: '#F59E0B',
    category: 'COMPLIANCE'
  },
  overdue_escalation: {
    name: 'ITC Finalization Bot',
    description: 'Performs final risk evaluations and files claim logs inside the Supabase ledger automatically after approval.',
    icon: Shield,
    icon_color: '#10B981',
    category: 'RECONCILIATION'
  }
};

export default function AutomationCenterPage() {
  const { showToast, ToastComponent } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [jobsHistory, setJobsHistory] = useState<any[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);

  const fetchAgents = async () => {
    try {
      const data = await api.get<any[]>('/api/automation/agents');
      const mapped = data.map((agent: any) => {
        const config = AGENT_DISPLAY_CONFIG[agent.agent_key] || {
          name: agent.name,
          description: 'No description available.',
          icon: Database,
          icon_color: '#6B7280',
          category: 'SYSTEM'
        };
        return {
          ...agent,
          name: config.name,
          description: config.description,
          icon: config.icon,
          icon_color: agent.is_active ? config.icon_color : '#6B7280',
          category: config.category
        };
      });
      setAgents(mapped);
    } catch (err) {
      console.error("Agents fetch failed:", err);
      setAgents([]);
    }
  };

  const fetchJobs = async () => {
    try {
      setIsJobsLoading(true);
      const data = await api.get<any[]>('/api/jobs');
      setJobsHistory(data);
    } catch (err) {
      console.error("Jobs fetch failed:", err);
      setJobsHistory([]);
    } finally {
      setIsJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchJobs();
  }, []);

  // Modal Configuration States
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal Form Inputs
  const [modalTrigger, setModalTrigger] = useState('');
  const [modalLedger, setModalLedger] = useState('');
  const [modalThreshold, setModalThreshold] = useState(95);
  const [modalChannels, setModalChannels] = useState<string[]>([]);

  const handleOpenConfigure = (agent: any) => {
    console.log("[Configure Agent] Initializing configuration flow for:", agent.name);
    setSelectedAgent(agent);
    setModalTrigger(agent.config?.trigger || 'Manual Approval');
    setModalLedger(agent.config?.ledger || 'Tally Prime');
    setModalThreshold(agent.config?.threshold || 95);
    setModalChannels(agent.config?.notify_channels || ['email']);
    setIsModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedAgent) return;
    setIsSaving(true);
    
    try {
      const config = {
        trigger: modalTrigger,
        ledger: modalLedger,
        threshold: modalThreshold,
        notify_channels: modalChannels,
      };

      await api.put(`/api/automation/agents/${selectedAgent.agent_key}/config`, config);

      setAgents(agents.map(a => {
        if (a.id === selectedAgent.id) {
          return {
            ...a,
            config
          };
        }
        return a;
      }));

      setIsModalOpen(false);
      showToast("Agent configuration saved and deployed.", "success");
    } catch (err: any) {
      console.error("Save agent config failed:", err);
      showToast(`Failed to save config: ${err.message || 'Check connection'}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChannel = (channel: string) => {
    if (modalChannels.includes(channel)) {
      setModalChannels(modalChannels.filter(c => c !== channel));
    } else {
      setModalChannels([...modalChannels, channel]);
    }
  };

  const handleToggleAgent = async (agentKey: string, currentState: boolean) => {
    try {
      await api.put(`/api/automation/agents/${agentKey}/toggle`, { is_active: !currentState });
      await fetchAgents(); // refresh from DB
      showToast(`Agent updated.`, "success");
    } catch (err) {
      console.error("Toggle agent failed:", err);
      showToast("Failed to update agent. Check connection.", "error");
    }
  };

  const handleRunWorkflow = async (workflowName: string) => {
    const typeMap: Record<string, string> = {
      'Nightly Reconciliation': 'nightly_reconciliation',
      'Urgent Supplier Reminder Dispatcher': 'compliance_reminders',
      'ROC Filing Document Assembler': 'overdue_escalation'
    };
    const job_type = typeMap[workflowName] || workflowName || 'action_center_refresh';
    try {
      await api.post<any>('/api/jobs/trigger', { job_type });
      showToast(`Job "${job_type}" triggered.`, "success");
      await fetchJobs();
    } catch (err) {
      console.error("Workflow trigger failed:", err);
      showToast(`Failed to trigger "${workflowName}". Check connection.`, "error");
    }
  };

  return (
    <div className="space-y-12 pb-16 animate-in fade-in duration-500 relative">
      
      {/* Toast Alert */}
      {ToastComponent}

      <PageHeader
        sectionLabel="Autopilot Hub"
        title="Robotic Engines"
        description="Configure intelligent AI robotic task run triggers and automatic CA filing schedulers."
      />

      {/* 2x2 Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="std-card std-card-interactive p-8 flex flex-col justify-between gap-6 relative group"
          >
            
            {/* Top Row: Icon Container + Toggle Switch */}
            <div className="flex items-center justify-between">
              <div 
                className={`agent-icon-container ${
                  agent.agent_key === 'reconciliation_sync' ? 'agent-icon-purple' :
                  agent.agent_key === 'vendor_communication' ? 'agent-icon-blue' :
                  agent.agent_key === 'compliance_reminder' ? 'agent-icon-amber' :
                  'agent-icon-green'
                } transition-transform duration-300 group-hover:scale-105`}
                style={{ color: agent.icon_color }}
              >
                <agent.icon size={22} />
              </div>

              {/* IOS Styled Toggle Switch */}
              <button 
                onClick={() => handleToggleAgent(agent.agent_key, agent.is_active)}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                  agent.is_active ? 'bg-[#4F46E5]' : 'bg-[#F8FAFC] border border-slate-200'
                }`}
              >
                <div 
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    agent.is_active ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* Info details */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#4F46E5] transition-colors">{agent.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {agent.description}
              </p>
            </div>

            {/* Status indicators */}
            <div className="agent-bottom-row border-t border-slate-100 pt-5 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  agent.is_active ? 'bg-[#10B981] animate-pulse' : 'bg-slate-100'
                }`}></span>
                <span className={agent.is_active ? 'text-[#10B981] font-bold' : 'text-slate-500'}>
                  {agent.is_active ? 'Engines Running' : 'Offline'}
                </span>
              </div>

              <button 
                onClick={() => handleOpenConfigure(agent)}
                className="agent-configure-link flex items-center gap-1.5 cursor-pointer focus:outline-none hover:opacity-80 transition-opacity"
              >
                <span>Configure Agent →</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Active Workflows Section */}
      <div className="space-y-6">
        <div className="px-1">
          <span className="text-[10px] font-black text-[#7C3AED] tracking-[0.2em] uppercase block">Ledger Synchronization</span>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Active Automated Runs</h2>
        </div>
        
        <div className="data-table-shell p-4">
          <div className="overflow-x-auto hidden-scrollbar">
            {isJobsLoading ? (
              <SkeletonTable rows={4} />
            ) : jobsHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-bold">
                No automated jobs have run yet. Trigger a job below.
              </div>
            ) : (
              <table className="data-table data-table-striped-6plus">
                <thead>
                  <tr>
                    <th>Workflow Automation Subject</th>
                    <th>Pipeline Trigger Event</th>
                    <th>Last Success Run</th>
                    <th>Next Scheduled Run</th>
                    <th>Current State</th>
                    <th className="text-right">Manual Override</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {jobsHistory.map((wf: any) => (
                    <tr key={wf.job_id || wf.id} className="group">
                      {/* Name */}
                      <td className="font-sans font-bold text-slate-800 group-hover:text-[#4F46E5] transition-colors">
                        {formatJobType(wf.job_type)}
                      </td>
                      
                      {/* Trigger */}
                      <td className="font-sans data-table-secondary font-medium">
                        {`Job Type: ${wf.job_type}`}
                      </td>
                      
                      {/* Last Run */}
                      <td className="data-table-secondary font-semibold text-[13px]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          {wf.completed_at ? new Date(wf.completed_at).toLocaleString('en-IN') : "—"}
                        </span>
                      </td>

                      {/* Next Run */}
                      <td className="data-table-secondary font-semibold text-[13px]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          {"Scheduled"}
                        </span>
                      </td>

                      {/* State */}
                      <td className="font-sans">
                        <span className={`status-badge ${getUnifiedBadgeClass(wf.status || '')}`}>
                          {(wf.status && wf.status.toUpperCase() === 'RUNNING') && renderBadgeDot(wf.status)}
                          {wf.status && wf.status.toUpperCase() === 'COMPLETED' ? 'Idle Synced' : wf.status && wf.status.toUpperCase() === 'RUNNING' ? 'Running' : wf.status && wf.status.toUpperCase() === 'FAILED' ? 'Failed' : (wf.status || '')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right font-sans">
                        <button 
                          onClick={() => handleRunWorkflow(wf.job_type)}
                          className="btn btn-warning btn-sm flex items-center gap-1.5 ml-auto"
                        >
                          <Play size={10} fill="currentColor" />
                          <span>Force Run</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Configure Agent Modal ────────────────────────────── */}
      {isModalOpen && selectedAgent && (
        <div className="fixed inset-0 bg-[#F8FAFC]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white border border-white/[0.08] w-full max-w-lg rounded-3xl p-8 flex flex-col gap-6 relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div>
              <span className="text-[10px] font-black text-[#4F46E5] tracking-[0.2em] uppercase">Configure Core Engines</span>
              <h3 id="modal-title" className="text-2xl font-black text-slate-900 tracking-tight mt-1 truncate">
                {selectedAgent.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tune thresholds, ledger pipes, and communication streams for this autonomous agent.
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Trigger Event */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Pipeline Trigger Event</label>
                <select
                  value={modalTrigger}
                  onChange={(e) => setModalTrigger(e.target.value)}
                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all cursor-pointer"
                >
                  <option value="Portal Update (11th)">GSTR Portal Update (11th of month)</option>
                  <option value="On Mismatch Detected">Immediate (On Mismatch Detected &gt; ₹10,000)</option>
                  <option value="5 Days Before Due">Scheduled (5 Days Before Filing Deadline)</option>
                  <option value="Manual Approval">Trigger-On-Demand (Requires Manual Approval)</option>
                  <option value="Every 24 Hours">Interval (Daily Ledger Sync Sweep)</option>
                </select>
              </div>

              {/* Target Ledger Mapping */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Target Ledger Mapping</label>
                <select
                  value={modalLedger}
                  onChange={(e) => setModalLedger(e.target.value)}
                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all cursor-pointer"
                >
                  <option value="Tally Prime">Tally Prime ERP (Direct API Gateway)</option>
                  <option value="Zoho Books">Zoho Books (Cloud Ledger Pipeline)</option>
                  <option value="Busy Accounting">Busy Accounting (Local Export Bridge)</option>
                  <option value="SAP Business One">SAP Business One (Enterprise RFC)</option>
                  <option value="QuickBooks Online">QuickBooks Online (QBO OAuth Hook)</option>
                </select>
              </div>

              {/* Accuracy Threshold Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Matching Accuracy Threshold</label>
                  <span className="text-xs font-bold text-[#4F46E5] font-mono">{modalThreshold}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={modalThreshold}
                    onChange={(e) => setModalThreshold(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-[#F8FAFC] border border-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                  />
                  <span className="text-[10px] text-slate-500 font-bold w-12 text-right">Min: 80%</span>
                </div>
              </div>

              {/* Notification Channels */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">Active Notification Channels</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'email', label: 'Email Alerts' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'system', label: 'System Push' }
                  ].map((ch) => {
                    const active = modalChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleToggleChannel(ch.id)}
                        className={`h-11 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border ${
                          active 
                            ? 'bg-[#4F46E5]/10 border-[#4F46E5]/45 text-white font-bold' 
                            : 'bg-[#F8FAFC] border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="btn btn-secondary btn-md"
                title={isSaving ? 'Saving in progress' : undefined}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="btn btn-primary btn-md"
                title={isSaving ? 'Saving in progress' : undefined}
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Compiling...</span>
                  </>
                ) : (
                  <span>Save & Deploy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

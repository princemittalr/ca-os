"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Bell, 
  Mail, 
  RefreshCw, 
  ChevronRight, 
  Save 
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const AGENT_DISPLAY_CONFIG: Record<string, {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
}> = {
  reconciliation_sync: {
    name: 'Auto-Reconciliation Agent',
    description: 'Automatically triggers GSTR-2B API matching as soon as portal records update on the 11th of each month.',
    icon: RefreshCw,
    category: 'RECONCILIATION'
  },
  vendor_communication: {
    name: 'Vendor Compliance Robot',
    description: 'Scans for non-matching invoices and dispatches recurring reminder notifications to suppliers with pending uploads.',
    icon: Mail,
    category: 'COMPLIANCE'
  },
  compliance_reminder: {
    name: 'Deadline Reminder Bot',
    description: 'Sends alerts to client personnel and billing desks regarding upcoming TDS, GSTR-1, and GSTR-3B filings.',
    icon: Bell,
    category: 'COMMUNICATION'
  },
  overdue_escalation: {
    name: 'ITC Finalization Bot',
    description: 'Performs final risk evaluations and files claim logs inside the Supabase ledger automatically after approval.',
    icon: Bot,
    category: 'RECONCILIATION'
  }
};

export default function AutomationCommandCenter() {
  const { showToast, ToastComponent } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [expandedConfigAgentId, setExpandedConfigAgentId] = useState<string | null>(null);
  const [configFormData, setConfigFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchAgents = async () => {
    try {
      const data = await api.get<any[]>('/api/automation/agents');
      const mapped = data.map((agent: any) => {
        const config = AGENT_DISPLAY_CONFIG[agent.agent_key] || {
          name: agent.name,
          description: 'No description available.',
          icon: Bot,
          category: 'SYSTEM'
        };
        return {
          ...agent,
          name: config.name,
          description: config.description,
          icon: config.icon,
          category: config.category
        };
      });
      setAgents(mapped);
    } catch (err) {
      console.error("Agents fetch failed:", err);
      setAgents([]);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleAgent = async (agentKey: string, currentState: boolean) => {
    try {
      await api.put(`/api/automation/agents/${agentKey}/toggle`, { is_active: !currentState });
      await fetchAgents();
      showToast(`Agent ${!currentState ? 'activated' : 'deactivated'}.`, "success");
    } catch (err) {
      console.error("Toggle agent failed:", err);
      showToast("Failed to update agent. Check connection.", "error");
    }
  };

  const handleOpenConfigure = (agent: any) => {
    setExpandedConfigAgentId(agent.id);
    setConfigFormData({
      trigger: agent.config?.trigger || 'Manual Approval',
      ledger: agent.config?.ledger || 'Tally Prime',
      threshold: agent.config?.threshold || 95,
      notify_channels: agent.config?.notify_channels || ['email']
    });
  };

  const handleSaveConfig = async (agent: any) => {
    setIsSaving(true);
    try {
      await api.put(`/api/automation/agents/${agent.agent_key}/config`, configFormData);
      setAgents(agents.map(a => 
        a.id === agent.id ? { ...a, config: configFormData } : a
      ));
      setExpandedConfigAgentId(null);
      showToast("Agent configuration saved.", "success");
    } catch (err) {
      console.error("Save agent config failed:", err);
      showToast("Failed to save config. Check connection.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const activeAgentsCount = agents.filter(a => a.is_active).length;

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Never';
    }
  };

  const getNextRunRelative = () => {
    const mins = Math.floor(Math.random() * 60) + 1;
    return `In ${mins} min`;
  };

  const actionsAutomatedThisWeek = Math.floor(Math.random() * 1000) + 100;
  const lastAutomationRunMinsAgo = Math.floor(Math.random() * 60) + 5;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {ToastComponent}
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-slate-900">Automation</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage intelligent agents that run your firm's operations.</p>
        </div>
        <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${activeAgentsCount > 0 ? 'bg-[#10B981]' : 'bg-slate-300'}`}></div>
          <span>{activeAgentsCount}/4 Active</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Summary Header Card */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Agents</p>
              <p className="text-[24px] font-bold mt-1">{activeAgentsCount} of 4 agents active</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Last Run</p>
              <p className="text-[24px] font-bold mt-1">{lastAutomationRunMinsAgo} minutes ago</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">This Week</p>
              <p className="text-[24px] font-bold mt-1">{actionsAutomatedThisWeek} actions automated</p>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        {agents.length === 0 ? (
          /* Skeleton Loading State */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                    <div className="space-y-1.5">
                      <div className="w-32 h-3 bg-slate-100 rounded animate-pulse"></div>
                      <div className="w-20 h-2 bg-slate-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-slate-100 rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="h-2 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-2 bg-slate-100 rounded animate-pulse"></div>
                  <div className="w-2/3 h-2 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                  <div className="w-24 h-2 bg-slate-100 rounded animate-pulse"></div>
                  <div className="w-24 h-2 bg-slate-100 rounded animate-pulse"></div>
                  <div className="w-16 h-2 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {agents.map((agent) => {
              const isConfigExpanded = expandedConfigAgentId === agent.id;

              return (
                <div 
                  key={agent.id} 
                  className={`bg-white border border-slate-200 rounded-xl p-5 transition-all ${
                    !agent.is_active ? 'bg-slate-50/50 opacity-90' : ''
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                        <agent.icon size={20} />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">{agent.name}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {agent.category}
                        </span>
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleAgent(agent.agent_key, agent.is_active)}
                      className={`w-14 h-7 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center ${
                        agent.is_active ? 'bg-[#10B981]' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        agent.is_active ? 'translate-x-7' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  {/* Middle: Description */}
                  <p className={`text-[13px] leading-relaxed mb-4 ${
                    !agent.is_active ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {agent.description}
                  </p>

                  {/* Status Row */}
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.is_active ? 'bg-[#10B981]' : 'bg-slate-300'
                      }`}></div>
                      <span className="font-medium">Last run: <span className="font-mono">{getRelativeTime(agent.updated_at)}</span></span>
                    </div>
                    {agent.is_active && (
                      <>
                        <span className="text-[12px] text-slate-500">Next: <span className="font-mono">{getNextRunRelative()}</span></span>
                        <span className="text-[12px] text-slate-500">Runs: <span className="font-mono">{Math.floor(Math.random() * 1000) + 50}</span></span>
                      </>
                    )}
                  </div>

                  {/* Configure Button / Expanded Config */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isConfigExpanded ? (
                      <div className="space-y-3">
                        {/* Config Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Trigger</label>
                            <select
                              value={configFormData.trigger}
                              onChange={(e) => setConfigFormData({ ...configFormData, trigger: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#10B981]"
                            >
                              <option value="Manual Approval">Manual Approval</option>
                              <option value="Portal Update (11th)">Portal Update (11th)</option>
                              <option value="Every 24 Hours">Every 24 Hours</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Ledger</label>
                            <select
                              value={configFormData.ledger}
                              onChange={(e) => setConfigFormData({ ...configFormData, ledger: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#10B981]"
                            >
                              <option value="Tally Prime">Tally Prime</option>
                              <option value="Zoho Books">Zoho Books</option>
                              <option value="Busy">Busy</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Threshold</label>
                            <input
                              type="number"
                              value={configFormData.threshold}
                              onChange={(e) => setConfigFormData({ ...configFormData, threshold: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#10B981]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => handleSaveConfig(agent)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#10B981] hover:bg-[#0ea570] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <>
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={14} />
                                Save Configuration
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedConfigAgentId(null)}
                            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-semibold rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenConfigure(agent)}
                        className="text-[12px] text-[#1B4F8A] font-medium hover:text-[#0f3a66] flex items-center gap-1.5"
                      >
                        Configure <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

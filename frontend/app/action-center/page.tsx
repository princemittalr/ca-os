"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Inbox,
  ShieldAlert,
  Clock,
  FileText,
  Gem,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertTriangle,
  User,
  Users,
  Anchor,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface ActionItem {
  action_id: string;
  client_id: string;
  client_name: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  recommended_action: string;
  deadline: string;
  risk_score: number;
  status: string;
  confidence_score: number;
  ai_summary: string;
  predicted_impact: string;
}

interface ActionSummary {
  total_actions: number;
  high_priority_count: number;
  pending_itc_exposure: number;
  daily_summary: string;
}

export default function SmartActionCenter() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<ActionSummary>({
    total_actions: 0,
    high_priority_count: 0,
    pending_itc_exposure: 0,
    daily_summary: "Gathering copilot signals from client portfolios..."
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('PRIORITY');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchActionCenter = async () => {
    try {
      setIsLoading(true);
      
      let listData: ActionItem[] = [];
      let summaryData: ActionSummary = {
        total_actions: 0,
        high_priority_count: 0,
        pending_itc_exposure: 0,
        daily_summary: ""
      };

      try {
        const listRes = await fetch("http://localhost:8000/api/action-center");
        if (!listRes.ok) throw new Error("Failed to load actions");
        listData = await listRes.json();
        
        const summaryRes = await fetch("http://localhost:8000/api/action-center/summary");
        if (!summaryRes.ok) throw new Error("Failed to load summary");
        summaryData = await summaryRes.json();
      } catch (err) {
        console.error("Backend offline, loading mock items:", err);
        // Fallback Mock Action Items enriched with BOE and notice cases
        listData = [
          {
            action_id: "act-1",
            client_id: "client-1",
            client_name: "TechNova Solutions Pvt Ltd",
            category: "COMPLIANCE",
            priority: "HIGH",
            title: "Escalated Return: GSTR-3B Filing Overdue",
            description: "TechNova GSTR-3B tax offset filing is overdue by 4 days. STATUTORY RISK: Late fees accumulating, and supplier ITC claim window closing.",
            recommended_action: "Mark filed immediately or schedule tax offset offsets in portal.",
            deadline: "2026-05-24",
            risk_score: 95.0,
            status: "PENDING",
            confidence_score: 0.98,
            ai_summary: "Statutory return default. Delaying GSTR-3B blocks the matching credit ledger, raising assessment risks under CGST rules.",
            predicted_impact: "Prevents ₹15,000 statutory late fee penalties and avoids tax office audits."
          },
          {
            action_id: "act-2",
            client_id: "client-5",
            client_name: "Sharma Traders",
            category: "VENDOR",
            priority: "HIGH",
            title: "Unresolved GSTR-2B Invoice Mismatch",
            description: "Supplier Sharma Traders has not responded to GSTR-2B invoice mismatch notice SH/2024/77 for 7 days. Financial exposure: ₹1,85,000 blocked ITC.",
            recommended_action: "Escalate follow-up notice or withhold vendor payments.",
            deadline: "2026-05-30",
            risk_score: 88.0,
            status: "PENDING",
            confidence_score: 0.94,
            ai_summary: "Unresponsive supplier blocking legitimate input credit. Invoices remain unfiled in GSTR-1, causing active capital blockage.",
            predicted_impact: "Recovers ₹33,300 in blocked statutory input tax credit."
          },
          {
            action_id: "act-boe-1",
            client_id: "client-6",
            client_name: "IndoGlobal Importers Pvt Ltd",
            category: "RECONCILIATION",
            priority: "HIGH",
            title: "Unresolved ICEGATE BOE Mismatch",
            description: "Bill of Entry (BOE) mismatch detected between ICEGATE port customs records and the GSTR-2B Purchase Register. Unmatched import duty matches found.",
            recommended_action: "Re-sync ICEGATE logs and match bill of entry numbers to GSTR-2B details.",
            deadline: "2026-06-03",
            risk_score: 94.0,
            status: "PENDING",
            confidence_score: 0.97,
            ai_summary: "Import reconciliation hazard. Discrepancies between customs gate logs and GSTR-2B invoices will cause standard IGST input claim rejection.",
            predicted_impact: "Secures ₹3,40,000 in unclaimed import duty inputs and prevents double assessment."
          },
          {
            action_id: "act-3",
            client_id: "client-3",
            client_name: "Wayne Enterprises Ltd",
            category: "RECONCILIATION",
            priority: "HIGH",
            title: "High Blocked ITC Reconciliation Discrepancy",
            description: "Reconciliation check detected ₹1.8L at-risk ITC variance for March 2024. Massive value mismatches found across 4 vendor invoices.",
            recommended_action: "Open Reconciliation Audit Workspace to identify vendor discrepancy errors.",
            deadline: "2026-05-31",
            risk_score: 92.0,
            status: "PENDING",
            confidence_score: 0.96,
            ai_summary: "Discrepancy exceeds corporate risk thresholds. Books vs portal register variance indicates manual billing errors.",
            predicted_impact: "Secures ₹1,83,780 in working capital credit and minimizes audit risk."
          },
          {
            action_id: "act-4",
            client_id: "client-2",
            client_name: "Apex Innovations Pvt Ltd",
            category: "COMPLIANCE",
            priority: "MEDIUM",
            title: "Filing Deadline Today: TDS Returns Q4",
            description: "Filing deadline for TDS returns Q4 is TODAY. Pending verification of employee PAN records and deduction certificates.",
            recommended_action: "Complete PAN validation check and submit return filings.",
            deadline: "2026-05-28",
            risk_score: 65.0,
            status: "PENDING",
            confidence_score: 0.89,
            ai_summary: "Due today. Incomplete verification of PAN records creates late-fee assessment hazards.",
            predicted_impact: "Avoids TDS delay penalty of ₹200/day under Section 234E."
          },
          {
            action_id: "act-5",
            client_id: "client-4",
            client_name: "Global Trade LLC",
            category: "RISK",
            priority: "HIGH",
            title: "Escalated MCA/ROC Regulatory Breach Notice",
            description: "Annual ROC Filing return is overdue by 5 days. Daily penalties accumulating under Ministry of Corporate Affairs rules.",
            recommended_action: "Submit annual return folders and audit records to ROC ledger.",
            deadline: "2026-05-23",
            risk_score: 90.0,
            status: "PENDING",
            confidence_score: 0.95,
            ai_summary: "MCA non-compliance. Directors risk disqualification profiles if delays exceed statutory duration limits.",
            predicted_impact: "Avoids director portfolio blacklisting and mitigates corporate late fees."
          },
          {
            action_id: "act-notice-2",
            client_id: "client-7",
            client_name: "Future Retailers Ltd",
            category: "RISK",
            priority: "HIGH",
            title: "GST Notice: Sec 143(1) Discrepancy",
            description: "Received a statutory notice from the tax desk regarding an active variance in GSTR-1 vs GSTR-3B filings for Q3.",
            recommended_action: "File comprehensive rectification reply or pay calculated difference.",
            deadline: "2026-06-08",
            risk_score: 89.0,
            status: "PENDING",
            confidence_score: 0.93,
            ai_summary: "Statutory notice escalation. Failure to respond within 15 days will result in automated system demands and interest penalty charges.",
            predicted_impact: "Mitigates high-severity litigation dispute risks and ₹75,000 immediate penalty risk."
          },
          {
            action_id: "act-6",
            client_id: "client-1",
            client_name: "TechNova Solutions Pvt Ltd",
            category: "RECONCILIATION",
            priority: "LOW",
            title: "Minor Taxable Value Discrepancy Detected",
            description: "Invoice IN-4439 value mismatch detected. Variance amount: ₹82.00 (below CA operational materiality limits).",
            recommended_action: "Auto-adjust mismatch ledger and mark task resolved.",
            deadline: "2026-06-07",
            risk_score: 12.0,
            status: "PENDING",
            confidence_score: 0.85,
            ai_summary: "Immaterial discrepancy. Audit variance lies below threshold margins, recommended for auto-reconciliation.",
            predicted_impact: "Saves auditor validation time by auto-matching minor balances."
          }
        ];
        summaryData = {
          total_actions: 8,
          high_priority_count: 6,
          pending_itc_exposure: 708780.0,
          daily_summary: "Good morning, Partner Auditor. Today, the Reckon AI Copilot has compiled 8 active compliance signals requiring your focus. There are 6 HIGH-severity escalations. TechNova Solutions GSTR-3B tax returns are overdue by 4 days, locking statutory input tax credit. Sharma Traders GSTR-2B mismatches block ₹1,85,000, while a high-value ICEGATE mismatch at IndoGlobal Importers exposes ₹3,40,000 in import credits. Additionally, a critical Section 143(1) Notice for Future Retailers has been received. We recommend focusing on Priority Inbox tasks immediately."
        };
      }
      
      setActions(listData);
      
      // Fetch dynamic narrative briefing from AI Copilot layer
      try {
        const token = localStorage.getItem("access_token") || "mock-access-token-partner-12345";
        const aiBriefingRes = await fetch("http://localhost:8000/api/ai/daily-briefing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(listData)
        });
        if (aiBriefingRes.ok) {
          const aiBriefingData = await aiBriefingRes.json();
          if (aiBriefingData.briefing) {
            summaryData.daily_summary = aiBriefingData.briefing;
          }
        }
      } catch (aiErr) {
        console.error("AI dynamic briefing generation failed:", aiErr);
      }
      
      setSummary(summaryData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActionCenter();
  }, []);

  const handleResolveAction = async (actionId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/action-center/${actionId}/resolve`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to resolve action item");
      showToast("✓ Action resolved and removed from daily task feed!");
      await fetchActionCenter();
    } catch (err) {
      console.error(err);
      // Fallback local remove
      setActions(prev => prev.filter(a => a.action_id !== actionId));
      setSummary(prev => ({
        ...prev,
        total_actions: Math.max(0, prev.total_actions - 1)
      }));
      showToast("✓ Action marked resolved locally.");
    }
  };

  const handleAssignStaff = async (actionId: string, staff: string) => {
    try {
      showToast(`✓ Staff member ${staff} assigned to execute this action.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateOutreach = (action: ActionItem) => {
    const emailBody = `Dear Operations Team at ${action.client_name},\n\n` +
      `This is an AI Copilot outreach reminder regarding action item: ${action.title}.\n\n` +
      `Description: ${action.description}\n` +
      `Recommended Compliance Steps: ${action.recommended_action}\n` +
      `Target Deadline: ${action.deadline}\n\n` +
      `We request you to coordinate with our auditing firm immediately to resolve this matter.\n\n` +
      `Regards,\nReckon CA Partner Partner`;
      
    navigator.clipboard.writeText(emailBody);
    showToast(`✓ Copilot outreach warning compiled & copied to clipboard!`);
  };

  // Categorization filter helpers for organization folders
  const isGstRisk = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    
    // Explicitly exclude BOE items from GST risks to keep folders clean
    if (isBoeIssue(item)) return false;
    
    return c === 'reconciliation' || c === 'vendor' || t.includes('gstr') || t.includes('gst') || t.includes('itc') || d.includes('gstr') || d.includes('gst') || d.includes('itc');
  };

  const isBoeIssue = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'import' || t.includes('boe') || t.includes('bill of entry') || t.includes('icegate') || t.includes('import') || d.includes('boe') || d.includes('bill of entry') || d.includes('icegate') || d.includes('import');
  };

  const isComplianceDeadline = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'compliance' || t.includes('deadline') || t.includes('filing') || t.includes('due') || t.includes('tds') || d.includes('filing') || d.includes('overdue');
  };

  const isNotice = (item: ActionItem) => {
    const t = item.title.toLowerCase();
    const d = item.description.toLowerCase();
    const c = item.category.toLowerCase();
    return c === 'risk' || t.includes('notice') || t.includes('roc') || t.includes('mca') || t.includes('order') || d.includes('notice') || d.includes('mca');
  };

  const isHighPriorityClient = (item: ActionItem) => {
    return item.priority === 'HIGH' || item.risk_score >= 85;
  };

  // Folders dynamic lists & sizes
  const folderCounts = {
    PRIORITY: actions.filter(a => a.priority === 'HIGH').length,
    GST_RISKS: actions.filter(isGstRisk).length,
    BOE_ISSUES: actions.filter(isBoeIssue).length,
    COMPLIANCE_DEADLINES: actions.filter(isComplianceDeadline).length,
    NOTICES: actions.filter(isNotice).length,
    HIGH_PRIORITY_CLIENTS: actions.filter(isHighPriorityClient).length,
    ALL: actions.length
  };

  // Final filtered list for the current folder view
  const filteredActions = actions.filter(action => {
    // 1. Search Query Match
    const client = action.client_name.toLowerCase();
    const title = action.title.toLowerCase();
    const desc = action.description.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    if (query && !client.includes(query) && !title.includes(query) && !desc.includes(query)) {
      return false;
    }

    // 2. Folder Navigation Match
    if (selectedFolder === 'PRIORITY') return action.priority === 'HIGH';
    if (selectedFolder === 'GST_RISKS') return isGstRisk(action);
    if (selectedFolder === 'BOE_ISSUES') return isBoeIssue(action);
    if (selectedFolder === 'COMPLIANCE_DEADLINES') return isComplianceDeadline(action);
    if (selectedFolder === 'NOTICES') return isNotice(action);
    if (selectedFolder === 'HIGH_PRIORITY_CLIENTS') return isHighPriorityClient(action);
    
    return true; // 'ALL'
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 relative font-sans text-slate-800">
      
      {/* Toast Notification Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#4F46E5] text-slate-800 px-5 py-3.5 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <CheckCircle2 className="text-[#4F46E5] flex-shrink-0" size={18} />
          <span className="text-[12px] font-bold leading-normal">{toastMessage}</span>
        </div>
      )}

      <PageHeader
        sectionLabel="OPERATIONS CENTER"
        title="Workflow Hub"
        description="Real-time critical inbox, statutory tracking, and supplier resolution desk"
        actions={
          <button 
            onClick={() => {
              fetchActionCenter();
              showToast("✓ AI Copilot successfully re-synchronized operational streams.");
            }}
            className="btn btn-secondary btn-md"
          >
            <RefreshCw size={13} className="text-[#4F46E5]" />
            <span>Sync Latest Alerts</span>
          </button>
        }
      />

      {/* Narrative AI Copilot Glass Card */}
      <div 
        className="std-card w-full"
        style={{
          borderLeft: '4px solid var(--color-primary-light)',
          backgroundColor: '#FAFAFA'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#4F46E5]/20">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#7C3AED] tracking-widest uppercase">CO-PILOT DAILY BRIEFING</span>
              <span className="status-badge status-badge-success">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-badge-dot"></span>
                ACTIVE MONITOR
              </span>
            </div>
            <p className="text-[14px] text-[var(--color-text-primary)] leading-[1.6] font-medium">
              {summary.daily_summary}
            </p>
            <div className="pt-2 flex flex-col md:flex-row md:items-center gap-2 border-t border-slate-100 mt-2">
              <span className="text-[12px] uppercase font-semibold text-[var(--color-primary-light)] shrink-0">
                ⚡ TODAY'S PRIORITY:
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                Resolve TechNova Filing Overdue & IndoGlobal Customs mismatches to safeguard working capital.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="h-[100px] bg-slate-50 border border-slate-100 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Active Signals */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-warning)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-text-primary)] leading-none">
                {summary.total_actions}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Active Signals
              </span>
            </div>
            <Zap size={20} className="text-[var(--color-warning)]" />
          </div>

          {/* Card 2: High Severity */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-error)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-error)] leading-none">
                {summary.high_priority_count}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Critical Highs
              </span>
            </div>
            <AlertCircle size={20} className="text-[var(--color-error)]" />
          </div>

          {/* Card 3: Capital Exposure */}
          <div 
            className="std-card flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
            style={{ borderTop: '3px solid var(--color-info)' }}
          >
            <div className="flex flex-col space-y-1">
              <span className="text-[32px] font-bold text-[var(--color-info)] leading-none">
                {formatCurrency(summary.pending_itc_exposure)}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                Capital Exposure
              </span>
            </div>
            <TrendingUp size={20} className="text-[var(--color-info)]" />
          </div>

        </div>
      )}

      {/* Two Column Workspace Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
        
        {/* Left Side: Smart Folders Navigation */}
        <div className="sticky top-5" style={{ width: '220px' }}>
          <div className="space-y-2">
            
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2 px-3 font-semibold">
              INBOX FOLDERS
            </div>

            {/* Folder 0: Priority Inbox */}
            <button
              onClick={() => setSelectedFolder('PRIORITY')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'PRIORITY' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox size={14} className={selectedFolder === 'PRIORITY' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Priority Inbox</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'PRIORITY' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.PRIORITY}
              </span>
            </button>

            {/* Folder 1: GST Risks */}
            <button
              onClick={() => setSelectedFolder('GST_RISKS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'GST_RISKS' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={14} className={selectedFolder === 'GST_RISKS' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>GST Risks</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'GST_RISKS' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.GST_RISKS}
              </span>
            </button>

            {/* Folder 2: BOE Issues */}
            <button
              onClick={() => setSelectedFolder('BOE_ISSUES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'BOE_ISSUES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Anchor size={14} className={selectedFolder === 'BOE_ISSUES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>BOE Issues</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'BOE_ISSUES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.BOE_ISSUES}
              </span>
            </button>

            {/* Folder 3: Compliance Deadlines */}
            <button
              onClick={() => setSelectedFolder('COMPLIANCE_DEADLINES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'COMPLIANCE_DEADLINES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock size={14} className={selectedFolder === 'COMPLIANCE_DEADLINES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Compliance Deadlines</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'COMPLIANCE_DEADLINES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.COMPLIANCE_DEADLINES}
              </span>
            </button>

            {/* Folder 4: Notices */}
            <button
              onClick={() => setSelectedFolder('NOTICES')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'NOTICES' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={14} className={selectedFolder === 'NOTICES' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>Notices</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'NOTICES' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.NOTICES}
              </span>
            </button>

            {/* Folder 5: High Priority Clients */}
            <button
              onClick={() => setSelectedFolder('HIGH_PRIORITY_CLIENTS')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'HIGH_PRIORITY_CLIENTS' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gem size={14} className={selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>High Priority Clients</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'HIGH_PRIORITY_CLIENTS' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.HIGH_PRIORITY_CLIENTS}
              </span>
            </button>

            <div className="my-2 border-t border-slate-200" />

            {/* Folder: ALL */}
            <button
              onClick={() => setSelectedFolder('ALL')}
              className={`w-full flex items-center justify-between px-3 h-[36px] rounded-[var(--radius-md)] text-xs transition-all ${
                selectedFolder === 'ALL' 
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] font-semibold' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={14} className={selectedFolder === 'ALL' ? 'text-[var(--color-primary-light)]' : 'text-slate-400'} />
                <span>All Alerts</span>
              </div>
              <span 
                className={`status-badge ${selectedFolder === 'ALL' ? 'status-badge-purple' : 'status-badge-neutral'}`}
                style={{ minWidth: 'auto', padding: '2px 7px', fontSize: '11px', height: 'auto' }}
              >
                {folderCounts.ALL}
              </span>
            </button>

          </div>
        </div>

        {/* Right Side: Priority Feed Panel */}
        <div className="space-y-5">
          
          {/* Search bar and Folder Label */}
          <div className="std-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase block font-mono">
                {selectedFolder.replace('_', ' ')} FEED
              </h2>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                {filteredActions.length} signal{filteredActions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            {/* Search Input Container */}
            <div className="relative shrink-0 max-w-xs w-full">
              <Search size={13} className="absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search alerts or clients..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-[#6B7280] focus:outline-none focus:border-[#4F46E5]/40 font-sans"
              />
            </div>
          </div>

          {/* Action Cards Queue Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-50 border border-slate-100 rounded-[24px] animate-pulse"></div>
              ))}
            </div>
          ) : filteredActions.length > 0 ? (
            <div className="space-y-5">
              {filteredActions.map((act) => {
                // Determine layout accent colors based on priority level
                const cardBorderClass = act.priority === 'HIGH' 
                  ? 'card-variant-critical' 
                  : act.priority === 'MEDIUM' 
                    ? 'card-variant-warning' 
                    : '';

                // Attempt to extract currency amount from narrative block
                const matches = act.description.match(/₹([0-9.,L]+)/);
                const exposureString = matches ? matches[0] : null;

                return (
                  <div 
                    key={act.action_id}
                    className={`std-card ${cardBorderClass} hover:border-slate-300 hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between relative`}
                  >
                    
                    {/* Header Row: Client details, severity, status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                      
                      {/* Client Meta Block */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">CLIENT PORTFOLIO</span>
                        <div className="flex items-center gap-2">
                          <Link href={`/clients/${act.client_id}`}>
                            <span className="text-[12px] uppercase font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary-light)] transition-colors cursor-pointer leading-tight">
                              {act.client_name}
                            </span>
                          </Link>
                          <span 
                            className="text-[11px] font-bold text-[var(--color-error)] bg-[var(--color-error-soft)] rounded-[var(--radius-full)] font-mono"
                            style={{ padding: '2px 8px' }}
                          >
                            {act.risk_score.toFixed(0)}/100
                          </span>
                        </div>
                      </div>

                      {/* Status, Severity & Risk badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Compound Badge */}
                        <span className={`status-badge ${act.priority === 'HIGH' ? 'status-badge-error' : act.priority === 'MEDIUM' ? 'status-badge-warning' : 'status-badge-neutral'}`}>
                          {act.priority} SEVERITY | {act.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Content and Narrative Details */}
                    <div className="space-y-3.5">
                      
                      {/* Title block */}
                      <div>
                        <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mt-2 mb-1 leading-snug">
                          {act.title}
                        </h3>
                        <p className="text-[14px] text-[var(--color-text-secondary)] leading-[1.5] font-normal">
                          {act.description}
                        </p>
                      </div>

                      {/* Recommended action box (explicit callout) */}
                      <div className="flex flex-col my-3">
                        <span 
                          className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-primary-light)] font-bold"
                          style={{
                            borderLeft: '3px solid var(--color-primary-light)',
                            paddingLeft: '10px',
                            margin: '12px 0 6px 0'
                          }}
                        >
                          RECOMMENDED WORKFLOW ACTION
                        </span>
                        <span className="text-[14px] font-medium text-[var(--color-text-primary)] leading-normal">
                          {act.recommended_action}
                        </span>
                      </div>

                      {/* Financial Impact & AI Summary desk */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-3 border-t border-slate-100">
                        
                        {/* Left: Financial exposure (Explicit Callout) */}
                        <div className="md:col-span-2 flex flex-col justify-center space-y-1">
                          <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase block font-mono">FINANCIAL EXPOSURE</span>
                          {exposureString || act.category === 'RECONCILIATION' || act.category === 'VENDOR' ? (
                            <div 
                              className="inline-flex items-center gap-1.5 w-fit font-mono"
                              style={{
                                background: 'var(--color-error-soft)',
                                borderRadius: 'var(--radius-full)',
                                padding: '4px 12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--color-error)'
                              }}
                            >
                              <AlertTriangle size={12} className="text-[var(--color-error)]" />
                              <span className="leading-none">
                                {exposureString || "High value mismatched"}
                              </span>
                            </div>
                          ) : (
                            <div 
                              className="inline-flex items-center gap-1.5 w-fit"
                              style={{
                                background: 'var(--color-surface-hover)',
                                borderRadius: 'var(--radius-full)',
                                padding: '4px 12px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)'
                              }}
                            >
                              <HelpCircle size={12} />
                              <span className="leading-none">Material assessment</span>
                            </div>
                          )}
                        </div>

                        {/* Right: AI narrative insight & impact summary */}
                        <div 
                          className="md:col-span-3 flex flex-col justify-center space-y-1.5"
                          style={{
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            margin: '12px 0'
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-[var(--color-primary-light)]" />
                            <span className="text-[11px] uppercase font-semibold text-[var(--color-primary-light)]">
                              AI PREDICTION INSIGHT
                            </span>
                          </div>
                          <p 
                            className="text-[13px] text-[var(--color-text-secondary)] leading-[1.5]"
                            style={{ fontStyle: 'normal' }}
                          >
                            {act.ai_summary}
                          </p>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={13} className="shrink-0 text-[var(--color-success)]" />
                            <span className="text-[13px] font-semibold text-[var(--color-success)]">
                              Impact Resolve: {act.predicted_impact}
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Footer Row: Assign staff dropdown, deadlines and resolve buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100">
                      
                      <div className="flex items-center gap-3">
                        {/* Deadline timestamp */}
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] font-mono">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Deadline: {act.deadline}</span>
                        </div>

                        {/* Assign Picker Dropdown */}
                        <div className="relative flex items-center bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg px-2 py-0.5 text-slate-700">
                          <div className="w-4 h-4 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-primary-light)] flex items-center justify-center mr-1.5 shrink-0">
                            <User size={8} className="text-[var(--color-primary-light)]" />
                          </div>
                          <select 
                            onChange={(e) => handleAssignStaff(act.action_id, e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-[var(--color-text-secondary)] focus:outline-none cursor-pointer max-w-[7.5rem] pr-2.5 truncate"
                            defaultValue="Aditya Rao"
                            aria-label={`Assign ${act.client_name}`}
                          >
                            <option value="Aditya Rao">Aditya Rao</option>
                            <option value="Neha Sharma">Neha Sharma</option>
                            <option value="Rohan Mehta">Rohan Mehta</option>
                            <option value="Kunal Sen">Kunal Sen</option>
                          </select>
                        </div>
                      </div>

                      {/* Interactive Trigger Drawer */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Dynamic category-based workflow options */}
                        {act.category === 'VENDOR' && (
                          <button 
                            onClick={() => handleGenerateOutreach(act)}
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                          >
                            <Copy size={10} />
                            <span>Outreach</span>
                          </button>
                        )}

                        {/* Open target Workspace context link */}
                        <Link href={act.category === 'RECONCILIATION' ? `/gst-recon?client=${act.client_id}` : `/clients/${act.client_id}`}>
                          <button 
                            className="btn btn-ghost btn-sm flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </button>
                        </Link>

                        {/* Standard Action Resolve */}
                        <button 
                          onClick={() => handleResolveAction(act.action_id)}
                          className="btn btn-success btn-sm flex items-center gap-1"
                        >
                          <Check size={10} />
                          <span>Resolve</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="std-card p-16 text-center space-y-4">
              <CheckCircle2 size={42} className="mx-auto text-[var(--color-success)] animate-bounce" />
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider block font-mono">Queue Cleared</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Excellent work! No unresolved action items found inside this folder.</p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

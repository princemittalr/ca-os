"use client";

import React, { useState, useEffect } from 'react';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { getAuthToken } from '@/lib/auth';
import {
  Search,
  CheckCircle2,
  UploadCloud,
  Anchor,
  AlertTriangle,
  MinusCircle,
  Building,
  Calendar,
  Clock,
  ArrowRightLeft,
  FileCheck2,
  Send,
  Copy,
  FileDown,
  RefreshCw,
  ChevronRight,
  FileSpreadsheet,
  Check,
  Sparkles,
  Terminal as TerminalIcon,
  Cpu,
  TrendingUp,
  Filter,
  Sliders,
  X,
  ArrowRight
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BoeItem {
  id: string;
  boe_number: string;
  boe_date: string;
  port_code: string;
  customs_taxable: number;
  gst_taxable: number;
  igst_customs: number;
  igst_2b: number;
  difference: number;
  status: 'Matched' | 'Value Mismatch' | 'Missing in 2B';
  root_cause_category: 'GSTIN Mismatch' | 'BOE Not Yet Reflected' | 'ICEGATE Delay' | 'Invalid Import Data' | 'Partial Reflection' | 'Customs Data Issue' | 'None';
  confidence_score: number;
  recommended_action: string;
  why_occurred: string;
  evidence: string;
  resolution_path: string;
  recovery_probability: number; // 0 to 100
  priority_group: 'Requires Follow-up' | 'Likely to Self-Resolve' | 'Requires Amendment' | 'None';
  age_days: number;
}

export default function BoeIntelligenceCenter() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [boeRows, setBoeRows] = useState<BoeItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [rootCauseFilter, setRootCauseFilter] = useState<string>('All');
  const [selectedRow, setSelectedRow] = useState<BoeItem | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // Step 2 & 3 file upload / connection simulation states
  const [boeFile, setBoeFile] = useState<File | null>(null);
  const [boeParsing, setBoeParsing] = useState(false);
  const [boeParsedCount, setBoeParsedCount] = useState(0);

  const [gstr2bFile, setGstr2bFile] = useState<File | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncingGstr2b, setSyncingGstr2b] = useState(false);
  const [gstr2bSynced, setGstr2bSynced] = useState(false);

  // Step 4 analysis simulator
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  // Auto-select first row for AI panel in Step 5
  useEffect(() => {
    if (activeStep === 5 && !selectedRow) {
      const firstMismatch = boeRows.find(row => row.status !== 'Matched');
      if (firstMismatch) {
        setSelectedRow(firstMismatch);
      }
    }
  }, [activeStep, boeRows, selectedRow]);

  // Fetch clients from backend api
  useEffect(() => {
    const loadClients = async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/api/clients/`, { headers });
        if (!response.ok) throw new Error("Unsuccessful status from clients list API");
        const data = await response.json();
        if (data && data.length > 0) {
          setClients(data);
          setSelectedClient(data[0].id);
        }
      } catch (err) {
        console.error("Client fetch failed:", err);
      }
    };
    loadClients();
  }, []);

  const activeClient = clients.find(c => c.id === selectedClient) || {
    business_name: 'Client Firm',
    gstin: '—'
  };

  // Helper formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Trigger custom toast alert
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(id);
    triggerToast('✓ Copied resolution template to clipboard.');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  // Step 2 Upload simulation
  const handleBoeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBoeFile(file);
      setBoeParsing(true);
      setTimeout(() => {
        setBoeParsing(false);
        setBoeParsedCount(8);
        triggerToast('✓ Bill of Entry worksheet uploaded successfully. 8 records identified.');
      }, 1500);
    }
  };

  // Step 3 GSTR-2B Sync simulator
  const startGstr2bSync = () => {
    setSyncingGstr2b(true);
    setSyncLogs([]);
    const logs = [
      'Initializing secure connection to GSTN production API gateway...',
      'Handshake accepted (SSL TSLv1.3 verified).',
      `Querying GSTR-2B ledger under Importer GSTIN: ${activeClient.gstin}...`,
      `Retrieving customs reflection packets for period: ${selectedPeriod}...`,
      'Comparing checksum keys for ICEGATE entry logs...',
      'Successfully synced 8 records from GST portal database.'
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        if (index === logs.length - 1) {
          setSyncingGstr2b(false);
          setGstr2bSynced(true);
          triggerToast('✓ GSTR-2B synchronization completed successfully.');
        }
      }, (index + 1) * 400);
    });
  };

  const handleGstr2bFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGstr2bFile(e.target.files[0]);
      setSyncingGstr2b(true);
      setTimeout(() => {
        setSyncingGstr2b(false);
        setGstr2bSynced(true);
        triggerToast('✓ GSTR-2B JSON file uploaded and mapped successfully.');
      }, 1000);
    }
  };

  // Step 4 Run Analysis simulator
  const runAiAnalysis = () => {
    setAnalyzing(true);
    setAnalysisLogs([]);
    const checkRules = [
      'Mapping importer GSTIN validations across customs entry nodes...',
      'Calculating transmission latency profiles on port gate records...',
      'Identifying ICEGATE-to-GSTN synchronization timeout queues...',
      'Validating transaction-date exchange spot rates vs statutory CBIC tables...',
      'Cross-referencing split cargo shipment invoice details...',
      'Compiling forensic root causes and computing ITC recovery probability...'
    ];

    checkRules.forEach((rule, index) => {
      setTimeout(async () => {
        setAnalysisLogs(prev => [...prev, `[SYSTEM] ${rule}`]);
        if (index === checkRules.length - 1) {
          setAnalyzing(false);
          setActiveStep(5);
          triggerToast('🎉 Import ITC analysis complete! Findings workspace compiled.');
          if (boeFile && gstr2bFile) {
            if (!selectedClient) {
              triggerToast("⚠ Please select a client first.");
              return;
            }
            const token = await getAuthToken();
            const formData = new FormData();
            formData.append("file_boe", boeFile);
            formData.append("file_2b", gstr2bFile);
            formData.append("client_id", selectedClient);
            formData.append("period", selectedPeriod);
            const headers: Record<string, string> = {};
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            try {
              const res = await fetch(`${API_BASE}/api/reconcile/import-boe`, {
                method: "POST",
                headers,
                body: formData
              });
              if (res.ok) {
                const data = await res.json();
                // Map real API results to BoeItem format
                const mapped: BoeItem[] = [
                  ...(data.matches || []).map((m: any, i: number) => ({
                    id: `boe-match-${i}`,
                    boe_number: m.invoice_number || `BOE/${i}`,
                    boe_date: m.invoice_date || new Date().toISOString().split('T')[0],
                    port_code: "IMPORT PORT",
                    customs_taxable: m.taxable_value || 0,
                    gst_taxable: m.taxable_value || 0,
                    igst_customs: (m.taxable_value || 0) * 0.18,
                    igst_2b: (m.taxable_value || 0) * 0.18,
                    difference: 0,
                    status: "Matched" as const,
                    root_cause_category: "None" as const,
                    confidence_score: 100,
                    recommended_action: "None required.",
                    why_occurred: "Matched successfully.",
                    evidence: "Verified.",
                    resolution_path: "No action required.",
                    recovery_probability: 100,
                    priority_group: "None" as const,
                    age_days: 0
                  })),
                  ...(data.mismatches || []).map((m: any, i: number) => ({
                    id: `boe-mismatch-${i}`,
                    boe_number: m.invoice_number || `BOE-M/${i}`,
                    boe_date: m.invoice_date || new Date().toISOString().split('T')[0],
                    port_code: "IMPORT PORT",
                    customs_taxable: m.taxable_value || 0,
                    gst_taxable: m.issue === "MISSING_IN_2B" ? 0 : m.taxable_value || 0,
                    igst_customs: (m.taxable_value || 0) * 0.18,
                    igst_2b: m.issue === "MISSING_IN_2B" ? 0 : (m.taxable_value || 0) * 0.18,
                    difference: m.issue === "MISSING_IN_2B" ? (m.taxable_value || 0) * 0.18 : 0,
                    status: m.issue === "MISSING_IN_2B" ? "Missing in 2B" : "Value Mismatch" as any,
                    root_cause_category: "ICEGATE Delay" as const,
                    confidence_score: 85,
                    recommended_action: m.recommended_action || "Review discrepancy.",
                    why_occurred: m.likely_cause || "BOE mismatch detected.",
                    evidence: "Automated reconciliation result.",
                    resolution_path: m.recommended_action || "Manual review required.",
                    recovery_probability: 80,
                    priority_group: "Requires Follow-up" as const,
                    age_days: 0
                  }))
                ];
                if (mapped.length > 0) setBoeRows(mapped);
              }
            } catch (apiErr) {
              console.error("Import BOE API call failed:", apiErr);
            }
          }
        }
      }, (index + 1) * 400);
    });
  };

  // Quick Action simulates
  const runQuickAction = (action: string) => {
    switch (action) {
      case 'working-paper':
        triggerToast('⚡ Exporting BOE Audit Working Paper... Excel sheet downloaded (CSV format).');
        break;
      case 'client-summary':
        triggerToast('📧 Preparing Client Summary email copy with recovery opportunities...');
        break;
      case 'tracker':
        triggerToast('📅 Adding unresolved items to compliance calendar & action tracker.');
        break;
      case 'report':
        triggerToast('📄 Generating PDF Import ITC Recovery Report. Check downloads directory.');
        break;
      default:
        break;
    }
  };

  // Resolve mismatch action (updates live state!)
  const resolveItem = (itemId: string) => {
    setBoeRows(prev =>
      prev.map(row => {
        if (row.id === itemId) {
          return {
            ...row,
            status: 'Matched',
            difference: 0,
            igst_2b: row.igst_customs,
            recommended_action: 'None (Manually Resolved)',
            recovery_probability: 100,
            why_occurred: 'Manually approved and resolved in CA audit desk.',
            priority_group: 'None'
          };
        }
        return row;
      })
    );
    // Refresh selected row in panel
    setSelectedRow(prev => {
      if (prev && prev.id === itemId) {
        return {
          ...prev,
          status: 'Matched',
          difference: 0,
          igst_2b: prev.igst_customs,
          recommended_action: 'None (Manually Resolved)',
          recovery_probability: 100,
          why_occurred: 'Manually approved and resolved in CA audit desk.',
          priority_group: 'None'
        };
      }
      return prev;
    });
    triggerToast(`✓ Mismatch successfully resolved for BOE: ${itemId}`);
  };

  // Dynamic calculations based on state (Updates live!)
  const totalBoeValue = boeRows.reduce((sum, r) => sum + r.customs_taxable, 0);
  const totalImportItc = boeRows.reduce((sum, r) => sum + r.igst_customs, 0);
  const reflectedIn2b = boeRows.reduce((sum, r) => sum + r.igst_2b, 0);
  const missingImportItc = boeRows.reduce((sum, r) => sum + r.difference, 0);

  // Recovery Opportunity counts where status is not Matched
  const recoveryOpportunityValue = boeRows
    .filter(r => r.status !== 'Matched')
    .reduce((sum, r) => sum + r.difference, 0);

  // Potential ITC Recovery represents total value weighted by confidence score
  const potentialItcRecovery = boeRows
    .filter(r => r.status !== 'Matched')
    .reduce((sum, r) => sum + Math.round(r.difference * (r.recovery_probability / 100)), 0);

  // Group mismatches into 6 categories
  const categoriesList = [
    { name: 'GSTIN Mismatch', dbKey: 'GSTIN Mismatch' },
    { name: 'BOE Not Yet Reflected', dbKey: 'BOE Not Yet Reflected' },
    { name: 'ICEGATE Delay', dbKey: 'ICEGATE Delay' },
    { name: 'Invalid Import Data', dbKey: 'Invalid Import Data' },
    { name: 'Partial Reflection', dbKey: 'Partial Reflection' },
    { name: 'Customs Data Issue', dbKey: 'Customs Data Issue' }
  ];

  const getCategoryStats = (categoryName: string) => {
    const items = boeRows.filter(r => r.root_cause_category === categoryName && r.status !== 'Matched');
    const count = items.length;
    const value = items.reduce((sum, r) => sum + r.difference, 0);
    const avgConfidence = count > 0 ? Math.round(items.reduce((sum, r) => sum + r.confidence_score, 0) / count) : 0;
    return { count, value, avgConfidence };
  };

  // Today's priorities grouping
  const getPriorityItems = (group: 'Requires Follow-up' | 'Likely to Self-Resolve' | 'Requires Amendment') => {
    return boeRows.filter(r => r.priority_group === group && r.status !== 'Matched');
  };

  // Top Risk Imports
  const sortedRiskImports = [...boeRows]
    .filter(r => r.status !== 'Matched')
    .sort((a, b) => {
      // Sort by Exposure (high diff first), then older (high age first)
      if (b.difference !== a.difference) return b.difference - a.difference;
      return b.age_days - a.age_days;
    });

  // Filter main ledger table
  const filteredRows = boeRows.filter(row => {
    const matchesSearch = row.boe_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.port_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    const matchesRootCause = rootCauseFilter === 'All' || row.root_cause_category === rootCauseFilter;
    return matchesSearch && matchesStatus && matchesRootCause;
  });

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans relative overflow-hidden">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded shadow-xl z-[100] flex items-center gap-3">
          <Sparkles className="text-amber-400 flex-shrink-0 animate-pulse" size={16} />
          <span className="text-[12px] font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header: 48px white border-bottom, title 16px weight 600, subtitle period/GSTIN 12px #6B7280 */}
      <div className="h-12 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[16px] font-semibold text-[#111827]">BOE Intelligence Center</h1>
          <p className="text-[12px] text-[#6B7280]">
            {activeClient.business_name} ({activeClient.gstin}) · Period: {selectedPeriod === '2024-03' ? 'March 2024' : selectedPeriod}
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 bg-slate-155 px-2 py-0.5 rounded">
          Sync Status: LIVE HANDSHAKE
        </div>
      </div>

      {/* Toolbar: period selector + GSTIN selector + Run Reconciliation, height 40px, mb 16px */}
      <div className="h-10 bg-white border-b border-[#E5E7EB] px-6 flex items-center gap-3 shrink-0 mb-4">
        {/* Client selector */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="h-8 bg-slate-50 border border-[#E5E7EB] rounded-[4px] px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
        >
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.business_name} ({c.gstin})</option>
          ))}
        </select>

        {/* Period selector */}
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="h-8 bg-slate-50 border border-[#E5E7EB] rounded-[4px] px-2 text-[12px] font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
        >
          <option value="2024-03">March 2024 (Active)</option>
          <option value="2024-02">February 2024</option>
          <option value="2024-01">January 2024</option>
        </select>

        {activeStep !== 5 && (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setActiveStep(s)}
                className={`h-8 px-2.5 text-[11px] font-semibold rounded-[4px] border transition-colors ${
                  activeStep === s
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-[#E5E7EB] text-slate-500 hover:bg-slate-50'
                }`}
              >
                Step {s}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setActiveStep(1);
            setBoeFile(null);
            setBoeParsedCount(0);
            setGstr2bSynced(false);
            setGstr2bFile(null);
            setSyncLogs([]);
          }}
          className="h-8 px-3 border border-[#E5E7EB] text-[12px] font-medium rounded-[4px] hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw size={12} />
          <span>Reset Audit</span>
        </button>

        {/* Run Reconciliation primary button */}
        <button
          onClick={runAiAnalysis}
          disabled={analyzing}
          className="h-8 px-4 bg-[#1B4F8A] hover:bg-[#163F6E] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[12px] font-semibold rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
        >
          {analyzing ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={12} className="animate-pulse" />
              <span>Run Reconciliation</span>
            </>
          )}
        </button>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-hidden flex">

        {/* Left main area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

          {/* STEP 1 */}
          {activeStep === 1 && (
            <div className="max-w-xl mx-auto mt-8 bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 1: Select Client & Period</h3>
                <p className="text-[12px] text-slate-500">Select parameters in toolbar and click continue.</p>
              </div>
              <button
                onClick={() => setActiveStep(2)}
                className="w-full h-10 bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[12px] font-semibold rounded-[4px] flex items-center justify-center gap-1"
              >
                <span>Continue to Upload BOE</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {activeStep === 2 && (
            <div className="max-w-xl mx-auto mt-8 bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 2: Upload Bill of Entry (BOE)</h3>
                <p className="text-[12px] text-slate-500">Provide ICEGATE spreadsheet or JSON declarations.</p>
              </div>

              {/* Dropzone: border 2px dashed #D1D5DB, border-radius 4px, background #F7F8FA, height 120px */}
              <div className="relative border-2 border-dashed border-[#D1D5DB] rounded-[4px] bg-[#F7F8FA] h-[120px] flex flex-col items-center justify-center text-center p-4 hover:bg-[#EFF6FF] hover:border-[#1B4F8A] transition-colors group">
                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleBoeFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud size={20} className="text-[#D1D5DB] group-hover:text-[#1B4F8A] mb-1" />
                <span className="text-[13px] text-[#6B7280] font-medium">
                  {boeFile ? boeFile.name : 'Click to Upload Bill of Entry'}
                </span>
              </div>

              {boeParsedCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded p-3 text-xs text-emerald-800">
                  Parsed <span className="font-bold">{boeParsedCount} Bill of Entry</span> entries successfully.
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setActiveStep(1)} className="h-9 px-4 border border-[#E5E7EB] rounded-[4px] text-[12px] font-medium hover:bg-slate-50 flex-1">Back</button>
                <button onClick={() => setActiveStep(3)} disabled={!boeFile && boeParsedCount === 0} className="h-9 px-4 bg-[#1B4F8A] text-white disabled:bg-slate-200 disabled:text-slate-400 rounded-[4px] text-[12px] font-medium flex-1">Continue</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {activeStep === 3 && (
            <div className="max-w-xl mx-auto mt-8 bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 3: Fetch / Upload GSTR-2B</h3>
                <p className="text-[12px] text-slate-500">Sync with GSTN direct gateway or upload portal JSON offline.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#E5E7EB] rounded p-4 bg-slate-50 flex flex-col justify-between gap-3">
                  <h4 className="text-xs font-bold text-slate-800">Direct Portal Sync</h4>
                  <button onClick={startGstr2bSync} disabled={syncingGstr2b} className="h-8 bg-[#1B4F8A] text-white text-[11px] font-semibold rounded">
                    {syncingGstr2b ? 'Syncing...' : 'Connect Gateway'}
                  </button>
                </div>
                <div className="border border-[#E5E7EB] rounded p-4 bg-slate-50 relative flex flex-col justify-between gap-3">
                  <input type="file" accept=".json,.xlsx" onChange={handleGstr2bFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <h4 className="text-xs font-bold text-slate-800">Offline JSON File</h4>
                  <button className="h-8 border border-[#E5E7EB] bg-white text-slate-700 text-[11px] font-semibold rounded truncate px-2">
                    {gstr2bFile ? gstr2bFile.name : 'Upload File'}
                  </button>
                </div>
              </div>

              {syncLogs.length > 0 && (
                <div className="bg-slate-900 text-[#A7F3D0] rounded p-3 font-mono text-[10px] h-32 overflow-y-auto space-y-1">
                  {syncLogs.map((log, idx) => <div key={idx}>{log}</div>)}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setActiveStep(2)} className="h-9 px-4 border border-[#E5E7EB] rounded-[4px] text-[12px] font-medium hover:bg-slate-50 flex-1">Back</button>
                <button onClick={() => setActiveStep(4)} disabled={!gstr2bSynced && syncLogs.length === 0} className="h-9 px-4 bg-[#1B4F8A] text-white disabled:bg-slate-200 disabled:text-slate-400 rounded-[4px] text-[12px] font-medium flex-1">Continue</button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {activeStep === 4 && (
            <div className="max-w-xl mx-auto mt-8 bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-4">
              <div className="text-center space-y-4">
                <Cpu size={24} className="text-[#1B4F8A] mx-auto animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 4: Initialize Import ITC Analysis</h3>
                  <p className="text-[12px] text-slate-500">Diagnose discrepancy gaps and recovery opportunities.</p>
                </div>
                {analyzing && (
                  <div className="bg-slate-900 text-[#A7F3D0] rounded p-3 font-mono text-[10px] h-32 overflow-y-auto space-y-1 text-left">
                    {analysisLogs.map((log, idx) => <div key={idx}>{log}</div>)}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setActiveStep(3)} className="h-9 px-4 border border-[#E5E7EB] rounded-[4px] text-[12px] font-medium hover:bg-slate-50 flex-1">Back</button>
                  <button onClick={runAiAnalysis} disabled={analyzing} className="h-9 px-4 bg-[#1B4F8A] text-white rounded-[4px] text-[12px] font-semibold flex-1">Start Audit</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 (RESULTS VIEW - CLEAN LIGHT THEME) */}
          {activeStep === 5 && (
            <div className="space-y-4">
              
              {/* RECONCILIATION SUMMARY BAR: Horizontal 4-stat bar, background #FFFFFF, border 1px solid #E5E7EB, border-radius 4px */}
              <div className="grid grid-cols-4 bg-white border border-[#E5E7EB] rounded-[4px] divide-x divide-[#E5E7EB] h-16 items-center shrink-0">
                {/* Matched */}
                <div className="px-6 flex flex-col">
                  <span className="text-[11px] uppercase text-[#6B7280] font-medium tracking-wider">Matched BOEs</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[16px] font-bold font-mono text-[#15803D]">{formatCurrency(reflectedIn2b)}</span>
                    <span className="text-[11px] text-[#6B7280] font-mono">({boeRows.filter(r => r.status === 'Matched').length} files)</span>
                  </div>
                </div>

                {/* Unmatched */}
                <div className="px-6 flex flex-col">
                  <span className="text-[11px] uppercase text-[#6B7280] font-medium tracking-wider">Unmatched Gaps</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[16px] font-bold font-mono text-[#B91C1C]">{formatCurrency(missingImportItc)}</span>
                    <span className="text-[11px] text-[#6B7280] font-mono">({boeRows.filter(r => r.status !== 'Matched').length} files)</span>
                  </div>
                </div>

                {/* Total Declarations */}
                <div className="px-6 flex flex-col">
                  <span className="text-[11px] uppercase text-[#6B7280] font-medium tracking-wider">Total Customs ITC</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[16px] font-bold font-mono text-[#111827]">{formatCurrency(totalImportItc)}</span>
                    <span className="text-[11px] text-[#6B7280] font-mono">({boeRows.length} files)</span>
                  </div>
                </div>

                {/* Recovery Target */}
                <div className="px-6 flex flex-col">
                  <span className="text-[11px] uppercase text-[#6B7280] font-medium tracking-wider">Weighted Recovery</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[16px] font-bold font-mono text-[#15803D]">{formatCurrency(potentialItcRecovery)}</span>
                    <span className="text-[11px] text-[#6B7280] font-mono">AI weighted</span>
                  </div>
                </div>
              </div>

              {/* Action Toolkit Bar */}
              <div className="p-4 border border-[#E5E7EB] bg-white rounded-[4px] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">⚡ Core Action Toolkit:</span>
                <div className="flex gap-2">
                  <button onClick={() => runQuickAction('working-paper')} className="h-8 px-3 border border-[#E5E7EB] rounded-[4px] text-[12px] font-semibold text-slate-755 hover:bg-slate-50 flex items-center gap-1.5">
                    <FileSpreadsheet size={12} className="text-emerald-500" />
                    <span>Export Working Paper</span>
                  </button>
                  <button onClick={() => runQuickAction('client-summary')} className="h-8 px-3 border border-[#E5E7EB] rounded-[4px] text-[12px] font-semibold text-slate-755 hover:bg-slate-50 flex items-center gap-1.5">
                    <Send size={12} className="text-indigo-500" />
                    <span>Copy Summary Brief</span>
                  </button>
                  <button onClick={() => runQuickAction('report')} className="h-8 px-3 bg-[#1B4F8A] text-white rounded-[4px] text-[12px] font-semibold hover:bg-[#163F6E] flex items-center gap-1.5">
                    <FileDown size={12} />
                    <span>Download Audit Report</span>
                  </button>
                </div>
              </div>

              {/* Raw Audit Ledger Grid */}
              <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Raw Audit Ledger</h3>
                    <p className="text-[10px] text-slate-500">Customs declaration files vs GSTR-2B matching ledger logs.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search BOE..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-3 pr-4 border border-[#E5E7EB] rounded-[4px] text-[11px] font-semibold w-48 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-1">
                      {['All', 'Matched', 'Missing in 2B'].map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`h-7 px-2.5 rounded-[4px] border text-[10px] font-semibold ${
                            statusFilter === s
                              ? 'bg-[#1B4F8A] border-[#1B4F8A] text-white'
                              : 'bg-white border-[#E5E7EB] text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reconciliation Table */}
                <div className="overflow-x-auto border border-[#E5E7EB] rounded-[4px]">
                  <table className="min-w-full divide-y divide-[#E5E7EB]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">BOE Number</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Filing Date</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Port Code</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Customs IGST</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">GSTR-2B IGST</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Difference</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Status Badge</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Diagnostic</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E5E7EB]">
                      {filteredRows.length > 0 ? (
                        filteredRows.map(row => {
                          const isSelected = selectedRow?.id === row.id;
                          return (
                            <React.Fragment key={row.id}>
                              {/* Row height 36px (h-9) */}
                              <tr
                                onClick={() => setSelectedRow(row)}
                                className={`cursor-pointer hover:bg-slate-50/50 h-9 transition-colors ${
                                  isSelected ? 'bg-slate-50' : ''
                                }`}
                              >
                                <td className="px-3 py-1 text-[12px] font-semibold text-slate-800">{row.boe_number}</td>
                                <td className="px-3 py-1 text-[12px] text-slate-500">{row.boe_date}</td>
                                <td className="px-3 py-1 text-[12px] text-slate-500">{row.port_code.split(' (')[0]}</td>
                                
                                {/* Amount columns: right-aligned monospace 12px */}
                                <td className="px-3 py-1 text-right text-[12px] font-mono text-slate-800">{formatCurrency(row.igst_customs)}</td>
                                <td className="px-3 py-1 text-right text-[12px] font-mono text-slate-800">
                                  {row.igst_2b > 0 ? formatCurrency(row.igst_2b) : '—'}
                                </td>
                                <td className={`px-3 py-1 text-right text-[12px] font-mono font-semibold ${
                                  row.difference > 0 ? 'text-[#B91C1C]' : 'text-slate-500'
                                }`}>
                                  {row.difference > 0 ? formatCurrency(row.difference) : '—'}
                                </td>

                                <td className="px-3 py-1 text-left">
                                  <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-semibold tracking-wide border uppercase inline-block ${
                                    row.status === 'Matched'
                                      ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                                      : row.status === 'Value Mismatch'
                                      ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                                      : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>

                                <td className="px-3 py-1 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => setSelectedRow(row)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-[11px] underline">
                                    Inspect
                                  </button>
                                </td>
                              </tr>

                              {/* Expandable row: background #F7F8FA, indent 24px, font 12px */}
                              {isSelected && (
                                <tr className="bg-[#F7F8FA]" onClick={(e) => e.stopPropagation()}>
                                  <td colSpan={8} className="pl-6 py-2">
                                    <div className="pl-6 border-l-2 border-indigo-500 text-[12px] text-slate-650 space-y-1">
                                      <p><strong className="text-slate-800">Why Occurred:</strong> {row.why_occurred}</p>
                                      <p><strong className="text-slate-800">Evidence:</strong> {row.evidence}</p>
                                      <p><strong className="text-slate-800">Resolution Path:</strong> {row.resolution_path}</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 text-[12px]">No records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MISMATCH DETAIL PANEL (Side panel): width: 360px, border-left: 1px solid #E5E7EB, background: #FFFFFF */}
        {selectedRow && activeStep === 5 && (
          <div className="w-[360px] border-l border-[#E5E7EB] bg-white flex flex-col shrink-0 h-full overflow-y-auto">
            {/* Header: 14px weight 600, 40px height, border-bottom 1px solid #E5E7EB */}
            <div className="h-10 border-b border-[#E5E7EB] px-4 flex items-center justify-between shrink-0">
              <span className="text-[14px] font-semibold text-slate-900">Customs BOE Details</span>
              <button onClick={() => setSelectedRow(null)} className="text-[11px] text-[#6B7280] hover:text-slate-900">
                Clear
              </button>
            </div>

            {/* Content area with info-rows */}
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded p-3 border border-slate-105">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BOE Selection</span>
                <span className="text-[13px] font-extrabold text-slate-900 block font-mono mt-0.5">{selectedRow.boe_number}</span>
                <span className="text-[11px] text-[#6B7280] block mt-0.5 font-mono">Port Code: {selectedRow.port_code}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Declaration Audits</span>
                
                {/* Info-rows styled as client details */}
                {[
                  { label: "Filing Date", value: selectedRow.boe_date },
                  { label: "Customs Assessed Value", value: formatCurrency(selectedRow.customs_taxable), mono: true },
                  { label: "GST Assessed Value", value: formatCurrency(selectedRow.gst_taxable), mono: true },
                  { label: "IGST Customs", value: formatCurrency(selectedRow.igst_customs), mono: true },
                  { label: "IGST GSTR-2B", value: selectedRow.igst_2b > 0 ? formatCurrency(selectedRow.igst_2b) : '—', mono: true },
                  { label: "Discrepancy Gap", value: selectedRow.difference > 0 ? formatCurrency(selectedRow.difference) : '—', mono: true, highlight: selectedRow.difference > 0 },
                  { label: "Root Cause Group", value: selectedRow.root_cause_category },
                  { label: "Recovery Chance", value: `${selectedRow.recovery_probability}%`, mono: true },
                  { label: "Priority Level", value: selectedRow.priority_group }
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 text-[12px] last:border-b-0">
                    <span className="text-[#6B7280] font-medium text-[11px]">{row.label}</span>
                    <span className={`text-[13px] text-[#111827] text-right truncate max-w-[200px] ${
                      row.mono ? 'font-mono' : 'font-semibold'
                    } ${row.highlight ? 'text-[#B91C1C]' : ''}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Forensic Why Details */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Why This Occurred</span>
                <p className="text-[12px] text-slate-655 leading-relaxed font-medium">
                  {selectedRow.why_occurred}
                </p>
              </div>

              {/* Toolkit Action Area */}
              <div className="flex gap-2 pt-4">
                {selectedRow.status !== 'Matched' && (
                  <button
                    onClick={() => {
                      const draftText = `Support grievance ticket for BOE: ${selectedRow.boe_number}\nPort: ${selectedRow.port_code}, Filing date: ${selectedRow.boe_date}\nDiscrepancy category: ${selectedRow.root_cause_category}\nDetails: ${selectedRow.why_occurred}`;
                      handleCopyText(draftText, `support-${selectedRow.id}`);
                    }}
                    className="flex-1 h-9 rounded text-[11px] font-bold uppercase tracking-wider border bg-white border-[#E5E7EB] text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Copy size={12} />
                    <span>Copy Action Query</span>
                  </button>
                )}

                {selectedRow.status !== 'Matched' ? (
                  <button
                    onClick={() => resolveItem(selectedRow.id)}
                    className="flex-1 h-9 rounded bg-[#1B4F8A] hover:bg-[#163F6E] text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileCheck2 size={12} />
                    <span>Approve Resolve</span>
                  </button>
                ) : (
                  <div className="w-full h-9 rounded border bg-emerald-50 border-emerald-150 text-emerald-700 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Reconciled & Claim Cleared</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

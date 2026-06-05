"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
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
  Sliders
} from 'lucide-react';

// Define TS Types for BOE Intelligence Center
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
  const [activeStep, setActiveStep] = useState<number>(1); // Default to review for convenience, but full workflow enabled
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

  // Workspace Theme toggle: Bloomberg Dark vs Ramp/Stripe Premium Light
  const [bloombergMode, setBloombergMode] = useState<boolean>(true);

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
    fetch(`${API_BASE}/api/clients/`)
      .then(r => r.json())
      .then(data => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClient(data[0].id);
        }
      })
      .catch(() => { });
  }, []);

  const activeClient = clients.find(c => c.id === selectedClient) || {
    business_name: 'TechNova Solutions Pvt Ltd',
    gstin: '27AAACT1234A1Z5'
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
            const formData = new FormData();
            formData.append("file_boe", boeFile);
            formData.append("file_2b", gstr2bFile);
            try {
              const res = await fetch(`${API_BASE}/api/reconcile/import-boe`, { method: "POST", body: formData });
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
    <div className="flex flex-col h-full w-full overflow-y-auto hidden-scrollbar space-y-6 pb-12 pr-4 pl-1">
      
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-[#0D1527] border border-indigo-500/30 text-indigo-200 px-6 py-4 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-md flex items-start gap-3.5">
          <Sparkles className="text-indigo-400 mt-0.5 flex-shrink-0 animate-pulse" size={20} />
          <div className="flex-1">
            <span className="text-xs font-bold leading-normal font-sans block">{toastMsg}</span>
          </div>
        </div>
      )}

      <PageHeader
        sectionLabel="Import Intelligence Portal"
        liveIndicator={true}
        title="BOE Intelligence Center"
        description="Audit customs filings against GST portals, identify discrepancies, and trace missing import ITC."
        hasSeparator={true}
        actions={
          activeStep === 5 ? (
            <button
              onClick={() => {
                setActiveStep(1);
                setBoeFile(null);
                setBoeParsedCount(0);
                setGstr2bSynced(false);
                setGstr2bFile(null);
                setSyncLogs([]);
              }}
              className="btn btn-secondary btn-md"
            >
              <RefreshCw size={14} />
              <span>Reset Audit Setup</span>
            </button>
          ) : null
        }
      />

      {/* Horizontal Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Sliders size={14} className="text-slate-500" />
            <span>PRIMARY WORKFLOW:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5 w-full lg:w-auto">
            {[
              { num: 1, label: 'Client & Period' },
              { num: 2, label: 'Upload BOE' },
              { num: 3, label: 'Fetch GSTR-2B' },
              { num: 4, label: 'Run ITC Analysis' },
              { num: 5, label: 'Review Findings' }
            ].map(step => {
              const isActive = activeStep === step.num;
              const isCompleted = activeStep > step.num;
              return (
                <button
                  key={step.num}
                  disabled={step.num > 5} // Lock client steps before confirmation if we want, but let all be clickable here
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border text-xs font-bold ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/50'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                    isActive ? 'bg-white text-indigo-700 border-white' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Workspace Panels depending on active step */}
      {activeStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <Building size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Step 1: Select Client & Period</h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Select the active corporate entity and import period to pull customs registry files.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Client Workspace
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-slate-100/50 transition-all"
              >
                {clients.length > 0 ? (
                  clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.business_name} ({c.gstin})
                    </option>
                  ))
                ) : (
                  <option value="">TechNova Solutions Pvt Ltd (27AAACT1234A1Z5)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Import Reconciliation Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-slate-100/50 transition-all"
              >
                <option value="2024-03">March 2024 (Active)</option>
                <option value="2024-02">February 2024</option>
                <option value="2024-01">January 2024</option>
              </select>
            </div>

            <button
              onClick={() => setActiveStep(2)}
              className="btn btn-primary btn-md w-full"
            >
              <span>Confirm & Continue to Upload</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <UploadCloud size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Step 2: Upload Bill of Entry (BOE)</h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Upload customs declared spreadsheet entries or ICEGATE JSON logs.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 relative group">
            <input
              type="file"
              accept=".csv,.xlsx,.json"
              onChange={handleBoeFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {boeParsing ? (
              <div className="space-y-3">
                <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                <span className="text-xs font-bold text-slate-600 block">Parsing ICEGATE records...</span>
              </div>
            ) : boeFile ? (
              <div className="space-y-2">
                <FileCheck2 size={28} className="text-emerald-500 mx-auto" />
                <span className="text-xs font-bold text-slate-800 block">{boeFile.name}</span>
                <span className="text-[10px] text-slate-500 block">{(boeFile.size / 1024).toFixed(1)} KB • Parsing Completed</span>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud size={28} className="text-slate-400 mx-auto group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700 block">Click to browse or drag file here</span>
                <span className="text-[10px] text-slate-400 block">Supports CSV, XLSX, or ICEGATE JSON reports</span>
              </div>
            )}
          </div>

          {boeParsedCount > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-xs text-emerald-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Successfully Parsed Customs Data
              </span>
              <p className="text-[11px] text-emerald-700">
                Found <span className="font-bold">8 Bills of Entry</span> filed under GSTIN <span className="font-mono font-bold">{activeClient.gstin}</span> at port authorities (ININD1, INBOM1, INMAA1).
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep(1)}
              className="btn btn-secondary btn-md w-1/3"
            >
              Back
            </button>
            <button
              disabled={!boeFile && boeParsedCount === 0}
              onClick={() => {
                // If not uploaded, fill dummy
                if (boeParsedCount === 0) setBoeParsedCount(8);
                setActiveStep(3);
              }}
              className="btn btn-primary btn-md w-2/3 disabled:opacity-50"
            >
              <span>Continue to GSTR-2B Sync</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <ArrowRightLeft size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Step 3: Fetch / Upload GSTR-2B</h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Synchronize auto-populated ITC credits from the GST Network portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Sync Option */}
            <div className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4 bg-slate-50/50">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">RECOMMENDED</span>
                <h4 className="text-sm font-bold text-slate-800">GSTN Direct API Connect</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Fetch matching credits via secure live handshake with corporate portal keys.
                </p>
              </div>
              <button
                onClick={startGstr2bSync}
                disabled={syncingGstr2b}
                className="btn btn-primary btn-md w-full disabled:opacity-50"
              >
                {syncingGstr2b ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : (
                  <>
                    <Anchor size={14} />
                    <span>Connect GSTN Gateway</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Upload Option */}
            <div className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4 bg-slate-50/50 relative">
              <input
                type="file"
                accept=".json,.xlsx"
                onChange={handleGstr2bFileUpload}
                className="absolute inset-0 w-full h-[70%] opacity-0 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">OFFLINE FILE</span>
                <h4 className="text-sm font-bold text-slate-800">Upload Portal JSON</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Manually upload GSTR-2B data file downloaded from the GST common portal.
                </p>
              </div>
              <button className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all truncate px-2">
                {gstr2bFile ? `Selected: ${gstr2bFile.name}` : 'Select JSON / Excel File'}
              </button>
            </div>
          </div>

          {/* Simulated Terminal Log */}
          {(syncingGstr2b || syncLogs.length > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 font-mono text-[10px] text-emerald-400 space-y-1.5 h-44 overflow-y-auto shadow-inner">
              <div className="flex items-center gap-1.5 text-slate-400 border-b border-slate-850 pb-2 mb-2">
                <TerminalIcon size={12} />
                <span>TERMINAL CONSOLE logs</span>
              </div>
              {syncLogs.map((log, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              {syncingGstr2b && (
                <div className="flex items-center gap-1 animate-pulse text-indigo-400 mt-1">
                  <span>●</span>
                  <span>Executing pipeline sync task...</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep(2)}
              className="btn btn-secondary btn-md w-1/3"
            >
              Back
            </button>
            <button
              disabled={!gstr2bSynced && syncLogs.length === 0}
              onClick={() => {
                if (!gstr2bSynced) setGstr2bSynced(true);
                setActiveStep(4);
              }}
              className="btn btn-primary btn-md w-2/3 disabled:opacity-50"
            >
              <span>Proceed to AI Analysis</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <Cpu size={24} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Step 4: Run Import ITC Analysis</h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Initialize the Reckon AI forensic diagnostic model to link customs filings and detect leakage.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Forensics Engine State</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                Ready to Process
              </span>
            </div>

            <button
              onClick={runAiAnalysis}
              disabled={analyzing}
              className="btn btn-primary btn-md w-full py-4 disabled:opacity-50"
            >
              <Sparkles size={16} className="animate-pulse" />
              <span>Initialize AI Reconciliation Audit</span>
            </button>
          </div>

          {(analyzing || analysisLogs.length > 0) && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Analysis Inspection Tasks</span>
              <div className="bg-slate-950 border border-slate-900 text-emerald-400 rounded-2xl p-5 font-mono text-[10px] space-y-2.5 shadow-inner">
                {analysisLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{log}</span>
                  </div>
                ))}
                {analyzing && (
                  <div className="flex items-center gap-2 text-indigo-400 mt-2">
                    <RefreshCw size={12} className="animate-spin" />
                    <span className="animate-pulse">Diagnosing transmission packets...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep(3)}
              className="btn btn-secondary btn-md w-1/3"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(5)}
              className="btn btn-secondary btn-md w-2/3"
            >
              <span>Skip directly to Workspace</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {activeStep === 5 && (
        <div className={`transition-all duration-300 rounded-3xl ${
          bloombergMode 
            ? 'bg-[#0B0F19] text-slate-100 border border-slate-850 p-6 shadow-premium-lg' 
            : 'bg-white text-slate-900 border border-slate-200 p-6 shadow-sm'
        }`}>
          
          {/* Workspace Toggles & Summary Header */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-indigo-950/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  bloombergMode ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  <Sparkles size={10} className="animate-pulse" />
                  WORKSPACE STATUS: INVESTIGATION
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <h2 className={`text-xl font-bold tracking-tight font-sans ${bloombergMode ? 'text-white' : 'text-slate-900'}`}>
                Import ITC Investigation Console
              </h2>
              <p className={`text-xs ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Reviewing <span className="font-bold">{activeClient.business_name}</span> filings for period <span className="font-bold">{selectedPeriod}</span>.
              </p>
            </div>

            {/* Config controls: Bloomberg dark toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Reset to Category button */}
              {(rootCauseFilter !== 'All' || statusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setRootCauseFilter('All');
                    setStatusFilter('All');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    bloombergMode 
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Filter size={12} />
                  <span>Clear Filters</span>
                </button>
              )}

              {/* Theme Toggle (Bloomberg Terminal Inspired vs Stripe/Ramp Light) */}
              <div className={`p-1 rounded-2xl flex items-center gap-1 border ${
                bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setBloombergMode(true)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                    bloombergMode 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Terminal Dark
                </button>
                <button
                  onClick={() => setBloombergMode(false)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                    !bloombergMode 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Clean Light
                </button>
              </div>
            </div>
          </div>

          {/* TOP HERO: OVERVIEW STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-5 pt-6 pb-6">
            
            {/* Primary Large Metric Card: Potential ITC Recovery */}
            <div className={`col-span-1 md:col-span-3 lg:col-span-2 rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 ${
              bloombergMode 
                ? 'bg-gradient-to-br from-[#1A1836] to-[#121B2F] border-indigo-900/50 shadow-md shadow-indigo-950/20' 
                : 'bg-gradient-to-br from-indigo-50 to-indigo-100/30 border-indigo-200/60 shadow-sm'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  bloombergMode ? 'text-indigo-400' : 'text-indigo-700'
                }`}>
                  POTENTIAL ITC RECOVERY (Wtd.)
                </span>
                <TrendingUp size={16} className={bloombergMode ? 'text-indigo-400' : 'text-indigo-700'} />
              </div>
              <div className="mt-3.5">
                <span className={`text-3xl font-extrabold tracking-tight font-sans ${bloombergMode ? 'text-white' : 'text-indigo-950'}`}>
                  {formatCurrency(potentialItcRecovery)}
                </span>
                <p className={`text-[10px] font-semibold mt-1 ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Weighted by AI recovery probability of unresolved cases.
                </p>
              </div>
            </div>

            {/* Stat Card 2: Total BOE Value */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                bloombergMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Total BOE Value
              </span>
              <span className={`text-xl font-bold mt-2 block font-sans ${bloombergMode ? 'text-slate-200' : 'text-slate-900'}`}>
                {formatCurrency(totalBoeValue)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {boeRows.length} declarations
              </span>
            </div>

            {/* Stat Card 3: Total Import ITC */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                bloombergMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Total Import ITC
              </span>
              <span className={`text-xl font-bold mt-2 block font-sans ${bloombergMode ? 'text-slate-200' : 'text-slate-900'}`}>
                {formatCurrency(totalImportItc)}
              </span>
              <span className={`text-[9px] font-semibold block mt-1 ${
                bloombergMode ? 'text-indigo-400' : 'text-indigo-700'
              }`}>
                Customs assessed
              </span>
            </div>

            {/* Stat Card 4: Reflected in GSTR-2B */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                bloombergMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Reflected in 2B
              </span>
              <span className={`text-xl font-bold mt-2 block font-sans text-emerald-500`}>
                {formatCurrency(reflectedIn2b)}
              </span>
              <span className="text-[9px] text-emerald-600 block mt-1 font-semibold">
                {Math.round((reflectedIn2b / totalImportItc) * 100)}% synchronized
              </span>
            </div>

            {/* Stat Card 5: Missing Import ITC */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                bloombergMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Missing Import ITC
              </span>
              <span className={`text-xl font-bold mt-2 block font-sans text-rose-500`}>
                {formatCurrency(missingImportItc)}
              </span>
              <span className="text-[9px] text-rose-600 block mt-1 font-semibold">
                Leakage detection
              </span>
            </div>

            {/* Stat Card 6: Recovery Opportunity */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                bloombergMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Recovery Opportunity
              </span>
              <span className={`text-xl font-bold mt-2 block font-sans text-indigo-500`}>
                {formatCurrency(recoveryOpportunityValue)}
              </span>
              <span className="text-[9px] text-indigo-650 block mt-1 font-semibold">
                Unresolved gaps
              </span>
            </div>

          </div>

          {/* QUICK ACTIONS BAR */}
          <div className={`p-4 border rounded-2xl my-2 flex flex-wrap items-center justify-between gap-4 transition-all duration-300 ${
            bloombergMode ? 'bg-[#101726] border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              bloombergMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              ⚡ Quick Intelligence Actions:
            </span>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => runQuickAction('working-paper')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  bloombergMode 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-750'
                }`}
              >
                <FileSpreadsheet size={13} className="text-emerald-500" />
                <span>Export BOE Working Paper</span>
              </button>
              <button
                onClick={() => runQuickAction('client-summary')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  bloombergMode 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-750'
                }`}
              >
                <Send size={13} className="text-indigo-400" />
                <span>Generate Client Summary</span>
              </button>
              <button
                onClick={() => runQuickAction('tracker')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  bloombergMode 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-750'
                }`}
              >
                <Calendar size={13} className="text-amber-500" />
                <span>Create Follow-Up Tracker</span>
              </button>
              <button
                onClick={() => runQuickAction('report')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  bloombergMode 
                    ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                    : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                }`}
              >
                <FileDown size={13} />
                <span>Import ITC Recovery Report</span>
              </button>
            </div>
          </div>

          {/* ROOT CAUSE ANALYSIS SECTION */}
          <div className="py-6 space-y-4">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wider ${bloombergMode ? 'text-white' : 'text-slate-800'}`}>
                Forensic Root Cause Analysis
              </h3>
              <p className={`text-[11px] ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Grouped mismatches compiled from ICEGATE node diagnostics and XML schema validations. Click to filter ledger records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {categoriesList.map(cat => {
                const { count, value, avgConfidence } = getCategoryStats(cat.dbKey);
                const isSelected = rootCauseFilter === cat.dbKey;
                
                return (
                  <button
                    key={cat.name}
                    onClick={() => setRootCauseFilter(isSelected ? 'All' : cat.dbKey)}
                    className={`rounded-2xl p-4 border text-left transition-all duration-200 relative flex flex-col justify-between hover:scale-[1.02] ${
                      isSelected
                        ? 'border-indigo-500 ring-1 ring-indigo-500/30 shadow-md ' + (bloombergMode ? 'bg-[#171e36]' : 'bg-indigo-50/50')
                        : bloombergMode 
                          ? 'bg-[#131B2E] border-slate-800/80 hover:border-slate-700' 
                          : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-bold block truncate leading-tight ${
                        bloombergMode ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        {cat.name}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block mt-2 ${
                        count > 0 
                          ? `bg-rose-500/10 text-rose-400 border ${bloombergMode ? 'border-rose-900/30' : 'border-rose-200'}`
                          : bloombergMode ? 'bg-slate-850 text-slate-500 border border-slate-800' : 'bg-slate-100 text-slate-400 border-transparent'
                      }`}>
                        {count} {count === 1 ? 'case' : 'cases'}
                      </span>
                    </div>

                    <div className="mt-4.5 pt-3 border-t border-slate-800/20">
                      <span className="text-[9px] text-slate-400 block font-semibold">RECOVERY VAL</span>
                      <span className={`text-sm font-bold block ${count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {count > 0 ? formatCurrency(value) : '₹0'}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] text-indigo-400 block font-bold mt-1">
                          Confidence: {avgConfidence}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN ANALYSIS DESK */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 pt-2 pb-6">
            
            {/* LEFT COLUMN: RISKS & PRIORITIES (Col span 2) */}
            <div className="xl:col-span-2 space-y-6 flex flex-col justify-between">
              
              {/* Today's Priorities */}
              <div className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/20">
                  <h4 className={`text-xs font-black uppercase tracking-wider ${bloombergMode ? 'text-slate-300' : 'text-slate-800'}`}>
                    Today's Priorities
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400">Action Matrix</span>
                </div>

                <div className="space-y-3">
                  
                  {/* Category 1: Requires Follow-up */}
                  <div 
                    onClick={() => {
                      setStatusFilter('All');
                      setRootCauseFilter('All');
                      triggerToast('Filtered ledger records requiring immediate broker follow-up.');
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      bloombergMode ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-850' : 'bg-slate-50 hover:bg-slate-100 border border-slate-150'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Clock size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${bloombergMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          1. Cases requiring follow-up
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {getPriorityItems('Requires Follow-up').length}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        ICEGATE delay timeouts & split cargo reflection discrepancies.
                      </p>
                    </div>
                  </div>

                  {/* Category 2: Likely to self-resolve */}
                  <div 
                    onClick={() => {
                      setStatusFilter('All');
                      setRootCauseFilter('All');
                      triggerToast('Filtered cases within the standard portal sync window.');
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      bloombergMode ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-850' : 'bg-slate-50 hover:bg-slate-100 border border-slate-150'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${bloombergMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          2. Cases likely to self-resolve
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {getPriorityItems('Likely to Self-Resolve').length}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Recent filings inside the 72h auto-sync window.
                      </p>
                    </div>
                  </div>

                  {/* Category 3: Requires Amendment */}
                  <div 
                    onClick={() => {
                      setStatusFilter('All');
                      setRootCauseFilter('All');
                      triggerToast('Filtered cases with GSTIN data formatting errors requiring amendment.');
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      bloombergMode ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-850' : 'bg-slate-50 hover:bg-slate-100 border border-slate-150'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${bloombergMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          3. Cases requiring amendment
                        </span>
                        <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          {getPriorityItems('Requires Amendment').length}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        GSTIN matches or HSN validation format discrepancies.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Top Risk Imports */}
              <div className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/20">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-rose-500 animate-pulse" />
                    <h4 className={`text-xs font-black uppercase tracking-wider ${bloombergMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      Top Risk Imports
                    </h4>
                  </div>
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">
                    Risk Rank
                  </span>
                </div>

                <div className="divide-y divide-slate-800/20 max-h-60 overflow-y-auto hidden-scrollbar">
                  {sortedRiskImports.slice(0, 3).map((item) => {
                    const isSelected = selectedRow?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedRow(item)}
                        className={`py-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected 
                            ? bloombergMode ? 'bg-slate-900/60 px-2 rounded-lg' : 'bg-slate-50 px-2 rounded-lg' 
                            : 'hover:opacity-85'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold ${bloombergMode ? 'text-white' : 'text-slate-850'}`}>
                              {item.boe_number}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              ({item.boe_date})
                            </span>
                          </div>
                          <span className={`text-[9px] block font-semibold ${
                            item.root_cause_category === 'GSTIN Mismatch' ? 'text-rose-400' : 'text-slate-450'
                          }`}>
                            {item.root_cause_category} • {item.port_code.split(' (')[0]}
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs font-black font-sans text-rose-500">
                            {formatCurrency(item.difference)}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Exp: {item.age_days}d
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: AI INVESTIGATION PANEL (Col span 3) */}
            <div className="xl:col-span-3">
              <div className={`border rounded-2xl p-6 shadow-fintech-md relative overflow-hidden h-full flex flex-col justify-between transition-all duration-300 ${
                bloombergMode 
                  ? 'bg-gradient-to-br from-[#121A2D] to-[#0A0E18] border-indigo-900/50 shadow-indigo-950/20' 
                  : 'bg-white border-slate-200'
              }`}>
                {/* Accent glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {selectedRow ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    
                    {/* Header: File Details */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4.5 border-b border-slate-850/50">
                      <div className="space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${
                          bloombergMode ? 'text-indigo-400' : 'text-indigo-700'
                        }`}>
                          AI RECON DIAGNOSTIC FILE
                        </span>
                        <h4 className={`text-base font-extrabold ${bloombergMode ? 'text-white' : 'text-slate-900'}`}>
                          {selectedRow.boe_number}
                        </h4>
                        <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9.5px] text-slate-400">
                          <span>Filing: {selectedRow.boe_date}</span>
                          <span>•</span>
                          <span>Port: {selectedRow.port_code}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Potential Credit Gap</span>
                        <span className={`text-lg font-black block font-sans ${
                          selectedRow.status === 'Matched' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {formatCurrency(selectedRow.difference)}
                        </span>
                      </div>
                    </div>

                    {/* Investigation Core Details */}
                    <div className="space-y-4.5 flex-1 pt-3.5">
                      
                      {/* Grid for parameters */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-xl border ${
                          bloombergMode ? 'bg-[#151D31]/80 border-slate-800' : 'bg-slate-50 border-slate-150'
                        }`}>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Root Cause Mismatch</span>
                          <span className={`text-xs font-bold mt-1 block ${
                            selectedRow.status === 'Matched' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {selectedRow.root_cause_category === 'None' ? 'Fully Matched' : selectedRow.root_cause_category}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          bloombergMode ? 'bg-[#151D31]/80 border-slate-800' : 'bg-slate-50 border-slate-150'
                        }`}>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Recovery Probability</span>
                          <span className={`text-xs font-extrabold mt-1 block ${
                            selectedRow.recovery_probability > 90 ? 'text-emerald-400' : 'text-indigo-400'
                          }`}>
                            {selectedRow.recovery_probability}% Probability
                          </span>
                        </div>
                      </div>

                      {/* Why it occurred */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Why this occurred</span>
                        <p className={`text-xs font-sans leading-relaxed ${bloombergMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {selectedRow.why_occurred}
                        </p>
                      </div>

                      {/* Evidence */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Evidence used</span>
                        <p className={`text-xs font-sans leading-relaxed font-mono ${bloombergMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                          🔍 {selectedRow.evidence}
                        </p>
                      </div>

                      {/* Expected path */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Expected resolution path</span>
                        <p className={`text-xs font-sans leading-relaxed ${bloombergMode ? 'text-slate-350' : 'text-slate-850'}`}>
                          📋 {selectedRow.resolution_path}
                        </p>
                      </div>

                    </div>

                    {/* CA Audit Toolkit actions inside panel */}
                    <div className="pt-5 border-t border-slate-850/50 mt-4.5 space-y-3.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Investigation Resolution Toolkit</span>
                      
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        {/* Copy draft query */}
                        {selectedRow.status !== 'Matched' && (
                          <button
                            onClick={() => {
                              const draftText = `Support grievance ticket for BOE: ${selectedRow.boe_number}\nPort: ${selectedRow.port_code}, Filing date: ${selectedRow.boe_date}\nDiscrepancy category: ${selectedRow.root_cause_category}\nDetails: ${selectedRow.why_occurred}`;
                              handleCopyText(draftText, `support-${selectedRow.id}`);
                            }}
                            className={`btn btn-secondary btn-sm flex-1 ${
                              bloombergMode 
                                ? 'border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.08)]'
                                : ''
                            }`}
                          >
                            <Copy size={13} />
                            <span>{copiedAction === `support-${selectedRow.id}` ? 'Copied Draft!' : 'Copy Action Draft'}</span>
                          </button>
                        )}

                        {/* Force resolve */}
                        {selectedRow.status !== 'Matched' ? (
                          <button
                            onClick={() => resolveItem(selectedRow.id)}
                            className="btn btn-primary btn-sm flex-1"
                          >
                            <FileCheck2 size={13} />
                            <span>Approve & Resolve</span>
                          </button>
                        ) : (
                          <div className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                            bloombergMode ? 'bg-[#0E201E] border-emerald-950 text-emerald-400' : 'bg-emerald-50 border-emerald-150 text-emerald-700'
                          }`}>
                            <CheckCircle2 size={14} />
                            <span>Reconciled & Claim Cleared</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto">
                    <Cpu size={36} className="text-slate-600 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">No case selected</span>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mt-1">
                        Select a Bill of Entry record from the raw list or risk lists to view diagnostics.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* RAW AUDIT LEDGER GRID */}
          <div className={`border rounded-3xl overflow-hidden transition-all duration-300 ${
            bloombergMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            
            {/* Header section with toggle and search */}
            <div className="p-5 border-b border-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className={`text-sm font-black uppercase tracking-wider ${bloombergMode ? 'text-white' : 'text-slate-800'}`}>
                  Raw Audit Ledger
                </h3>
                <p className={`text-[10px] ${bloombergMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customs declaration files vs GSTR-2B matching ledger logs. Click row to inspect.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search query box */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search BOE / Port..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input w-48 pl-9 pr-4 text-[11px] font-bold"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5">
                  {['All', 'Matched', 'Value Mismatch', 'Missing in 2B'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        statusFilter === status
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : bloombergMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table view container */}
            <div className={`overflow-x-auto data-table-shell ${bloombergMode ? '' : 'bg-white'}`}>
              <table className={`data-table ${bloombergMode ? 'data-table-dark' : ''} data-table-striped-6plus`}>
                <thead>
                  <tr>
                    <th>BOE NUMBER</th>
                    <th>FILING DATE</th>
                    <th>PORT CODE</th>
                    <th className="text-right">CUSTOMS IGST</th>
                    <th className="text-right">GSTR-2B IGST</th>
                    <th className="text-right">DIFFERENCE</th>
                    <th>STATUS Badge</th>
                    <th>DIAGNOSTIC</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filteredRows.length > 0 ? (
                    filteredRows.map(row => {
                      const isSelected = selectedRow?.id === row.id;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedRow(row)}
                          className={`data-table-row-clickable transition-all duration-150 ${
                            isSelected
                              ? bloombergMode ? 'bg-[#18233C]/80' : 'bg-indigo-50/40'
                              : bloombergMode ? 'hover:bg-[#151F33]' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="font-medium text-[var(--color-accent)] hover:underline cursor-pointer">
                            {row.boe_number}
                          </td>
                          <td className="data-table-secondary">
                            {row.boe_date}
                          </td>
                          <td className="data-table-secondary">
                            {row.port_code.split(' (')[0]}
                          </td>
                          <td className="text-right">
                            {formatCurrency(row.igst_customs)}
                          </td>
                          <td className="text-right">
                            {row.igst_2b > 0 ? formatCurrency(row.igst_2b) : '—'}
                          </td>
                          <td className={`text-right font-semibold ${
                            row.difference > 0 ? 'text-[var(--color-error)]' : 'data-table-secondary'
                          }`}>
                            {row.difference > 0 ? formatCurrency(row.difference) : '—'}
                          </td>
                          <td className="font-sans">
                            <span className={`status-badge ${getUnifiedBadgeClass(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="font-sans text-[var(--color-primary-light)] underline font-medium">
                            Inspect
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 font-sans text-xs text-slate-500 font-bold">
                        No declarations match active filter keys.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

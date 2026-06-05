"use client";

import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Coins, 
  Calendar, 
  Layers, 
  HelpCircle, 
  Cpu,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react';

interface PredefinedProfile {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  difficultyColor: string;
  description: string;
  stats: string;
}

const PREDEFINED_PROFILES: PredefinedProfile[] = [
  {
    id: 'manufacturing',
    name: 'Apex Auto Components Ltd',
    type: 'Heavy Manufacturing',
    difficulty: '🚨 HIGH AUDIT RISK',
    difficultyColor: 'text-[#EF4444] bg-red-50/50 border-red-100 rounded-[3px]',
    description: 'Deals with massive supplier networks. High volume of missing GSTR-2B invoices, major value discrepancies, and an active DRC-01 statutory tax notice.',
    stats: '₹4.5L Blocked ITC • 12 Mismatches'
  },
  {
    id: 'trading',
    name: 'Vardhaman Wholesale Traders',
    type: 'High-Volume Trading',
    difficulty: '⚠️ MEDIUM RISK',
    difficultyColor: 'text-[#F59E0B] bg-amber-50/50 border-amber-100 rounded-[3px]',
    description: 'Fast stock turnarounds. Suffers from out-of-period supplier uploads, minor value round-offs, and an ASMT-10 return scrutiny warning.',
    stats: '₹75k Blocked ITC • 5 Mismatches'
  },
  {
    id: 'logistic',
    name: 'Indigo Global Freight',
    type: 'Import / Export Logistics',
    difficulty: '✓ STABLE / COMPLIANT',
    difficultyColor: 'text-[#10B981] bg-emerald-50/50 border-emerald-100 rounded-[3px]',
    description: 'Fully reconciled sandbox books matching portal registers exactly. Perfect baseline for comparing what a clean audit track looks like.',
    stats: '₹0 at Risk • 100% Reconciled'
  }
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PilotOnboardingWelcome() {
  const [selectedPain, setSelectedPain] = useState<string>('itc_leakage');
  const [selectedProfile, setSelectedProfile] = useState<string>('manufacturing');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const painPoints = [
    {
      id: 'itc_leakage',
      label: 'Vendor ITC Credit Blockage',
      icon: <Coins size={16} className="text-[#1B4F8A]" />,
      desc: 'Suppliers not filing GSTR-1, blocking working capital.'
    },
    {
      id: 'litigation',
      label: 'GST Notice Litigation Scrutiny',
      icon: <ShieldAlert size={16} className="text-[#1B4F8A]" />,
      desc: 'Handling complex DRC-01 / ASMT-10 discrepancy demands.'
    },
    {
      id: 'deadlines',
      label: 'Filing Deadlines & Escalation Checks',
      icon: <Calendar size={16} className="text-[#1B4F8A]" />,
      desc: 'Late-fees piling up across clients due to scheduling delays.'
    }
  ];

  const handleLaunchSandbox = async () => {
    setIsSubmitting(true);
    
    try {
      // 1. Trigger API Demo Bootstrap/Reset
      const res = await fetch(`${API_BASE}/api/demo/bootstrap`);
      if (res.ok) {
        // Log pilot onboarding action in analytics
        await fetch(`${API_BASE}/api/demo/analytics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_name: "onboarding_completed",
            metadata: {
              chosen_focus: selectedPain,
              chosen_client_profile: selectedProfile
            }
          })
        });
      }
    } catch (err) {
      console.error("Failed to seed sandbox:", err);
    }
    
    setIsSubmitting(false);
    
    // 2. Dispatch custom event to trigger OnboardingTour overlay globally
    const startTourEvent = new CustomEvent("start_product_tour");
    window.dispatchEvent(startTourEvent);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between overflow-y-auto p-6 md:p-12 relative font-sans">
      
      {/* Visual background decorative blurs removed */}

      {/* Top Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[3px] bg-[#1B4F8A] p-0.5 flex items-center justify-center shadow-sm">
            <div className="w-full h-full rounded-[3px] bg-white flex items-center justify-center">
              <Cpu size={18} className="text-[#1B4F8A]" />
            </div>
          </div>
          <div>
            <span className="text-[13px] font-black text-slate-900 tracking-tight">RECKON <span className="text-[#1B4F8A]">CA-OS</span></span>
            <span className="text-[9px] block text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Pilot Intake Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-extrabold text-[#10B981] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
          Investor / Pilot Version 1.0.0
        </div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center z-10 max-w-[1400px] mx-auto w-full flex-1">
        
        {/* Left Side: Product Intro */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest bg-indigo-50 text-[#1B4F8A] rounded-full border border-indigo-200">
            <Sparkles size={11} />
            Frictionless Product Walkthrough
          </div>
          
          <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-900">
            Welcome to the future of <span className="text-[#1B4F8A]">Tax Auditing.</span>
          </h1>

          <p className="text-[13.5px] text-slate-500 font-medium leading-relaxed">
            Reckon CA-OS is the intelligent operating system for Chartered Accountants. It automates high-volume GSTR-2B matching, parses complex tax notices via OCR, drafts responses using generative AI, and monitors compliance deadlines seamlessly.
          </p>

          {/* Education list panels */}
          <div className="space-y-4 pt-2">
            
            <div className="flex gap-3 bg-white p-3.5 rounded-[3px] border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-[3px] bg-slate-50 flex items-center justify-center border border-slate-200 flex-shrink-0">
                <Sparkles className="text-[#1B4F8A]" size={15} />
              </div>
              <div>
                <h4 className="text-[12.5px] font-bold text-slate-900 leading-tight">3-Minute Demonstration Sandbox</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  We pre-seed a live regulatory landscape with typical discrepancies so you can experience full capabilities instantly.
                </p>
              </div>
            </div>

            <div className="flex gap-3 bg-white p-3.5 rounded-[3px] border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-[3px] bg-slate-50 flex items-center justify-center border border-slate-200 flex-shrink-0">
                <BookOpen className="text-[#1B4F8A]" size={15} />
              </div>
              <div>
                <h4 className="text-[12.5px] font-bold text-slate-900 leading-tight">Optimized for Non-Technical CAs</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  A beautiful visual interface presenting high-stakes financial data without complex setup hurdles.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Setup Questionnaire Box */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[3px] p-6 md:p-8 shadow-sm relative">
          
          <div className="absolute top-5 right-5 text-slate-400 cursor-pointer" title="Need help?">
            <HelpCircle size={18} />
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">Configure Your Onboarding Path</h2>
          <p className="text-slate-500 text-[11px] font-medium mt-1 leading-relaxed">
            Select your focus areas to customize the demo sandbox and prepare your guided product tour.
          </p>

          <div className="space-y-6 mt-6">
            
            {/* Focus Question */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-[#1B4F8A] uppercase tracking-widest">
                Step 1: Choose Your Primary Focus
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {painPoints.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPain(item.id)}
                    className={`p-3.5 rounded-[3px] border text-left cursor-pointer flex flex-col justify-between h-[120px] ${
                      selectedPain === item.id 
                        ? 'bg-[#1B4F8A]/5 border-[#1B4F8A] text-slate-900 shadow-sm' 
                        : 'bg-[#FFFFFF] border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      {item.icon}
                      {selectedPain === item.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1B4F8A]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-extrabold leading-tight">{item.label}</h4>
                      <p className="text-[8.5px] text-slate-400 font-medium leading-tight mt-1 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Selection */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-[#1B4F8A] uppercase tracking-widest">
                Step 2: Pre-Select Active Client Audits Profile
              </span>
              <div className="space-y-2.5">
                {PREDEFINED_PROFILES.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile.id)}
                    className={`w-full p-4 rounded-[3px] border text-left cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                      selectedProfile === profile.id
                        ? 'bg-[#1B4F8A]/5 border-[#1B4F8A] text-slate-900 shadow-sm'
                        : 'bg-[#FFFFFF] border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <div className="space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[12px] font-extrabold text-slate-900 leading-none">{profile.name}</h4>
                        <span className="text-[9px] font-extrabold text-[#1B4F8A] bg-[#1B4F8A]/5 px-2 py-0.5 rounded-[3px] border border-[#1B4F8A]/10 uppercase">
                          {profile.type}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-normal font-medium">
                        {profile.description}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end gap-2 flex-shrink-0">
                      <span className={`text-[8.5px] font-black px-2.5 py-1 border uppercase tracking-wide leading-none ${profile.difficultyColor}`}>
                        {profile.difficulty}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold leading-none mt-1 block">
                        {profile.stats}
                      </span>
                    </div>

                  </button>
                ))}
              </div>
            </div>

            {/* Final Launch Actions */}
            <div className="pt-2">
              <button
                onClick={handleLaunchSandbox}
                disabled={isSubmitting}
                className="w-full h-[32px] bg-[#1B4F8A] text-[#FFFFFF] text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center gap-[6px] hover:bg-[#163F6E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-[12px] h-[12px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Initializing Your Pilot Audits...</span>
                  </>
                ) : (
                  <>
                    <span>Explore Demo Workspace & Start Guided Tour</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Footer Branding */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-200 pt-5 z-10 text-[10px] text-slate-400 font-bold">
        <span>© 2026 Reckon AI Technologies. Secure Auditor Workspaces.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-900">Privacy Audits</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-900">Frictionless SLA</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-900">Stakeholder Walkthrough</a>
        </div>
      </div>

    </div>
  );
}

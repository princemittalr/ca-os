"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Play, ChevronRight, ChevronLeft, X, Sparkles, HelpCircle, CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


interface TourStep {
  targetPath: string;
  title: string;
  description: string;
  highlightText: string;
  positionClass: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetPath: '/action-center',
    title: '✨ 1. Daily Action Center (AI Copilot)',
    description: 'Welcome to your operational dashboard! The AI Copilot scans your portfolio daily, compiling high-priority signals, calculating financial risk exposure, and presenting ranked actions due today.',
    highlightText: 'Focus on the "Daily Briefing" card and the priority ledger below.',
    positionClass: 'bottom-6 right-6 md:right-12 max-w-md'
  },
  {
    targetPath: '/gst-recon',
    title: '📊 2. GST Reconciliation Desk',
    description: 'Reconcile purchase books against GSTR-2B files instantly. Here, you can review matched entries and value discrepancies, and click "Explain Mismatch" to see dynamic AI reasoning.',
    highlightText: 'Check out the "Explain Mismatch" panel on the right side of the invoice rows.',
    positionClass: 'bottom-6 right-6 md:right-12 max-w-md'
  },
  {
    targetPath: '/notices',
    title: '⚖️ 3. Litigation & Notices Desk',
    description: 'Upload PDF tax notices. CA-OS runs OCR parsers to extract tax amounts, referenced sections (e.g. Section 73), and hearing dates, then writes audit-ready response letters.',
    highlightText: 'Look at the "AI Reply Draft Generator" typewriter console.',
    positionClass: 'bottom-6 right-6 md:right-12 max-w-md'
  },
  {
    targetPath: '/compliance',
    title: '📅 4. Compliance Command Center',
    description: 'Track statutory filing folders, tax timelines, and escalation logs. Overdue files are automatically escalated by risk levels to keep your firm penalty-free.',
    highlightText: 'Notice the visual due dates and color-coded status badges.',
    positionClass: 'bottom-6 right-6 md:right-12 max-w-md'
  }
];

export default function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState<number>(-1);

  // Sync state with localStorage on load
  useEffect(() => {
    const activeStep = localStorage.getItem("active_tour_step");
    if (activeStep !== null) {
      const stepIndex = parseInt(activeStep, 10);
      setCurrentStep(stepIndex);
      
      // Ensure we are on the correct path for the step
      const expectedPath = TOUR_STEPS[stepIndex]?.targetPath;
      if (expectedPath && pathname !== expectedPath) {
        router.push(expectedPath);
      }
    }
  }, []);

  // Listen to custom start_tour events triggered from welcome page
  useEffect(() => {
    const handleStartTour = () => {
      localStorage.setItem("active_tour_step", "0");
      setCurrentStep(0);
      router.push(TOUR_STEPS[0].targetPath);
      
      // Submit analytics boot event
      fetch(`${API_BASE}/api/demo/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "tour_started",
          metadata: { timestamp: new Date().toISOString() }
        })
      }).catch(() => {});
    };

    window.addEventListener("start_product_tour", handleStartTour);
    return () => window.removeEventListener("start_product_tour", handleStartTour);
  }, [router]);

  if (currentStep === -1 || currentStep >= TOUR_STEPS.length) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    const nextIndex = currentStep + 1;
    if (nextIndex < TOUR_STEPS.length) {
      localStorage.setItem("active_tour_step", nextIndex.toString());
      setCurrentStep(nextIndex);
      router.push(TOUR_STEPS[nextIndex].targetPath);
      
      // Analytics tick
      fetch(`${API_BASE}/api/demo/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "tour_step_clicked",
          metadata: { step: nextIndex, path: TOUR_STEPS[nextIndex].targetPath }
        })
      }).catch(() => {});
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStep - 1;
    if (prevIndex >= 0) {
      localStorage.setItem("active_tour_step", prevIndex.toString());
      setCurrentStep(prevIndex);
      router.push(TOUR_STEPS[prevIndex].targetPath);
    }
  };

  const handleComplete = () => {
    localStorage.removeItem("active_tour_step");
    setCurrentStep(-1);
    router.push('/action-center');
    
    // Complete analytics boot event
    fetch(`${API_BASE}/api/demo/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "tour_completed",
        metadata: { timestamp: new Date().toISOString() }
      })
    }).catch(() => {});
  };

  const handleSkip = () => {
    localStorage.removeItem("active_tour_step");
    setCurrentStep(-1);
    
    fetch(`${API_BASE}/api/demo/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "tour_skipped",
        metadata: { step_skipped: currentStep }
      })
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-[99999] pointer-events-none flex items-end sm:items-center justify-center p-4">
      {/* Target Page Outline highlight simulation */}
      <div className="absolute top-2 left-2 bg-[#4F46E5] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full pointer-events-auto shadow-lg flex items-center gap-1 border border-indigo-400 animate-bounce">
        <Sparkles size={10} className="animate-spin" />
        Touring: {step.title.split('. ')[1]}
      </div>

      {/* Tour Dialog Card */}
      <div 
        className={`fixed bg-white border border-slate-200 p-6 rounded-3xl shadow-fintech-lg pointer-events-auto transition-all duration-300 ${step.positionClass}`}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-200">
              <HelpCircle size={13} className="text-[#4F46E5]" />
            </div>
            <h4 className="text-[13px] font-black tracking-tight text-slate-900">{step.title}</h4>
          </div>
          <button 
            onClick={handleSkip} 
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Skip Tour"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
          {step.description}
        </p>

        {/* Dynamic focus alert helper */}
        <div className="mt-3.5 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2">
          <Sparkles size={14} className="text-[#4F46E5] flex-shrink-0 mt-0.5" />
          <span className="text-[10px] font-bold text-[#4F46E5] tracking-wide leading-tight">
            PRO-TIP: {step.highlightText}
          </span>
        </div>

        {/* Progress & Navigation Actions */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-6 bg-[#4F46E5]' 
                    : idx < currentStep 
                    ? 'w-2 bg-[#4F46E5]/40' 
                    : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 bg-white rounded-xl cursor-pointer transition-all duration-200"
              >
                <ChevronLeft size={12} />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl cursor-pointer shadow-md shadow-indigo-200 transition-all duration-200"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle size={12} />
                  Finish Tour
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

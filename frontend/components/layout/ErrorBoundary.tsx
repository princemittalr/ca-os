"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught react layout error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC] text-slate-900 p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-fintech-lg space-y-6 text-center relative z-10">
            {/* Warning icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center">
              <ShieldAlert size={28} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-[#EF4444] tracking-[0.25em] uppercase block">Statutory Boundary Breach</span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Application Render Error</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                A critical rendering exception occurred in the client layout tree. The Reckon AI Copilot boundary successfully intercepted the crash.
              </p>
            </div>

            {/* Error detail panel */}
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-left text-red-600 font-mono text-[10px] overflow-x-auto select-all max-h-32 hidden-scrollbar">
              <span className="font-bold text-[#EF4444] block">[Exception Details]</span>
              {this.state.error?.toString() || "Unknown layout compile exception."}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="flex-1 h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home size={13} />
                Audit Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

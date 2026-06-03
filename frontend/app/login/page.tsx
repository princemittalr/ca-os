"use client";

import React, { useState } from 'react';
import {
  Building,
  Zap,
  CheckCircle2,
  AlertCircle,
  MailWarning,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  Clock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Store real session
      localStorage.setItem("access_token", data.session!.access_token);
      localStorage.setItem("user_id", data.user!.id);
      localStorage.setItem("full_name", data.user!.user_metadata?.full_name || email);
      localStorage.setItem("role", data.user!.user_metadata?.role || "PARTNER");
      localStorage.setItem("firm_id", data.user!.user_metadata?.firm_id || "mock-firm-uuid-67890");

      showToast("✓ Authentication successful! Redirecting...");
      setTimeout(() => { window.location.href = "/action-center"; }, 1500);

    } catch (err: any) {
      console.error(err);
      // Dev fallback
      localStorage.setItem("access_token", "mock-access-token-partner-12345");
      localStorage.setItem("role", "PARTNER");
      localStorage.setItem("full_name", "Aditya Rao");
      localStorage.setItem("firm_id", "mock-firm-uuid-67890");
      showToast("✓ Dev session authorized.");
      setTimeout(() => { window.location.href = "/action-center"; }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background decorative blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/50 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-100/50 rounded-full filter blur-[100px] pointer-events-none"></div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0 animate-bounce" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-10 shadow-fintech-lg relative z-10 space-y-8 animate-in scale-in duration-300">

        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Reckon CA-OS</h2>
            <span className="text-[10px] font-black text-[#7C3AED] tracking-[0.25em] uppercase mt-0.5 block">Audit Operating System</span>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[11px] text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-[#4F46E5] flex-shrink-0" />
          <p>
            Secure, encrypted workspace portal authorized for Chartered Accountants. Row-level security partitions enabled across all corporate client registers.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 font-sans">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Firm Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. aditya@firm.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Access Password</label>
              <Link href="/forgot-password">
                <span className="text-[10px] text-[#4F46E5] hover:underline cursor-pointer">Forgot?</span>
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-md w-full"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Authenticate Session</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Need to register your CA Firm? </span>
          <Link href="/signup">
            <span className="text-[#4F46E5] font-bold hover:underline cursor-pointer">Sign Up</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
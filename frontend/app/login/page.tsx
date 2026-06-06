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
import { supabase } from '../../lib/supabase';

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

      // Use the singleton — no inline createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Supabase SDK auto-persists the session (access + refresh tokens) in its
      // own namespaced localStorage key and refreshes before expiry.
      // We only write profile metadata so Sidebar / TopBar can read them
      // synchronously until those components are migrated.
      const metadata = data.user!.user_metadata ?? {};
      localStorage.setItem("user_id", data.user!.id);
      localStorage.setItem("full_name", metadata.full_name || email);
      localStorage.setItem("role", metadata.role || "PARTNER");
      localStorage.setItem("firm_id", metadata.firm_id || "");

      showToast("✓ Authentication successful! Redirecting...");
      setTimeout(() => { window.location.href = "/action-center"; }, 1500);

    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Authentication failed. Please check your credentials.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background decorative blurs removed */}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-[3px] shadow-sm z-[100] max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-white border border-slate-200 rounded-[3px] max-w-[640px] w-full p-10 shadow-sm relative z-10 space-y-8">

        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto shadow-sm">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Reckon CA-OS</h2>
            <span className="text-[10px] font-black text-[#1B4F8A] tracking-[0.25em] uppercase mt-0.5 block">Audit Operating System</span>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-[3px] text-[11px] text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-[#1B4F8A] flex-shrink-0" />
          <p>
            Secure, encrypted workspace portal authorized for Chartered Accountants. Row-level security partitions enabled across all corporate client registers.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 font-sans">
          {errorMessage && (
            <div className="text-[11px] text-[#B91C1C] mt-[3px]">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Firm Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. aditya@firm.com"
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-[4px]">
              <label className="block text-[12px] font-medium text-[#374151]">Access Password</label>
              <Link href="/forgot-password">
                <span className="text-[12px] text-[#1B4F8A] hover:underline cursor-pointer">Forgot?</span>
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[32px] bg-[#1B4F8A] text-[#FFFFFF] text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center gap-[6px] hover:bg-[#163F6E] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-[12px] h-[12px] border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Authenticate Session</span>
                <ArrowRight size={12} />
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
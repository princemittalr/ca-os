"use client";

import React, { useState } from 'react';
import {
  Building,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const validate = (): string | null => {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showToast("Authentication successful! Redirecting...");
      setTimeout(() => { router.push("/action-center"); }, 1200);

    } catch (err: any) {
      const message = err?.message || "Authentication failed. Please check your credentials.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans">
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-[3px] shadow-sm z-[100] max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[3px] max-w-[640px] w-full p-10 shadow-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto shadow-sm">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Reckon CA-OS</h2>
            <span className="text-[10px] font-black text-[#1B4F8A] tracking-[0.25em] uppercase mt-0.5 block">Audit Operating System</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-[3px] text-[11px] text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-[#1B4F8A] flex-shrink-0" />
          <p>Secure, encrypted workspace portal authorized for Chartered Accountants. Row-level security enabled across all client registers.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {errorMessage && (
            <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-100 px-3 py-2 rounded-[3px]">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Firm Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMessage(''); }}
              placeholder="e.g. aditya@firm.com"
              disabled={isLoading}
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26] disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-[4px]">
              <label className="block text-[12px] font-medium text-[#374151]">Access Password</label>
              <Link href="/forgot-password" title="Forgot Password" className="text-[12px] text-[#1B4F8A] hover:underline">Forgot?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrorMessage(''); }}
              placeholder="Minimum 8 characters"
              disabled={isLoading}
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full h-[32px] bg-[#1B4F8A] text-white text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center gap-[6px] hover:bg-[#163F6E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-[12px] h-[12px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <><span>Authenticate Session</span><ArrowRight size={12} /></>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Need to register your CA Firm?{' '}
          <Link href="/signup" className="text-[#4F46E5] font-bold hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
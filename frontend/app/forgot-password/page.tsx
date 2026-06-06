"use client";

import React, { useState } from 'react';
import { 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  MailWarning
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sent, setSent] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Supabase will append #access_token=... to this URL.
        // The /reset-password page must call supabase.auth.updateUser({ password })
        // after reading the hash fragment.
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      showToast("✓ Reset email sent! Check your inbox.");
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-[3px] shadow-sm z-[100] max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Reset Panel */}
      <div className="bg-white border border-slate-200 rounded-[3px] max-w-[480px] w-full p-10 shadow-sm relative z-10 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto shadow-sm">
            <MailWarning size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Reset Password</h2>
            <span className="text-[10px] font-black text-[#1B4F8A] tracking-[0.25em] uppercase mt-0.5 block">Statutory Access Recovery</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center max-w-xs mx-auto leading-relaxed">
          Provide your registered CA firm email address. We will transmit an encrypted login bypass link to restore session access.
        </p>

        {sent ? (
          // Success state — email dispatched
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[3px] p-4 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#10B981] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold text-[#166534]">Reset link dispatched</p>
              <p className="text-[11px] text-[#166534] mt-0.5 leading-relaxed">
                Check <span className="font-semibold">{email}</span> for the password reset email. The link expires in 1 hour.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 font-sans">
            {errorMessage && (
              <div className="text-[11px] text-[#B91C1C] flex items-center gap-1.5">
                <AlertCircle size={13} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Registered Email *</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. aditya@firm.com"
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
                  <span>Transmit Reset Link</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Remembered access? </span>
          <Link href="/login">
            <span className="text-[#4F46E5] font-bold hover:underline cursor-pointer">Sign In</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

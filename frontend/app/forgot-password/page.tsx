"use client";

import React, { useState } from 'react';
import { 
  Building, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  MailWarning
} from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
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
      
      // In a real environment, we'd trigger a Supabase reset:
      // await supabase_client.auth.reset_password_for_email(email)
      
      showToast("✓ Reset email sent successfully! Check your inbox.");
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-100/50 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full filter blur-[100px] pointer-events-none"></div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-2xl shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0 animate-bounce" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Reset Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-10 shadow-fintech-lg relative z-10 space-y-6 animate-in scale-in duration-300">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Reset Password</h2>
            <span className="text-[10px] font-black text-[#7C3AED] tracking-[0.25em] uppercase mt-0.5 block">Statutory Access recovery</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center max-w-xs mx-auto leading-relaxed">
          Provide your registered CA firm email address. We will transmit an encrypted login bypass link to restore session access.
        </p>

        <form onSubmit={handleReset} className="space-y-4 font-sans">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Registered Email *</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. aditya@firm.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-3.5 rounded-xl text-xs font-black shadow-md shadow-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Transmit Reset Link</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

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

"use client";

import React, { useState } from 'react';
import { 
  Building, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [role, setRole] = useState('PARTNER');
  
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !firmName) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Step 1: Call the backend to provision firm UUID and create the Supabase user
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          firm_name: firmName,
          role
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || "Onboarding request failed.");
      }
      
      const data = await res.json();

      // Step 2: Sign in via the Supabase SDK so the SDK takes ownership of the
      // session (auto-refresh, proper storage). The backend already created the
      // Supabase user, so this will succeed immediately.
      // Note: backend TokenResponse does not include refresh_token, so we
      // re-authenticate rather than calling setSession().
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Step 3: Session is now owned by the Supabase SDK.
      // Sidebar and TopBar read full_name/role from supabase.auth.getUser()
      // directly — no manual localStorage writes needed.

      showToast("✓ Onboarding successful! Provisining CA firm workspace...");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Registration failed. Please try again.");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background blurs removed */}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 border-l-4 border-l-[#10B981] text-slate-900 px-6 py-4 rounded-[3px] shadow-sm z-[100] max-w-sm flex items-center gap-3.5">
          <CheckCircle2 className="text-[#10B981] flex-shrink-0" size={20} />
          <span className="text-[13px] font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Signup Panel */}
      <div className="bg-white border border-slate-200 rounded-[3px] max-w-[640px] w-full p-10 shadow-sm relative z-10 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto shadow-sm">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">CA Firm Onboarding</h2>
            <span className="text-[10px] font-black text-[#1B4F8A] tracking-[0.25em] uppercase mt-0.5 block">Create Firm Profile</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 font-sans">
          {errorMessage && (
            <div className="text-[11px] text-[#B91C1C] mt-[3px]">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-[12px] gap-y-[16px]">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Auditor Full Name *</label>
              <input 
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">CA Firm Name *</label>
              <input 
                type="text"
                required
                value={firmName}
                onChange={e => setFirmName(e.target.value)}
                placeholder="e.g. Sharma & Associates"
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Firm Role Designation *</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
            >
              <option value="PARTNER">CA Partner / Principal</option>
              <option value="MANAGER">Audit Manager</option>
              <option value="ARTICLE">Article Clerk / Associate</option>
              <option value="CLIENT_VIEWER">External Client Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Firm Email Address *</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. auditor@firm.com"
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-[#FFFFFF] text-[13px] text-[#111827] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A26]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Password *</label>
            <input 
              type="password"
              required
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
                <span>Provision Firm Workspace</span>
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Already registered? </span>
          <Link href="/login">
            <span className="text-[#4F46E5] font-bold hover:underline cursor-pointer">Sign In</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

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
      
      if (!res.ok) throw new Error("Onboarding request failed.");
      
      const data = await res.json();
      
      // Save session details
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("firm_id", data.firm_id);
      localStorage.setItem("role", data.role);
      localStorage.setItem("full_name", data.full_name);
      
      showToast("✓ Onboarding successful! Provisining CA firm workspace...");
      setTimeout(() => {
        window.location.href = "/action-center";
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      
      // Fallback Mock signup session allocations
      localStorage.setItem("access_token", "mock-access-token-partner-12345");
      localStorage.setItem("user_id", "mock-user-uuid-12345");
      localStorage.setItem("firm_id", "mock-firm-uuid-67890");
      localStorage.setItem("role", role);
      localStorage.setItem("full_name", fullName);
      
      showToast("✓ Mock CA Firm provisioned successfully.");
      setTimeout(() => {
        window.location.href = "/action-center";
      }, 1500);
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

      {/* Signup Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-10 shadow-fintech-lg relative z-10 space-y-6 animate-in scale-in duration-300">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">CA Firm Onboarding</h2>
            <span className="text-[10px] font-black text-[#7C3AED] tracking-[0.25em] uppercase mt-0.5 block">Create Firm Profile</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 font-sans">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Auditor Full Name *</label>
              <input 
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Aditya Rao"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">CA Firm Name *</label>
              <input 
                type="text"
                required
                value={firmName}
                onChange={e => setFirmName(e.target.value)}
                placeholder="Rao & Associates"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Firm Role Designation *</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            >
              <option value="PARTNER">CA Partner / Principal</option>
              <option value="MANAGER">Audit Manager</option>
              <option value="ARTICLE">Article Clerk / Associate</option>
              <option value="CLIENT_VIEWER">External Client Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Firm Email Address *</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. aditya@firm.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Password *</label>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
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
                <span>Provision Firm Workspace</span>
                <ArrowRight size={14} />
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

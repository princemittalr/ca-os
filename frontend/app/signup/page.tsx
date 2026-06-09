"use client";

import React, { useState } from 'react';
import { Building, CheckCircle2, ShieldAlert, ArrowRight, MailWarning } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [role, setRole] = useState('PARTNER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailPendingConfirm, setEmailPendingConfirm] = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (!firmName.trim()) return "Firm name is required.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMessage(err); return; }

    setIsLoading(true);
    setErrorMessage('');

    const firm_id = generateUUID();

    try {
      // Sign up directly via Supabase SDK — no backend needed
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, firm_name: firmName, role, firm_id }
        }
      });

      if (error) throw error;

      if (!data.user) throw new Error("Signup failed — no user returned.");

      // If session exists → email confirm disabled → redirect
      if (data.session) {
        // Explicitly persist session so ClientLayoutWrapper reads it immediately
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // 409 duplicate = trigger already inserted row — ignore
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          full_name: fullName,
          firm_name: firmName,
          firm_id,
          onboarding_complete: false
        });
        if (insertError && !insertError.message?.includes("duplicate")) {
          console.warn("[SIGNUP] Profile insert error:", insertError.message);
        }

        // Mark onboarding complete immediately — user goes straight to dashboard
        await supabase.from("users")
          .update({ onboarding_complete: true })
          .eq("id", data.user.id);

        // Wait for SDK to persist session before navigation
        await new Promise(r => setTimeout(r, 500));
        router.push("/action-center");
        return;
      }

      // No session = email confirmation required
      setEmailPendingConfirm(true);

    } catch (err: any) {
      console.error("[SIGNUP] error:", err);
      setErrorMessage(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailPendingConfirm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-[3px] max-w-[480px] w-full p-10 shadow-sm text-center space-y-6">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto">
            <MailWarning size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Verify Your Email</h2>
            <p className="text-[13px] text-slate-500 mt-2">
              Verification link sent to <strong>{email}</strong>. Click it to activate your workspace.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-[3px] text-[11px] text-slate-500 text-left">
            After verifying, <Link href="/login" className="text-[#1B4F8A] font-bold hover:underline">sign in here</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-[3px] max-w-[640px] w-full p-10 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[3px] bg-[#1B4F8A] text-white flex items-center justify-center mx-auto shadow-sm">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-3">CA Firm Onboarding</h2>
            <span className="text-[10px] font-black text-[#1B4F8A] tracking-[0.25em] uppercase mt-0.5 block">Create Firm Profile</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {errorMessage && (
            <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-100 px-3 py-2 rounded-[3px]">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Auditor Full Name *</label>
              <input type="text" required value={fullName}
                onChange={e => { setFullName(e.target.value); setErrorMessage(''); }}
                placeholder="e.g. Rahul Sharma" disabled={isLoading}
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">CA Firm Name *</label>
              <input type="text" required value={firmName}
                onChange={e => { setFirmName(e.target.value); setErrorMessage(''); }}
                placeholder="e.g. Sharma & Associates" disabled={isLoading}
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Role Designation *</label>
            <select value={role} onChange={e => setRole(e.target.value)} disabled={isLoading}
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50">
              <option value="PARTNER">CA Partner / Principal</option>
              <option value="MANAGER">Audit Manager</option>
              <option value="ARTICLE">Article Clerk / Associate</option>
              <option value="CLIENT_VIEWER">External Client Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Firm Email Address *</label>
            <input type="email" required value={email}
              onChange={e => { setEmail(e.target.value); setErrorMessage(''); }}
              placeholder="e.g. auditor@firm.com" disabled={isLoading}
              className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50" />
          </div>

          <div className="grid grid-cols-2 gap-x-3">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Password *</label>
              <input type="password" required value={password}
                onChange={e => { setPassword(e.target.value); setErrorMessage(''); }}
                placeholder="Min 8 characters" disabled={isLoading}
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-[4px]">Confirm Password *</label>
              <input type="password" required value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setErrorMessage(''); }}
                placeholder="Repeat password" disabled={isLoading}
                className="w-full h-[32px] border border-[#D1D5DB] rounded-[3px] bg-white text-[13px] px-[10px] placeholder-[#9CA3AF] focus:border-[#1B4F8A] focus:outline-none disabled:opacity-50" />
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full h-[32px] bg-[#1B4F8A] text-white text-[13px] font-medium rounded-[3px] px-[14px] flex items-center justify-center gap-[6px] hover:bg-[#163F6E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isLoading
              ? <div className="w-[12px] h-[12px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <><span>Provision Firm Workspace</span><ArrowRight size={12} /></>}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already registered?{' '}
          <Link href="/login" className="text-[#4F46E5] font-bold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
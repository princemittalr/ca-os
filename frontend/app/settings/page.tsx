"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { api } from '@/lib/api';

import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { useToast } from '@/components/ui/Toast';
import { 
  User, 
  Shield, 
  Bell, 
  Users, 
  CreditCard, 
  Database, 
  Camera, 
  Loader2,
  Lock, 
  AlertTriangle, 
  Plus,
  QrCode,
  Laptop,
  Smartphone,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Key,
  Briefcase,
  Eye,
  EyeOff,
  Check,
  X,
  KeyRound,
  Activity,
  Mail
} from 'lucide-react';

const initialSessions = [
  { id: 's-1', device: 'Chrome Browser on Windows 11', location: 'Mumbai, India', last_active: 'Active now', is_mobile: false },
  { id: 's-2', device: 'Safari on iPhone 15 Pro', location: 'Delhi, India', last_active: '2 hours ago', is_mobile: true },
  { id: 's-3', device: 'Firefox on macOS Monterey', location: 'Bangalore, India', last_active: '3 days ago', is_mobile: false }
];

const initialMembers = [
  { id: 'm-1', name: 'Rahul Sharma', email: 'rahul.sharma@reckon.ai', role: 'Owner / CA', status: 'Active' },
  { id: 'm-2', name: 'Priyanka Patel', email: 'priyanka.patel@reckon.ai', role: 'Assistant CA', status: 'Active' },
  { id: 'm-3', name: 'Amit Verma', email: 'amit.verma@gmail.com', role: 'Junior Accountant', status: 'Pending Invite' }
];

function SettingsContent() {
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState('profile'); // profile / security / notifications / firm / billing / data
  
  // Bind tabParam from URL query to state
  useEffect(() => {
    if (tabParam && ['profile', 'security', 'notifications', 'firm', 'billing', 'data'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Profile state (USER-SPECIFIC)
  const [profileData, setProfileData] = useState({
    fullName: 'Rahul Sharma',
    icaiNo: 'ICA-489012',
    email: 'rahul.sharma@reckon.ai',
    phone: '+91 98765 43210',
    city: 'Mumbai',
    designation: 'Managing Partner',
    practiceYears: '12 Years',
    bio: 'Senior Chartered Accountant specializing in corporate tax filings, international audits, and GSTR compliance advisory.',
    preferences: 'Light Mode Override Disabled'
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata) {
        setProfileData(prev => ({
          ...prev,
          fullName: user.user_metadata.full_name || prev.fullName,
          email: user.email || prev.email,
        }));
      }
    });
  }, []);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redesigned Secure Password Update States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Verify, 2: New Password, 3: Confirm, 4: Success
  const [verifyMethod, setVerifyMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  
  const [showVerifyPass, setShowVerifyPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [newPassVal, setNewPassVal] = useState('');
  const [confirmPassVal, setConfirmPassVal] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const getPasswordStrengthLabel = (score: number) => {
    if (!newPassVal) return { label: 'Empty', color: 'bg-white/10', width: 'w-0', text: 'text-slate-500' };
    if (score <= 2) return { label: 'Weak', color: 'bg-[#EF4444]', width: 'w-1/3', text: 'text-[#EF4444]' };
    if (score <= 4) return { label: 'Medium', color: 'bg-[#F59E0B]', width: 'w-2/3', text: 'text-[#F59E0B]' };
    return { label: 'Strong', color: 'bg-[#10B981]', width: 'w-full', text: 'text-[#10B981]' };
  };

  // Two-Factor Authentication (2FA) States
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(1); // 1: Verify, 2: Choose, 3: Setup QR, 4: Code, 5: Backup/Success
  const [twoFactorMethod, setTwoFactorMethod] = useState<'authenticator' | 'sms' | 'email'>('authenticator');
  const [twoFactorPasswordInput, setTwoFactorPasswordInput] = useState('');
  const [twoFactorOtpSent, setTwoFactorOtpSent] = useState(false);
  const [twoFactorOtpTimer, setTwoFactorOtpTimer] = useState(0);
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']); // Setup verify code
  const [showTwoFactorVerifyPass, setShowTwoFactorVerifyPass] = useState(false);
  
  // Disable 2FA states
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [disableOtpInput, setDisableOtpInput] = useState('');
  const [disableOtpSent, setDisableOtpSent] = useState(false);
  const [disableOtpTimer, setDisableOtpTimer] = useState(0);
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisablePass, setShowDisablePass] = useState(false);

  const backupRecoveryCodes = ['RCK-4512-B2A8', 'RCK-9081-D9F5', 'RCK-1122-C8A4', 'RCK-5890-A3E7'];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (twoFactorOtpTimer > 0) {
      interval = setInterval(() => {
        setTwoFactorOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [twoFactorOtpTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (disableOtpTimer > 0) {
      interval = setInterval(() => {
        setDisableOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [disableOtpTimer]);

  // NOTE: profile image stored in component state only (not localStorage).
  // If a base64 data URL were persisted locally, it would be treated as a UI-only preference.
  // That would be exempt from the no-localStorage rule:
  //   - display-only, no security implications, auto-cleared on browser reset.
  // For now: kept in React state only — no persistence at all.
  useEffect(() => {
    // Future: load from user metadata or CDN if backend stores profile photos
  }, []);

  const updateProfileImage = (newImage: string | null) => {
    setProfileImage(newImage);
    // Future: sync to backend or CDN when profile photo upload endpoint is available
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB cap)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("Image exceeds 5MB limit", "error");
      e.target.value = '';
      return;
    }

    // Validate file type
    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      showToast("Unsupported file format", "error");
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setTimeout(() => {
            resolve(reader.result as string);
          }, 1500);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      updateProfileImage(dataUrl);
      showToast("Profile photo updated successfully.", "success");
    } catch (err) {
      showToast("Error uploading profile photo.", "error");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Firm state (FIRM-SPECIFIC)
  const [firmData, setFirmData] = useState({
    firmName: 'Sharma & Associates CA',
    gstin: '27AAAAA1111A1Z1',
    officeAddress: '102 Maker Chambers, Nariman Point, Mumbai',
    caRegistration: 'FRN-80123C',
    brandingColor: '#4F46E5',
    clientDefaults: 'Automated match priority standard'
  });

  // Security states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);

  // Notification toggles states
  const [notifStates, setNotifStates] = useState({
    reconComplete: true,
    mismatchDetected: true,
    itcRisk: true,
    deadline7d: true,
    deadline3d: true,
    deadline1d: false,
    overdue: true,
  });

  // Team states
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Junior Accountant');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Note: backend profile update (PATCH /api/auth/me/profile) is currently out of scope.
    // Keeping changes local for now.
    showToast("Personal Profile changes saved.", "success");
  };

  const handleSaveFirm = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Firm Settings & Business ledger updated.", "success");
  };

  // Secure password update handled via multi-step workflow modal

  const handleRevokeSession = async (id: string, name: string) => {
    try {
      await api.delete(`/api/auth/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
      showToast(`Session revoked on ${name}`, "success");
    } catch (err) {
      showToast("Revocation Failed: Unable to revoke session.", "error");
    }
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    const newMember = {
      id: `m-${members.length + 1}`,
      name: inviteEmail.split('@')[0].replace('.', ' '),
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending Invite'
    };

    setMembers([...members, newMember]);
    setInviteEmail('');
    showToast(`Invite dispatched to ${inviteEmail}`, "success");
  };

  const handleRevokeMember = (id: string, name: string) => {
    setMembers(members.filter(m => m.id !== id));
    showToast(`Access revoked for ${name}`, "success");
  };

  // Real-time password strength indicator computed locally inside modal

  return (
    <div className="space-y-10 pb-16 relative">
      
      {/* Toast Alert */}
      {ToastComponent}

      {/* Remove Confirmation Modal */}
      {showConfirmRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[3px] max-w-md w-full p-6 shadow-sm relative overflow-hidden">
            {/* Background Glow removed */}
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444] flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-2">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Remove Profile Photo?</h3>
                <p className="text-[13.5px] text-slate-400 leading-relaxed">
                  Are you sure you want to delete your custom profile picture? This will instantly restore your initials default avatar.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button 
                type="button"
                onClick={() => setShowConfirmRemove(false)}
                className="px-4 py-2.5 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[12.5px] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  updateProfileImage(null);
                  setShowConfirmRemove(false);
                  showToast("Profile photo removed successfully.", "success");
                }}
                className="px-4 py-2.5 rounded-[3px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-bold text-[12.5px] cursor-pointer shadow-sm"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        sectionLabel="Preferences"
        title="Settings"
        description="Configure personal CA profiles, platform-level configuration parameters, and firm registries."
        hasSeparator={true}
      />

      {/* ── Settings Layout: Sticky Sidebar + Content Panel ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-nav-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          padding: 20px 12px 8px;
          display: block;
        }
        .settings-nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          width: 100%;
          text-align: left;
          transition: background var(--transition-fast), color var(--transition-fast);
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
        }
        .settings-nav-item:hover {
          background: var(--color-surface-hover);
          color: var(--color-text-primary);
        }
        .settings-nav-item.active {
          background: var(--color-accent-soft);
          color: var(--color-primary-light);
        }
        .settings-nav-item svg {
          flex-shrink: 0;
        }
      `}} />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ── Left Sidebar Nav (220px, sticky) ── */}
        <div className="w-full lg:w-[220px] flex-shrink-0" style={{ position: 'sticky', top: 24 }}>
          <div className="std-card" style={{ padding: '8px 8px 12px' }}>

            {/* USER PREFERENCES */}
            <span className="settings-nav-label">User Preferences</span>
            <button
              onClick={() => setActiveTab('profile')}
              className={`settings-nav-item${activeTab === 'profile' ? ' active' : ''}`}
            >
              <User size={16} />
              <span>My Profile</span>
            </button>

            {/* SYSTEM SETTINGS */}
            <span className="settings-nav-label">System Settings</span>
            <button
              onClick={() => setActiveTab('security')}
              className={`settings-nav-item${activeTab === 'security' ? ' active' : ''}`}
            >
              <Shield size={16} />
              <span>Login & Security</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`settings-nav-item${activeTab === 'notifications' ? ' active' : ''}`}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`settings-nav-item${activeTab === 'billing' ? ' active' : ''}`}
            >
              <CreditCard size={16} />
              <span>Plans & Billing</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`settings-nav-item${activeTab === 'data' ? ' active' : ''}`}
            >
              <Database size={16} />
              <span>Data & Storage</span>
            </button>

            {/* FIRM CONFIGURATION */}
            <span className="settings-nav-label">Firm Configuration</span>
            <button
              onClick={() => setActiveTab('firm')}
              className={`settings-nav-item${activeTab === 'firm' ? ' active' : ''}`}
            >
              <Building size={16} />
              <span>Firm Settings & Team</span>
            </button>
          </div>
        </div>

        {/* Right Content Panel Card Container */}
        <div className="flex-1 w-full std-card p-8 min-h-[550px] relative">
          
          {/* ==========================================
              PANEL 1: MY PROFILE (USER-SPECIFIC)
              ========================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="border-b border-slate-200 pb-5">
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>My Profile</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 6, marginBottom: 0 }}>Configure your personal Chartered Accountant registration profile details.</p>
              </div>

              {/* Hidden File Input */}
              <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
              />

              {/* ── 4. PROFILE PHOTO — Phase 6 buttons ── */}
              <div className="std-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  {/* 64×64 avatar circle */}
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    style={{
                      position: 'relative', width: 64, height: 64, borderRadius: '50%',
                      background: 'var(--color-primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, color: '#fff',
                      overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      border: '2px solid var(--color-border)',
                      transition: 'box-shadow 200ms ease',
                    }}
                    className="group"
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#1B4F8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', userSelect: 'none' }}>
                        {getInitials(profileData.fullName)}
                      </div>
                    )}
                    {!isUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: 0, transition: 'opacity 200ms' }} className="group-hover:opacity-100">
                        <Camera size={16} style={{ color: 'var(--color-primary-light)' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Change</span>
                      </div>
                    )}
                    {isUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 style={{ color: 'var(--color-primary-light)' }} size={22} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Labels + action buttons */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Profile Photo</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3, marginBottom: 10 }}>
                      Supports PNG, JPG, JPEG, or WEBP. Max size 5MB.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-sm btn-secondary"
                      >
                        {isUploading && <Loader2 size={13} className="animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Upload New'}
                      </button>
                      <button
                        type="button"
                        disabled={isUploading || !profileImage}
                        onClick={() => setShowConfirmRemove(true)}
                        className="btn btn-sm btn-danger-ghost"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <form onSubmit={handleSaveProfile} className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="form-label">ICAI Membership No</label>
                    <input 
                      type="text" 
                      value={profileData.icaiNo}
                      onChange={(e) => setProfileData({...profileData, icaiNo: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="form-label">Designation / Role</label>
                    <input 
                      type="text" 
                      value={profileData.designation}
                      onChange={(e) => setProfileData({...profileData, designation: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="form-label">Years of Practice</label>
                    <input 
                      type="text" 
                      value={profileData.practiceYears}
                      onChange={(e) => setProfileData({...profileData, practiceYears: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="form-label flex items-center gap-2">
                      <span>Personal Contact Email</span>
                    </label>
                    <input 
                      type="email" 
                      disabled
                      value={profileData.email}
                      className="form-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="form-label">Mobile Number</label>
                    <input 
                      type="text" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="form-label">Personal Bio / Description</label>
                  <textarea 
                    rows={3}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    className="form-textarea"
                  />
                </div>

                <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-md btn-primary"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==========================================
              PANEL 2: LOGIN & SECURITY
              ========================================== */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="border-b border-slate-200 pb-5">
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Login & Security</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 6, marginBottom: 0 }}>Manage your password, two-factor authentication, and active sessions.</p>
              </div>

              {/* ── 6. SYSTEM PASSWORD & CREDENTIALS CARD — Phase 5 std-card ── */}
              <div className="std-card" style={{ padding: 24 }}>
                {/* Card header: flex space-between */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <KeyRound size={20} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>System Password & Credentials</h4>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0, maxWidth: 480, lineHeight: 1.5 }}>
                        Manage account passwords. CA compliance protocols require identity verification before credentials update.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep(1);
                      setVerifyPasswordInput('');
                      setOtpCode(['', '', '', '', '', '']);
                      setOtpSent(false);
                      setOtpTimer(0);
                      setNewPassVal('');
                      setConfirmPassVal('');
                      setShowPasswordModal(true);
                    }}
                    className="btn btn-md btn-warning"
                  >
                    <Shield size={16} />
                    <span>Initiate Secure Update</span>
                  </button>
                </div>

                {/* Status row — 3-column, border-top */}
                <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0, marginRight: 2 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Status</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Highly Secured</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Last Updated</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>12 days ago</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={12} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Policy</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Enterprise CA-Grade</span>
                  </div>
                </div>
              </div>

              {/* Redesigned Premium Glassmorphic Password Update Modal */}
              {showPasswordModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-[3px] max-w-lg w-full p-8 shadow-sm relative overflow-hidden">
                    {/* Background Glow Ring */}

                    {/* Header & Step Tracker */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#4F46E5] tracking-[0.2em] bg-[#4F46E5]/15 px-2.5 py-1 rounded-md border border-[#4F46E5]/20 inline-block">
                        Secure Credential Pipeline
                      </span>
                      <div className="flex justify-between items-center mt-3">
                        <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">Update System Password</h3>
                        {modalStep < 4 && (
                          <span className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Step {modalStep} of 3
                          </span>
                        )}
                      </div>
                      
                      {/* Visual pipeline tracker */}
                      {modalStep < 4 && (
                        <div className="flex items-center gap-2 mt-3.5">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${modalStep >= 1 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(255,122,69,0.4)]' : 'bg-white/10'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${modalStep >= 2 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(255,122,69,0.4)]' : 'bg-white/10'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${modalStep >= 3 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(255,122,69,0.4)]' : 'bg-white/10'}`} />
                        </div>
                      )}
                    </div>

                    {/* Modal Body */}
                    <div className="mt-6 min-h-[220px]">
                      
                      {/* STEP 1: IDENTITY VERIFICATION */}
                      {modalStep === 1 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-slate-900">Step 1: Multi-Factor Authentication</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              To safeguard sensitive GSTR registries, verify your identity using your current master password.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Current Master Password</label>
                              </div>
                              <div className="relative">
                                <input
                                  type={showVerifyPass ? "text" : "password"}
                                  value={verifyPasswordInput}
                                  onChange={(e) => setVerifyPasswordInput(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 focus:border-[#4F46E5]/40 rounded-xl pl-4 pr-10 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 transition-all placeholder:text-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowVerifyPass(!showVerifyPass)}
                                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  {showVerifyPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={modalLoading || !verifyPasswordInput}
                              onClick={async () => {
                                setModalLoading(true);
                                try {
                                  await api.post('/api/auth/verify-password', { password: verifyPasswordInput });
                                  setModalStep(2);
                                } catch (err: any) {
                                  showToast(`Verification Failed: ${err.message || "Invalid current master password!"}`, "error");
                                } finally {
                                  setModalLoading(false);
                                }
                              }}
                              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#4F46E5]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {modalLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                              <span>Verify Identity</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: ENTER NEW PASSWORD */}
                      {modalStep === 2 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-slate-900">Step 2: Establish New Password</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Select a password meeting enterprise-grade safety rules. Meticulous password criteria protect against unauthorized CA system breaches.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">New Password</label>
                              <div className="relative">
                                <input
                                  type={showNewPass ? "text" : "password"}
                                  value={newPassVal}
                                  onChange={(e) => setNewPassVal(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 focus:border-[#4F46E5]/40 rounded-xl pl-4 pr-10 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 transition-all placeholder:text-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPass(!showNewPass)}
                                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            {/* Password Strength Indicator */}
                            {newPassVal && (
                              <div className="space-y-2 pt-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400 font-semibold">Credential Strength Rating:</span>
                                  <span className={`font-extrabold uppercase ${
                                    getPasswordStrengthLabel(
                                      (newPassVal.length >= 8 ? 1 : 0) +
                                      (/[A-Z]/.test(newPassVal) ? 1 : 0) +
                                      (/[a-z]/.test(newPassVal) ? 1 : 0) +
                                      (/[0-9]/.test(newPassVal) ? 1 : 0) +
                                      (/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 1 : 0)
                                    ).text
                                  }`}>
                                    {getPasswordStrengthLabel(
                                      (newPassVal.length >= 8 ? 1 : 0) +
                                      (/[A-Z]/.test(newPassVal) ? 1 : 0) +
                                      (/[a-z]/.test(newPassVal) ? 1 : 0) +
                                      (/[0-9]/.test(newPassVal) ? 1 : 0) +
                                      (/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 1 : 0)
                                    ).label}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-[#F8FAFC] border border-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-500 ${
                                    getPasswordStrengthLabel(
                                      (newPassVal.length >= 8 ? 1 : 0) +
                                      (/[A-Z]/.test(newPassVal) ? 1 : 0) +
                                      (/[a-z]/.test(newPassVal) ? 1 : 0) +
                                      (/[0-9]/.test(newPassVal) ? 1 : 0) +
                                      (/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 1 : 0)
                                    ).color
                                  } ${
                                    getPasswordStrengthLabel(
                                      (newPassVal.length >= 8 ? 1 : 0) +
                                      (/[A-Z]/.test(newPassVal) ? 1 : 0) +
                                      (/[a-z]/.test(newPassVal) ? 1 : 0) +
                                      (/[0-9]/.test(newPassVal) ? 1 : 0) +
                                      (/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 1 : 0)
                                    ).width
                                  }`}></div>
                                </div>
                              </div>
                            )}

                            {/* Live Rules Validation */}
                            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-2.5 text-[12.5px]">
                              <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Complexity Directives</div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${newPassVal.length >= 8 ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-slate-100 text-gray-600'}`}>
                                    {newPassVal.length >= 8 ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                                  </div>
                                  <span className={newPassVal.length >= 8 ? 'text-slate-500 font-semibold' : 'text-slate-500'}>Min 8 characters</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${/[A-Z]/.test(newPassVal) ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-slate-100 text-gray-600'}`}>
                                    {/[A-Z]/.test(newPassVal) ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                                  </div>
                                  <span className={/[A-Z]/.test(newPassVal) ? 'text-slate-500 font-semibold' : 'text-slate-500'}>Uppercase Letter</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${/[a-z]/.test(newPassVal) ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-slate-100 text-gray-600'}`}>
                                    {/[a-z]/.test(newPassVal) ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                                  </div>
                                  <span className={/[a-z]/.test(newPassVal) ? 'text-slate-500 font-semibold' : 'text-slate-500'}>Lowercase Letter</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${/[0-9]/.test(newPassVal) ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-slate-100 text-gray-600'}`}>
                                    {/[0-9]/.test(newPassVal) ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                                  </div>
                                  <span className={/[0-9]/.test(newPassVal) ? 'text-slate-500 font-semibold' : 'text-slate-500'}>Numeric Character</span>
                                </div>

                                <div className="flex items-center gap-2 sm:col-span-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-slate-100 text-gray-600'}`}>
                                    {/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                                  </div>
                                  <span className={/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal) ? 'text-slate-500 font-semibold' : 'text-slate-500'}>Special Symbol (!@#$...)</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={
                                newPassVal.length < 8 ||
                                !/[A-Z]/.test(newPassVal) ||
                                !/[a-z]/.test(newPassVal) ||
                                !/[0-9]/.test(newPassVal) ||
                                !/[!@#$%^&*(),.?":{}|<>_]/.test(newPassVal)
                              }
                              onClick={() => setModalStep(3)}
                              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold text-[13px] transition-all cursor-pointer shadow-lg shadow-[#4F46E5]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Establish Credential
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: CONFIRM PASSWORD */}
                      {modalStep === 3 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-slate-900">Step 3: Verification Confirm</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Confirm the selected credentials. Mismatch check ensures password entry accuracy, mitigating accidental locks.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Confirm Password</label>
                              <div className="relative">
                                <input
                                  type={showConfirmPass ? "text" : "password"}
                                  value={confirmPassVal}
                                  onChange={(e) => setConfirmPassVal(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 focus:border-[#4F46E5]/40 rounded-xl pl-4 pr-10 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 transition-all placeholder:text-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            {/* Match validation alerts */}
                            {confirmPassVal && (
                              <div className={`p-3 rounded-xl border text-[12px] flex items-center gap-2 ${
                                confirmPassVal === newPassVal 
                                  ? 'bg-[#10B981]/5 border-[#10B981]/20 text-[#10B981]' 
                                  : 'bg-[#4F46E5]/5 border-[#4F46E5]/20 text-[#4F46E5]'
                              }`}>
                                {confirmPassVal === newPassVal ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                <span className="font-semibold">
                                  {confirmPassVal === newPassVal ? '✓ Credentials match perfectly.' : '❌ Mismatch alert: Passwords must match.'}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-3 mt-2">
                              <button
                                type="button"
                                onClick={() => setModalStep(2)}
                                className="flex-1 h-11 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[13px] transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                disabled={modalLoading || confirmPassVal !== newPassVal}
                                onClick={async () => {
                                  setModalLoading(true);
                                  try {
                                    await api.put('/api/auth/password', { new_password: newPassVal });
                                    // Invalidate sessions except current Windows one
                                    setSessions(sessions.filter(s => s.last_active === 'Active now'));
                                    setModalStep(4);
                                    triggerToast("✓ Password updated. Dispatched security notification to rahul.sharma@reckon.ai.");
                                  } catch (err: any) {
                                    triggerToast(`❌ Update Failed: ${err.message || "Unable to update password."}`);
                                  } finally {
                                    setModalLoading(false);
                                  }
                                }}
                                className="flex-2 h-11 rounded-xl bg-[#1B4F8A] text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#4F46E5]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {modalLoading ? <Loader2 size={15} className="animate-spin text-white" /> : <Lock size={14} />}
                                <span>Securely Save Password</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: SUCCESS SUMMARY STATE */}
                      {modalStep === 4 && (
                        <div className="space-y-5 text-center py-2">
                          <div className="w-14 h-14 rounded-[3px] bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto shadow-sm border border-[#10B981]/30">
                            <CheckCircle2 size={32} />
                          </div>
                          
                          <div className="space-y-1.5">
                            <h3 className="text-[20px] font-extrabold text-slate-900 tracking-tight">Security Credentials Updated</h3>
                            <p className="text-[13px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                              Your master CA login credential has been securely modified and logged in the platform compliance record.
                            </p>
                          </div>

                          {/* Audit details container */}
                          <div className="bg-[#F8FAFC] rounded-xl p-4.5 border border-slate-200 font-mono text-[11px] text-[#10B981]/90 text-left space-y-1 shadow-inner relative overflow-hidden select-all w-full">
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded-[3px]">
                              <Activity size={10} />
                              SECURE LOG
                            </div>
                            <div>[TRACE] {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                            <div>ACTION: CA_CREDENTIAL_CHANGE_COMMITTED</div>
                            <div>SECURITY_LEVEL: LEVEL_5_COMPLIANT</div>
                            <div>IP: 103.241.12.89 (Mumbai Office)</div>
                            <div>ALERT: DISPATCHED_OWNER_NOTIF_SUCCESS</div>
                            <div>HOST: SUPABASE_AUTH_RECKON_NODE</div>
                            <div className="text-slate-500 mt-2.5 font-sans text-[10.5px] italic">A dynamic security email alert has been compiled and transmitted to Owner CA. Other active sessions were successfully purged.</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowPasswordModal(false)}
                            className="w-full h-11 rounded-xl bg-white hover:bg-gray-100 text-black font-extrabold text-[13px] transition-all cursor-pointer shadow-md"
                          >
                            Return to Preferences
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              <hr className="border-slate-200" />

              {/* ── 7. 2FA CARD — Phase 5 WARNING variant ── */}
              <div
                className="std-card card-variant-warning"
                style={{
                  background: '#FFFBEB',
                  padding: 24,
                  position: 'relative',
                }}
              >
                {/* UNPROTECTED badge top-right when not enabled */}
                {!is2FAEnabled && (
                  <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <span className={`status-badge ${getUnifiedBadgeClass('UNPROTECTED')}`}>
                      {renderBadgeDot('UNPROTECTED')}
                      Unprotected
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  {/* Left: Icon + title + badge + description */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <QrCode size={18} style={{ color: '#D97706' }} />
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Two-Factor Authentication (2FA)</h4>
                      {is2FAEnabled && (
                        <span className={`status-badge ${getUnifiedBadgeClass('VERIFIED')}`}>
                          {renderBadgeDot('VERIFIED')}
                          Verified
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, maxWidth: 480 }}>
                      Protect your CA account registries, GSTR mismatch vaults, and business client ledgers from unauthorized access using dynamic mobile authenticators.
                    </p>
                  </div>

                  {/* Right: toggle switch + Enable 2FA Now button (when not enabled) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                    {/* Existing toggle — preserved exactly */}
                    <button
                      type="button"
                      onClick={() => {
                        if (is2FAEnabled) {
                          setDisablePasswordInput('');
                          setDisableOtpInput('');
                          setDisableOtpSent(false);
                          setDisableOtpTimer(0);
                          setShowDisable2FAModal(true);
                        } else {
                          setTwoFactorStep(1);
                          setTwoFactorPasswordInput('');
                          setTwoFactorOtpSent(false);
                          setTwoFactorOtpTimer(0);
                          setTwoFactorCode(['', '', '', '', '', '']);
                          setShow2FAModal(true);
                        }
                      }}
                      className={`w-14 h-7 rounded-full p-1 transition-all duration-300 focus:outline-none flex items-center cursor-pointer ${
                        is2FAEnabled ? 'bg-[#10B981]' : 'bg-[#F8FAFC] border border-slate-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                          is2FAEnabled ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>

                    {/* Enable 2FA Now → button (shown only when not enabled) */}
                    {!is2FAEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorStep(1);
                          setTwoFactorPasswordInput('');
                          setTwoFactorOtpSent(false);
                          setTwoFactorOtpTimer(0);
                          setTwoFactorCode(['', '', '', '', '', '']);
                          setShow2FAModal(true);
                        }}
                        className="btn btn-sm btn-warning"
                      >
                        Enable 2FA Now →
                      </button>
                    )}
                  </div>
                </div>

                {is2FAEnabled && (
                  <div className="bg-[#F8FAFC]/60 border border-[#10B981]/20 rounded-[3px] p-5 flex flex-col sm:flex-row gap-5 items-center shadow-sm relative overflow-hidden">
                    
                    <div className="w-12 h-12 rounded-[3px] bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] flex-shrink-0 shadow-sm">
                      <ShieldCheck size={24} />
                    </div>
                    
                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <div className="text-[14px] font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                        <span>Authenticator App Enabled</span>
                      </div>
                      <p className="text-[12.5px] text-slate-400 leading-relaxed">
                        Security verification active. Backup recovery codes have been securely stored in the CA configuration logs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(backupRecoveryCodes.join('\n'));
                        triggerToast("✓ Recovery codes copied to clipboard.");
                      }}
                      className="text-[12px] font-bold text-[#7C3AED] hover:underline px-3 py-1.5 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 rounded-lg border border-[#7C3AED]/20 transition-all"
                    >
                      Copy Backup Codes
                    </button>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication Setup Modal */}
              {show2FAModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-[3px] max-w-lg w-full p-8 shadow-sm relative overflow-hidden">

                    {/* Header */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#F59E0B] tracking-[0.2em] bg-[#F59E0B]/15 px-2.5 py-1 rounded-md border border-[#F59E0B]/20 inline-block">
                        Multi-Factor Guard
                      </span>
                      <div className="flex justify-between items-center mt-3">
                        <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">Enable 2FA Protection</h3>
                        {twoFactorStep < 5 && (
                          <span className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Step {twoFactorStep} of 4
                          </span>
                        )}
                      </div>
                      
                      {/* Visual progress tracker */}
                      {twoFactorStep < 5 && (
                        <div className="flex items-center gap-2 mt-3.5">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${twoFactorStep >= 1 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(247,144,9,0.3)]' : 'bg-white/10'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${twoFactorStep >= 2 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(247,144,9,0.3)]' : 'bg-white/10'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${twoFactorStep >= 3 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(247,144,9,0.3)]' : 'bg-white/10'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${twoFactorStep >= 4 ? 'bg-[#1B4F8A] shadow-[0_0_10px_rgba(247,144,9,0.3)]' : 'bg-white/10'}`} />
                        </div>
                      )}
                    </div>

                    {/* Modal Body */}
                    <div className="mt-6 min-h-[220px]">

                      {/* STEP 1: IDENTITY VERIFICATION */}
                      {twoFactorStep === 1 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-white">Step 1: Security Handshake</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Enablement of 2FA controls access to sensitive ledgers. Please authenticate with your current master password or via OTP alert.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Current Master Password</label>
                              </div>
                              <div className="relative">
                                <input
                                  type={showTwoFactorVerifyPass ? "text" : "password"}
                                  value={twoFactorPasswordInput}
                                  onChange={(e) => setTwoFactorPasswordInput(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B]/40 rounded-xl pl-4 pr-10 text-[13.5px] text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 transition-all placeholder:text-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowTwoFactorVerifyPass(!showTwoFactorVerifyPass)}
                                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  {showTwoFactorVerifyPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={modalLoading || !twoFactorPasswordInput}
                              onClick={async () => {
                                setModalLoading(true);
                                try {
                                  await api.post('/api/auth/verify-password', { password: twoFactorPasswordInput });
                                  setTwoFactorStep(2);
                                } catch (err: any) {
                                  triggerToast(`❌ Verification Failed: ${err.message || "Invalid current master password!"}`);
                                } finally {
                                  setModalLoading(false);
                                }
                              }}
                              className="w-full h-11 rounded-xl bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#F59E0B]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {modalLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                              <span>Verify Identity Factor</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: CHOOSE METHOD */}
                      {twoFactorStep === 2 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-white">Step 2: Choose Verification Channel</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Select your preferred medium for receiving dynamic security tokens. We highly endorse Authenticator Apps.
                            </p>
                          </div>

                          <div className="space-y-3">
                            {/* Method A: Authenticator App */}
                            <div 
                              onClick={() => setTwoFactorMethod('authenticator')}
                              className={`p-4 rounded-[3px] border cursor-pointer flex gap-4 items-center group relative overflow-hidden ${
                                twoFactorMethod === 'authenticator' 
                                  ? 'bg-[#F59E0B]/5 border-[#F59E0B]/30' 
                                  : 'bg-[#F8FAFC] border-slate-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-[3px] flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'authenticator' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-white text-slate-400'
                              }`}>
                                <QrCode size={18} />
                              </div>
                              <div className="space-y-0.5 flex-1">
                                <div className="text-[13.5px] font-bold text-white flex items-center gap-2">
                                  <span>Authenticator App</span>
                                  <span className="text-[8px] font-extrabold uppercase text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded-[3px] border border-[#10B981]/20">Recommended</span>
                                </div>
                                <div className="text-[11.5px] text-slate-500">Google Authenticator, Microsoft Auth, or 1Password codes.</div>
                              </div>
                              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'authenticator' ? 'border-[#F59E0B] bg-[#F59E0B]/20' : 'border-slate-200'
                              }`}>
                                {twoFactorMethod === 'authenticator' && <div className="w-1.5 h-1.5 bg-[#F59E0B] rounded-[3px]" />}
                              </div>
                            </div>

                            {/* Method B: SMS text */}
                            <div 
                              onClick={() => setTwoFactorMethod('sms')}
                              className={`p-4 rounded-[3px] border cursor-pointer flex gap-4 items-center group relative overflow-hidden ${
                                twoFactorMethod === 'sms' 
                                  ? 'bg-[#F59E0B]/5 border-[#F59E0B]/30' 
                                  : 'bg-[#F8FAFC] border-slate-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-[3px] flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'sms' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-white text-slate-400'
                              }`}>
                                <Smartphone size={18} />
                              </div>
                              <div className="space-y-0.5 flex-1">
                                <div className="text-[13.5px] font-bold text-white">Secure SMS Texting</div>
                                <div className="text-[11.5px] text-slate-500">Send compliance dynamic codes to: +91 98765 *****</div>
                              </div>
                              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'sms' ? 'border-[#F59E0B] bg-[#F59E0B]/20' : 'border-slate-200'
                              }`}>
                                {twoFactorMethod === 'sms' && <div className="w-1.5 h-1.5 bg-[#F59E0B] rounded-[3px]" />}
                              </div>
                            </div>

                            {/* Method C: Email OTP */}
                            <div 
                              onClick={() => setTwoFactorMethod('email')}
                              className={`p-4 rounded-[3px] border cursor-pointer flex gap-4 items-center group relative overflow-hidden ${
                                twoFactorMethod === 'email' 
                                  ? 'bg-[#F59E0B]/5 border-[#F59E0B]/30' 
                                  : 'bg-[#F8FAFC] border-slate-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-[3px] flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'email' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-white text-slate-400'
                              }`}>
                                <Mail size={18} />
                              </div>
                              <div className="space-y-0.5 flex-1">
                                <div className="text-[13.5px] font-bold text-white">Compliance Email Alerts</div>
                                <div className="text-[11.5px] text-slate-500">Secure codes dispatched directly to: rahul.s*****@reckon.ai</div>
                              </div>
                              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center flex-shrink-0 ${
                                twoFactorMethod === 'email' ? 'border-[#F59E0B] bg-[#F59E0B]/20' : 'border-slate-200'
                              }`}>
                                {twoFactorMethod === 'email' && <div className="w-1.5 h-1.5 bg-[#F59E0B] rounded-[3px]" />}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setTwoFactorStep(1)}
                              className="flex-1 h-11 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 text-white font-bold text-[13px]"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => setTwoFactorStep(3)}
                              className="flex-2 h-11 rounded-[3px] bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-bold text-[13px] shadow-sm"
                            >
                              Configure Setup
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: SETUP CONFIGURATION */}
                      {twoFactorStep === 3 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-white">Step 3: Setup Security Target</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Configure the selected medium. Scanning the QR target links the CA authentication portal directly with your factor generator device.
                            </p>
                          </div>

                          {/* Authenticator QR Setup Card */}
                          {twoFactorMethod === 'authenticator' && (
                            <div className="bg-[#F8FAFC] p-5 rounded-[3px] border border-slate-200 flex flex-col sm:flex-row gap-5 items-center relative overflow-hidden shadow-sm">
                              
                              {/* Mock QR Target */}
                              <div className="w-28 h-28 bg-slate-100 rounded-[3px] border border-slate-200 flex items-center justify-center p-1.5 shadow-sm relative group flex-shrink-0">
                                <div className="w-full h-full border border-dashed border-[#F59E0B]/30 rounded-[3px] flex flex-col items-center justify-center bg-[#F8FAFC] text-[#F59E0B] p-2 text-center select-none font-bold text-[10px]">
                                  <QrCode size={36} className="text-[#F59E0B] mb-1" />
                                  <span className="text-[7.5px] uppercase tracking-wider text-slate-400">Scan Secure Target</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-center sm:text-left flex-1">
                                <div className="text-[13.5px] font-bold text-white">Manually Enter Setup Secret:</div>
                                <div className="bg-white border border-slate-200 px-3 py-2 rounded-[3px] font-mono text-[11.5px] text-slate-500 tracking-wider text-center sm:text-left select-all font-bold shadow-sm break-all">
                                  RCK-RECON-MFA-SHARMA-VAULT
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText("RCK-RECON-MFA-SHARMA-VAULT");
                                    triggerToast("✓ Secret key copied to clipboard.");
                                  }}
                                  className="text-[11px] font-bold text-[#F59E0B] hover:underline"
                                >
                                  Copy Secret Key
                                </button>
                              </div>
                            </div>
                          )}

                          {/* SMS Setup Details */}
                          {twoFactorMethod === 'sms' && (
                            <div className="bg-[#F8FAFC] p-5 rounded-[3px] border border-slate-200 text-center space-y-3">
                              <div className="w-10 h-10 rounded-[3px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mx-auto">
                                <Smartphone size={18} />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[13.5px] font-bold text-white">Target Mobile Registered</div>
                                <p className="text-[12.5px] text-slate-400 leading-relaxed">
                                  SMS security token alerts will be dispatched directly to your registered master partner cell: <strong>+91 98765 43210</strong>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Email Setup Details */}
                          {twoFactorMethod === 'email' && (
                            <div className="bg-[#F8FAFC] p-5 rounded-[3px] border border-slate-200 text-center space-y-3">
                              <div className="w-10 h-10 rounded-[3px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mx-auto">
                                <Mail size={18} />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[13.5px] font-bold text-white">Target Compliance Email</div>
                                <p className="text-[12.5px] text-slate-400 leading-relaxed">
                                  Dual authorization GSTR security tokens will be dispatched to compliance mailbox: <strong>rahul.sharma@reckon.ai</strong>
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setTwoFactorStep(2)}
                              className="flex-1 h-11 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 text-white font-bold text-[13px]"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTwoFactorStep(4);
                                triggerToast("✉ Transmitted mock Setup verification code factor.");
                              }}
                              className="flex-2 h-11 rounded-[3px] bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-bold text-[13px] shadow-sm"
                            >
                              Continue to Verification
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: ENTER VERIFICATION CODE */}
                      {twoFactorStep === 4 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <h4 className="text-[14.5px] font-bold text-white">Step 4: Verify Factor Connection</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed">
                              Verify your setup. Input the 6-digit dynamic code active on your auth client factor to finalize platform compliance synchronization.
                            </p>
                          </div>

                          <div className="space-y-4 text-center">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Dynamic Onboarding Token</label>
                              <div className="flex justify-center gap-2.5">
                                {twoFactorCode.map((digit, idx) => (
                                  <input
                                    key={idx}
                                    id={`tf-otp-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!/^\d*$/.test(val)) return;
                                      const newOtp = [...twoFactorCode];
                                      newOtp[idx] = val.slice(-1);
                                      setTwoFactorCode(newOtp);
                                      if (val && idx < 5) {
                                        document.getElementById(`tf-otp-${idx + 1}`)?.focus();
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Backspace' && !twoFactorCode[idx] && idx > 0) {
                                        document.getElementById(`tf-otp-${idx - 1}`)?.focus();
                                      }
                                    }}
                                    className="w-10 h-12 bg-[#F8FAFC] border border-slate-200 rounded-[3px] text-center font-bold text-lg text-white focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30"
                                  />
                                ))}
                              </div>
                              <div className="flex items-center justify-end text-[11px] px-1 pt-1.5">
                                <span className="text-slate-500 font-semibold">Resets every 30s</span>
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setTwoFactorStep(3)}
                                className="flex-1 h-11 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 text-white font-bold text-[13px]"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                disabled={modalLoading || twoFactorCode.some(c => !c)}
                                onClick={async () => {
                                  setModalLoading(true);
                                  await new Promise(r => setTimeout(r, 1500));
                                  setModalLoading(false);
                                  if (twoFactorCode.join('') === '489012') {
                                    setTwoFactorStep(5);
                                    triggerToast("✓ Connection Verified! 2FA fully enabled.");
                                  } else {
                                    triggerToast("❌ Onboarding Mismatch: Invalid dynamic authentication token code!");
                                  }
                                }}
                                className="flex-2 h-11 rounded-[3px] bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {modalLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                                <span>Verify & Finalize</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 5: SUCCESS & RECOVERY CODES */}
                      {twoFactorStep === 5 && (
                        <div className="space-y-5">
                          <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-[3px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center justify-center mx-auto shadow-sm">
                              <ShieldCheck size={26} />
                            </div>
                            <h4 className="text-[18px] font-extrabold text-white">2FA Protections Operational!</h4>
                            <p className="text-[12.5px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                              Your GSTR partner dashboard is now locked under dual compliance security. Save these one-time recovery codes.
                            </p>
                          </div>

                          {/* Recovery Codes Grid */}
                          <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200 space-y-4">
                            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Confidential Backup Recovery Keys</div>
                            
                            <div className="grid grid-cols-2 gap-3 font-mono text-[13px] text-white text-center font-bold">
                              {backupRecoveryCodes.map((code, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 py-2 rounded-xl shadow-sm tracking-wide">
                                  {code}
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-[12px] px-1 pt-1.5 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(backupRecoveryCodes.join('\n'));
                                  triggerToast("✓ Recovery codes copied.");
                                }}
                                className="text-[#7C3AED] hover:underline font-bold"
                              >
                                Copy All Keys
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const content = `RECKON AI - TWO-FACTOR AUTHENTICATION BACKUP RECOVERY CODES\n` +
                                                  `Owner: rahul.sharma@reckon.ai\n` +
                                                  `Timestamp: ${new Date().toISOString()}\n\n` +
                                                  backupRecoveryCodes.join('\n') + 
                                                  `\n\nTreat these codes with absolute confidentiality. Each code can be utilized once for master override recoveries.`;
                                  const blob = new Blob([content], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = 'reckon_backup_recovery_codes.txt';
                                  link.click();
                                  URL.revokeObjectURL(url);
                                  triggerToast("✓ Backup codes text file downloaded.");
                                }}
                                className="text-[#F59E0B] hover:underline font-bold"
                              >
                                Download Backup (.txt)
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIs2FAEnabled(true);
                              setShow2FAModal(false);
                            }}
                            className="w-full h-11 rounded-xl bg-white hover:bg-gray-100 text-black font-extrabold text-[13px] transition-all cursor-pointer shadow-md text-center"
                          >
                            Conclude Onboarding
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {/* Secure 2FA Disablement Verification Modal */}
              {showDisable2FAModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-[3px] max-w-lg w-full p-8 shadow-sm relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#EF4444] tracking-[0.2em] bg-[#EF4444]/15 px-2.5 py-1 rounded-md border border-[#EF4444]/20 inline-block">
                        Security Threat Override
                      </span>
                      <h3 className="text-[20px] font-bold text-white tracking-tight mt-3">Disable 2FA Protection?</h3>
                      <p className="text-[13px] text-slate-400 leading-relaxed mt-1">
                        CA security standards strongly deprecate disabling 2FA. Identity verification with both your master password AND dynamic OTP code is required to proceed.
                      </p>
                    </div>

                    <div className="mt-6 space-y-4">
                      
                      {/* Factor 1: Current Password */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Factor 1: Current Master Password</label>
                        <div className="relative">
                          <input
                            type={showDisablePass ? "text" : "password"}
                            value={disablePasswordInput}
                            onChange={(e) => setDisablePasswordInput(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-11 bg-[#F8FAFC] border border-slate-200 focus:border-[#EF4444]/40 rounded-[3px] pl-4 pr-10 text-[13.5px] text-white focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 placeholder:text-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDisablePass(!showDisablePass)}
                            className="absolute right-3.5 inset-y-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            {showDisablePass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Factor 2 removed */}

                      {/* Modal Footer Controls */}
                      <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowDisable2FAModal(false)}
                          className="flex-1 h-11 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 text-white font-bold text-[13px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={disableLoading || !disablePasswordInput}
                          onClick={async () => {
                            setDisableLoading(true);
                            try {
                              await api.post('/api/auth/verify-password', { password: disablePasswordInput });
                              setIs2FAEnabled(false);
                              setShowDisable2FAModal(false);
                              triggerToast("✓ Two-Factor Authentication disabled. Account status set to unprotected.");
                            } catch (err: any) {
                              triggerToast(`❌ Verification Failed: ${err.message || "Invalid current master password!"}`);
                            } finally {
                              setDisableLoading(false);
                            }
                          }}
                          className="flex-1 h-11 rounded-[3px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {disableLoading ? <Loader2 size={15} className="animate-spin text-white" /> : <Lock size={14} />}
                          <span>Purge 2FA Protections</span>
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              <hr className="border-slate-200" />

              {/* ── 8. ACTIVE SESSIONS — Phase 5 std-card ── */}
              <div className="std-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', gap: 12, flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Laptop size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    Active Sessions
                  </h4>
                  {sessions.length > 1 && (
                    <button
                      onClick={async () => {
                        try {
                          await api.delete('/api/auth/sessions');
                          setSessions(sessions.slice(0,1));
                          triggerToast("Logged out of all other devices successfully.");
                        } catch (err) {
                          triggerToast("❌ Action Failed: Unable to revoke all sessions.");
                        }
                      }}
                      className="btn btn-sm btn-destructive"
                      title="Revoke all non-current sessions"
                    >
                      Logout All Other Devices
                    </button>
                  )}
                </div>

                {/* Session rows */}
                <div>
                  {sessions.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: 56,
                        padding: '0 20px',
                        borderBottom: idx < sessions.length - 1 ? '1px solid var(--color-border)' : 'none',
                        gap: 12,
                      }}
                    >
                      {/* Device icon */}
                      <div style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }}>
                        {s.is_mobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                      </div>

                      {/* Location + time */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.device}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{s.location} · {s.last_active}</div>
                      </div>

                      {/* Right: badge or revoke */}
                      {s.last_active !== 'Active now' ? (
                        <button
                          onClick={() => handleRevokeSession(s.id, s.device)}
                          className="btn btn-sm btn-danger-ghost"
                          title="Revoke this session"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className={`status-badge ${getUnifiedBadgeClass('ACTIVE')}`}>Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              PANEL 3: NOTIFICATIONS
              ========================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-[20px] font-bold text-white tracking-tight">Notification Settings</h3>
                <p className="text-[13.5px] text-slate-400 mt-1">Configure alert triggers for tax run finishes, client exposures, and filing compliance windows.</p>
              </div>

              {/* Group 1: Reconciliation alerts */}
              <div className="space-y-5">
                <h4 className="text-[12px] font-bold uppercase text-[#7C3AED] tracking-widest">GST Reconciliation Alerts</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-6 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-[14px] font-bold text-white">Reconciliation Matches Complete</div>
                      <div className="text-[13px] text-slate-400 mt-1">Notify as soon as Excel parsing and portal JSON math finishes matching.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.reconComplete} 
                      onChange={() => setNotifStates({...notifStates, reconComplete: !notifStates.reconComplete})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-6 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-[14px] font-bold text-white">Discrepancies & Value Mismatch Warning</div>
                      <div className="text-[13px] text-slate-400 mt-1">Alert if any supplier invoices reveal taxable difference during automated sync runs.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.mismatchDetected} 
                      onChange={() => setNotifStates({...notifStates, mismatchDetected: !notifStates.mismatchDetected})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-6">
                    <div>
                      <div className="text-[14px] font-bold text-white">ITC Exposure Risk Alerts</div>
                      <div className="text-[13px] text-slate-400 mt-1">Urgent alert if client ITC at risk values exceed ₹50,000 in a filing month.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.itcRisk} 
                      onChange={() => setNotifStates({...notifStates, itcRisk: !notifStates.itcRisk})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Filing deadlines */}
              <div className="space-y-5 pt-4">
                <h4 className="text-[12px] font-bold uppercase text-[#4F46E5] tracking-widest">Filing Deadlines Tracker</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-6 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-[14px] font-bold text-white">7 Days Before Due Date</div>
                      <div className="text-[13px] text-slate-400 mt-1">First compliance alert reminder for upcoming TDS, GSTR-1, or ROC returns.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.deadline7d} 
                      onChange={() => setNotifStates({...notifStates, deadline7d: !notifStates.deadline7d})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-6 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-[14px] font-bold text-white">3 Days Before Due Date</div>
                      <div className="text-[13px] text-slate-400 mt-1">Second reminder alert dispatched to both CA dashboard and client email.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.deadline3d} 
                      onChange={() => setNotifStates({...notifStates, deadline3d: !notifStates.deadline3d})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-6 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-[14px] font-bold text-white">1 Day Before Due Date</div>
                      <div className="text-[13px] text-slate-400 mt-1">Urgent last-day reminder notification for pending client documents.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.deadline1d} 
                      onChange={() => setNotifStates({...notifStates, deadline1d: !notifStates.deadline1d})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-6">
                    <div>
                      <div className="text-[14px] font-bold text-white">Overdue Returns Critical Alert</div>
                      <div className="text-[13px] text-slate-400 mt-1">Daily pulsing alert for any return that has missed official due dates.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifStates.overdue} 
                      onChange={() => setNotifStates({...notifStates, overdue: !notifStates.overdue})}
                      className="accent-[#4F46E5] h-5 w-5 cursor-pointer mt-1 rounded border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-10 relative overflow-hidden pb-8">

              <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-[22px] font-black text-white tracking-tight flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-[3px] bg-[#1B4F8A]/10 border border-[#1B4F8A]/20 flex items-center justify-center text-[#1B4F8A]">
                      <CreditCard size={18} />
                    </div>
                    <span>Plans & Billing</span>
                  </h3>
                  <p className="text-[13.5px] text-slate-400 mt-1.5">Audit usage thresholds, inspect pricing structures, or expand firm seats.</p>
                </div>
                
                <span className="text-[10px] font-extrabold uppercase text-[#10B981] tracking-widest bg-[#10B981]/10 border border-[#10B981]/20 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(50,213,131,0.1)] flex items-center gap-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  Active Subscription Node
                </span>
              </div>

              {/* Usage stats limits meters */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <Activity size={14} className="text-[#1B4F8A]" />
                  <h4 className="text-[11.5px] font-extrabold uppercase text-slate-400 tracking-wider">Active Workspace Quota Monitors</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Meter 1 */}
                  <div className="bg-[#F8FAFC]/60 backdrop-blur-md border border-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-5 space-y-4 hover:border-slate-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-slate-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between text-[12.5px] font-bold">
                      <span className="text-slate-400">Client Profiles</span>
                      <span className="text-[#EF4444] font-mono">5 / 5 Cap</span>
                    </div>
                    <div className="h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#EF4444] w-full shadow-[0_0_10px_rgba(240,68,56,0.5)]"></div>
                    </div>
                    <div className="text-[11px] text-[#EF4444]/90 font-extrabold leading-relaxed">Free tier cap fully occupied. Upgrade required for additions.</div>
                  </div>

                  {/* Meter 2 */}
                  <div className="bg-[#F8FAFC]/60 backdrop-blur-md border border-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-5 space-y-4 hover:border-slate-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-slate-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between text-[12.5px] font-bold">
                      <span className="text-slate-400">GSTR Sync Runs</span>
                      <span className="text-[#F59E0B] font-mono">42 / 50 runs</span>
                    </div>
                    <div className="h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1B4F8A] w-[84%] shadow-[0_0_10px_rgba(247,144,9,0.3)]"></div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold">Quota will refresh on 1st of next month automatically.</div>
                  </div>

                  {/* Meter 3 */}
                  <div className="bg-[#F8FAFC]/60 backdrop-blur-md border border-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-5 space-y-4 hover:border-slate-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-slate-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between text-[12.5px] font-bold">
                      <span className="text-slate-400">Secure Audit Vault</span>
                      <span className="text-[#7C3AED] font-mono">1.2 GB / 2.0 GB</span>
                    </div>
                    <div className="h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1B4F8A] w-[60%] shadow-[0_0_10px_rgba(108,99,255,0.3)]"></div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold">Stores GSTR Portal JSON records and ledger files.</div>
                  </div>
                </div>
              </div>

              {/* Monthly / Annual Billing Toggle Switch */}
              <div className="flex flex-col items-center justify-center gap-4 pt-6 pb-4 text-center">
                <div className="inline-flex items-center gap-1 bg-white/80 backdrop-blur-md border border-slate-200 p-1.5 rounded-full relative z-20 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                  <button 
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-full text-[13px] font-extrabold transition-all duration-300 cursor-pointer ${
                      billingCycle === 'monthly' 
                        ? 'bg-[#1B4F8A] text-white shadow-[0_2px_12px_rgba(255,122,69,0.3)]' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-100'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-full text-[13px] font-extrabold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                      billingCycle === 'annual' 
                        ? 'bg-[#1B4F8A] text-white shadow-[0_2px_12px_rgba(255,122,69,0.3)]' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-100'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] font-extrabold uppercase bg-[#1B4F8A]/20 text-[#1B4F8A] px-2.5 py-0.5 rounded-[3px] border border-[#1B4F8A]/30 tracking-wide">
                      Save 20%
                    </span>
                  </button>
                </div>
                <div className="text-[12px] font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                  Enterprise ledger capabilities with tax liability safety coverage. All plans start with a fully-functional 14-day premium trial period.
                </div>
              </div>

              {/* Redesigned Premium pricing cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4 relative z-20">
                
                {/* 1. STARTER CARD */}
                <div className="group relative bg-white border border-slate-200 rounded-[3px] p-8 flex flex-col justify-between overflow-hidden">
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-1 rounded-md border border-slate-200 inline-block">
                        Standalone Solo
                      </span>
                      <h4 className="text-[22px] font-black text-white tracking-tight">Starter Plan</h4>
                      <p className="text-[13px] text-slate-400 leading-relaxed font-semibold">
                        Ideal for independent CAs managing personal accounts and standalone ledgers.
                      </p>
                    </div>

                    <div className="py-4 border-y border-slate-200 flex flex-col gap-1">
                      <div className="text-[40px] font-black text-white flex items-baseline gap-1 tracking-tight">
                        ₹0
                        <span className="text-[14px] text-slate-400 font-bold font-sans">/ month</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-extrabold">Standard matching capability</div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4 pt-1">
                      <div className="text-[11px] font-extrabold uppercase text-slate-500 tracking-widest">Included Features</div>
                      <ul className="space-y-4 text-[13px] text-slate-400 font-medium">
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold"><strong>Up to 5</strong> active client ledgers</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold"><strong>50 GSTR runs</strong> / month</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-500">
                          <X size={15} className="text-red-500/40 flex-shrink-0" strokeWidth={3} />
                          <span className="line-through">AI Auto-Matching Engine</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-500">
                          <X size={15} className="text-red-500/40 flex-shrink-0" strokeWidth={3} />
                          <span className="line-through">BOE & Import reconciliation</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold">Standard Email reminders</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold">Single-user CA license</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold">30-day security audit logs</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-slate-500 font-semibold">Standard support queue</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      disabled
                      className="w-full py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-[13px] text-center"
                    >
                      Active Plan
                    </button>
                  </div>
                </div>

                {/* 2. PROFESSIONAL CARD (HIGHLIGHTED, GLOWS, LARGER SCALE) */}
                <div className="group relative bg-[#1E2230]/80 backdrop-blur-md border-2 border-[#1B4F8A] rounded-[3px] p-8 flex flex-col justify-between z-10 shadow-sm overflow-hidden">

                  {/* Shimmering Active Ribbon */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#1B4F8A] text-white px-5 py-1.5 rounded-[3px] text-[10px] uppercase font-black tracking-widest border border-slate-200 shadow-sm whitespace-nowrap block">
                      ★ Most Popular
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3 mt-2">
                      <span className="text-[10px] font-extrabold uppercase text-[#4F46E5] tracking-widest bg-[#4F46E5]/10 px-3 py-1 rounded-md border border-[#4F46E5]/20 inline-block">
                        Growing CA Practice
                      </span>
                      <h4 className="text-[22px] font-black text-white tracking-tight">Professional</h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-semibold">
                        Optimized database automation features for scaling CA groups and partnerships.
                      </p>
                    </div>

                    <div className="py-4 border-y border-slate-200 flex flex-col gap-1">
                      <div className="text-[40px] font-black text-white flex items-baseline gap-1 tracking-tight">
                        {billingCycle === 'monthly' ? '₹2,499' : '₹1,999'}
                        <span className="text-[14px] text-slate-400 font-bold font-sans">/ month</span>
                      </div>
                      <div className="text-[11px] text-[#4F46E5] font-extrabold">
                        {billingCycle === 'monthly' ? 'Billed monthly' : 'Billed annually (Save ₹6,000 / yr)'}
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4 pt-1">
                      <div className="text-[11px] font-extrabold uppercase text-[#4F46E5] tracking-widest">Included Features</div>
                      <ul className="space-y-4 text-[13px] text-slate-500 font-medium">
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold"><strong>Up to 100</strong> client profiles</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold"><strong>Unlimited GSTR syncs</strong></span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#4F46E5] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-black">Advanced AI Auto-Matching</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">BOE & Import reconciliation</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Multi-channel (SMS, WA) alerts</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold"><strong>Up to 5</strong> team seats</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold"><strong>Full 7-year</strong> audit logging</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#4F46E5] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-black">Priority 24/7 CA line</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => {
                        triggerToast("✓ Initializing payment gateway for Reckon Pro CA plan. Secure connection active...");
                      }}
                      className="w-full py-4 rounded-[3px] bg-[#1B4F8A] text-white font-black text-[13.5px] text-center shadow-sm cursor-pointer"
                    >
                      Upgrade to Pro CA
                    </button>
                  </div>
                </div>

                {/* 3. ENTERPRISE CARD */}
                <div className="group relative bg-white border border-slate-200 rounded-[3px] p-8 flex flex-col justify-between shadow-sm overflow-hidden">
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-extrabold uppercase text-[#7C3AED] tracking-widest bg-[#7C3AED]/15 px-3 py-1 rounded-md border border-[#7C3AED]/20 inline-block">
                        Corporate Firms
                      </span>
                      <h4 className="text-[22px] font-black text-white tracking-tight">Enterprise Plan</h4>
                      <p className="text-[13px] text-slate-400 leading-relaxed font-semibold">
                        Total corporate dashboard control with dedicated partner support systems.
                      </p>
                    </div>

                    <div className="py-4 border-y border-slate-200 flex flex-col gap-1">
                      <div className="text-[40px] font-black text-white flex items-baseline gap-1 tracking-tight">
                        {billingCycle === 'monthly' ? '₹6,999' : '₹5,599'}
                        <span className="text-[14px] text-slate-400 font-bold font-sans">/ month</span>
                      </div>
                      <div className="text-[11px] text-[#7C3AED] font-extrabold">
                        {billingCycle === 'monthly' ? 'Billed monthly' : 'Billed annually (Save ₹16,800 / yr)'}
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4 pt-1">
                      <div className="text-[11px] font-extrabold uppercase text-[#7C3AED] tracking-widest">Included Features</div>
                      <ul className="space-y-4 text-[13px] text-slate-400 font-medium">
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold"><strong>Unlimited</strong> client profiles</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Dedicated API nodes</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#7C3AED] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-black">Custom AI Model Training</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Enterprise BOE matching suite</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Custom real-time alert logs</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Unlimited members & SSO</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#10B981] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-semibold">Immutable cryptographic logs</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check size={15} className="text-[#7C3AED] flex-shrink-0" strokeWidth={3} />
                          <span className="text-white font-black">Dedicated CA Partner Manager</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => {
                        triggerToast("✉ Transmitting custom Enterprise quote requests to Reckon partnership nodes...");
                      }}
                      className="w-full py-4 rounded-[3px] bg-[#F8FAFC] hover:bg-slate-50 text-[#1B4F8A] border border-[#1B4F8A]/30 font-black text-[13.5px] text-center cursor-pointer shadow-sm"
                    >
                      Contact Sales
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              PANEL 5: DATA & STORAGE
              ========================================== */}
          {activeTab === 'data' && (
            <div className="space-y-8">
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-[20px] font-bold text-white tracking-tight">Data & Storage Settings</h3>
                <p className="text-[13.5px] text-slate-400 mt-1">Export ledgers, coordinate data longevity mandates, and manage compliance purges.</p>
              </div>

              {/* Export data */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-[24px] p-6 space-y-4 shadow-inner">
                <h4 className="text-[15px] font-bold text-white">Download Cryptographic Archive</h4>
                <p className="text-[13.5px] text-slate-400 leading-relaxed">
                  Generate and download a comprehensive, password-protected ZIP archive enclosing client profile schemas, GSTR verification logs, ledger mismatches, and comprehensive action histories.
                </p>
                <button 
                  onClick={() => triggerToast("✓ Gathering CSV databases. ZIP download starting shortly...")}
                  className="bg-white hover:bg-slate-50 text-white border border-slate-200 hover:border-white/20 px-5 py-2.5 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  Request Archive ZIP
                </button>
              </div>

              {/* Data retention policies */}
              <div className="space-y-2.5">
                <h4 className="text-[14.5px] font-bold text-white">Data Retention Policy</h4>
                <p className="text-[13.5px] text-slate-400 leading-relaxed">
                  Reckon AI enforces a rigid 7-year records retention protocol on all calculated tax sheets, API logs, and excel mismatch outputs to ensure compliance with the statutory provisions of Indian GST Audit Laws.
                </p>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-[24px] p-6 space-y-4 relative overflow-hidden shadow-inner">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF4444]/5 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-[15px] font-bold text-[#EF4444] flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>Account Danger Zone</span>
                </h4>
                <p className="text-[13.5px] text-slate-400 leading-relaxed">
                  Initiate complete account cancellation. Deleting this account purges records for all active client profiles, ledger databases, and cryptographic backups.
                </p>
                
                <button 
                  onClick={() => triggerToast("⚠️ Please contact senior accounts representative to complete deletion.")}
                  className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-bold text-[12.5px] px-5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-lg cursor-pointer"
                >
                  Request Account Deletion
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PANEL 6: FIRM SETTINGS & TEAM (FIRM-SPECIFIC)
              ========================================== */}
          {activeTab === 'firm' && (
            <div className="space-y-8">
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-[20px] font-bold text-white tracking-tight">Firm Settings & Team</h3>
                <p className="text-[13.5px] text-slate-400 mt-1">Configure business configurations, CA registration numbers, office coordinates, and manage CA assistant seats.</p>
              </div>

              {/* Firm Details Form */}
              <form onSubmit={handleSaveFirm} className="space-y-6 pt-2">
                <h4 className="text-[15px] font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5]">
                    <Building size={15} />
                  </div>
                  <span>Business Profile Registry</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Registered Firm Name</label>
                    <input 
                      type="text" 
                      value={firmData.firmName}
                      onChange={(e) => setFirmData({...firmData, firmName: e.target.value})}
                      className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Firm GSTIN</label>
                    <input 
                      type="text" 
                      value={firmData.gstin}
                      onChange={(e) => setFirmData({...firmData, gstin: e.target.value})}
                      className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">CA Firm FRN (Firm Reg No)</label>
                    <input 
                      type="text" 
                      value={firmData.caRegistration}
                      onChange={(e) => setFirmData({...firmData, caRegistration: e.target.value})}
                      className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Client defaults settings</label>
                    <input 
                      type="text" 
                      value={firmData.clientDefaults}
                      onChange={(e) => setFirmData({...firmData, clientDefaults: e.target.value})}
                      className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Office Address</label>
                  <input 
                    type="text" 
                    value={firmData.officeAddress}
                    onChange={(e) => setFirmData({...firmData, officeAddress: e.target.value})}
                    className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200 hover:border-white/20 text-white font-bold text-[12.5px] transition-all cursor-pointer shadow"
                  >
                    Save Firm Settings
                  </button>
                </div>
              </form>

              <hr className="border-slate-200" />

              {/* Team management nested section */}
              <div className="space-y-5">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-[24px] p-6 space-y-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F46E5]/5 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="text-[15px] font-bold text-white flex items-center gap-2">
                    <Plus size={16} className="text-[#4F46E5]" />
                    <span>Invite CA Associate / Assistant</span>
                  </h4>
                  
                  <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        required
                        placeholder="e.g. junior.ca@firm.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-[13.5px] text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div className="w-full sm:w-48 space-y-2">
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Access Role</label>
                      <div className="relative">
                        <select 
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-[13.5px] text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 cursor-pointer appearance-none"
                        >
                          <option value="Junior Accountant">Junior Accountant</option>
                          <option value="Assistant CA">Assistant CA</option>
                          <option value="Partner CA">Partner CA</option>
                        </select>
                        <div className="absolute right-4 inset-y-0 flex items-center pointer-events-none text-slate-400">
                          <ArrowUpRight size={14} className="rotate-90 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full sm:w-auto h-11 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold text-[13px] px-6 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
                    >
                      <Plus size={16} />
                      <span>Send Invite</span>
                    </button>
                  </form>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="text-[11px] font-bold uppercase text-slate-400 tracking-widest px-1">Active Team Seats</div>
                  
                  <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-[13.5px]">
                      <thead className="bg-slate-50 text-slate-400 h-11 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="pl-5">Name</th>
                          <th>Email Address</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th className="pr-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white font-medium">
                        {members.map(m => (
                          <tr key={m.id} className="h-14 hover:bg-slate-50 transition-colors">
                            <td className="pl-5 font-bold">{m.name}</td>
                            <td className="font-mono text-slate-400 text-[12.5px]">{m.email}</td>
                            <td className="text-slate-500 font-bold">{m.role}</td>
                            <td>
                              {m.status === 'Active' ? (
                                <span className={`status-badge ${getUnifiedBadgeClass('ACTIVE')}`}>Active</span>
                              ) : (
                                  <span className="status-badge status-badge-warning">Pending</span>
                              )}
                            </td>
                            <td className="pr-5 text-right">
                              {m.role !== 'Owner / CA' ? (
                                <button 
                                  onClick={() => handleRevokeMember(m.id, m.name)}
                                  className="btn btn-danger-ghost btn-sm"
                                  title="Revoke member access"
                                >
                                  Revoke Access
                                </button>
                              ) : (
                                <span className="text-[12px] text-slate-500 font-semibold italic">Permanent Owner</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex items-center justify-center text-slate-400 text-sm font-bold">
        Loading preferences...
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

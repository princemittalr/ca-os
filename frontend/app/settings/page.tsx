"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  User, 
  Shield, 
  Bell, 
  Users, 
  CreditCard, 
  Building, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Laptop, 
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Save,
  ChevronRight,
  Copy
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const initialSessions = [
  { id: 's-1', device: 'Chrome Browser on Windows 11', location: 'Mumbai, India', last_active: 'Active now', is_mobile: false },
  { id: 's-2', device: 'Safari on iPhone 15 Pro', location: 'Delhi, India', last_active: '2 hours ago', is_mobile: true },
  { id: 's-3', device: 'Firefox on macOS Monterey', location: 'Bangalore, India', last_active: '3 days ago', is_mobile: false }
];

const SettingsPage = () => {
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'profile' | 'firm' | 'security' | 'notifications' | 'sessions' | 'billing'>('profile');
  
  useEffect(() => {
    if (tabParam && ['profile', 'firm', 'security', 'notifications', 'sessions', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const [profileData, setProfileData] = useState({
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@reckon.ai',
    phone: '+91 98765 43210',
  });
  const [profileDataChanged, setProfileDataChanged] = useState(false);
  
  const [firmData, setFirmData] = useState({
    firmName: 'Sharma & Associates CA',
    icaiNumber: 'ICA-489012',
    city: 'Mumbai',
    state: 'Maharashtra',
    designation: 'Managing Partner',
  });
  const [firmDataChanged, setFirmDataChanged] = useState(false);

  const [notifications, setNotifications] = useState({
    reconComplete: true,
    mismatchDetected: true,
    itcRisk: true,
    deadline7d: true,
    deadline3d: true,
    deadline1d: false,
    overdue: true,
  });

  const [sessions, setSessions] = useState(initialSessions);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'fair' | 'strong' | 'veryStrong' | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const getInitials = (name: string) => {
    if (!name) return 'RS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image exceeds 5MB limit", "error");
      e.target.value = '';
      return;
    }
    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      showToast("Unsupported file format", "error");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target?.result as string);
      showToast("Profile photo updated successfully.", "success");
    };
    reader.readAsDataURL(file);
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_]/.test(password)) score++;
    
    if (score <= 1) return 'weak';
    if (score <= 2) return 'fair';
    if (score <= 3) return 'strong';
    return 'veryStrong';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (name === 'new') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      showToast("Passwords must match", "error");
      return;
    }
    try {
      await api.put('/api/auth/password', { new_password: passwordForm.new });
      showToast("Password updated successfully", "success");
      setPasswordForm({ current: '', new: '', confirm: '' });
      setPasswordStrength('');
    } catch (err: any) {
      showToast(err.message || "Failed to update password", "error");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Profile changes saved successfully", "success");
    setProfileDataChanged(false);
  };

  const handleSaveFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Firm settings updated successfully", "success");
    setFirmDataChanged(false);
  };

  const handleLogoutOthers = async () => {
    try {
      await api.delete('/api/auth/sessions');
      setSessions(sessions.filter(s => s.last_active === 'Active now'));
      showToast("Logged out of all other devices", "success");
    } catch (err: any) {
      showToast("Failed to revoke sessions", "error");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {ToastComponent}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-slate-900">Settings</h1>
            <p className="text-[13px] text-slate-500 mt-1">Manage your account, firm details, and preferences</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <div className="w-[220px] shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="py-4">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'firm', label: 'Firm Details', icon: Building },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'sessions', label: 'Sessions', icon: Laptop },
              { id: 'billing', label: 'Billing (coming soon)', icon: CreditCard, disabled: true },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setActiveTab(item.id as any)}
                  className={`w-full h-[36px] flex items-center gap-2 px-4 text-[13px] font-medium transition-colors cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-[#1B4F8A]/5 text-[#1B4F8A] font-semibold border-l-2 border-[#1B4F8A]'
                      : item.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  disabled={item.disabled}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-[20px] font-bold text-slate-900">Profile</h2>
                <p className="text-[13px] text-slate-500 mt-1">Manage your personal information and profile photo</p>
              </div>
              <div className="border-b border-slate-200 mb-6" />

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-[64px] h-[64px] rounded-full bg-[#1B4F8A] flex items-center justify-center text-white text-[20px] font-bold overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(profileData.fullName)}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[11px] font-semibold">Change</span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="flex-1" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, fullName: e.target.value }));
                        setProfileDataChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-500 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-slate-700">Phone</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, phone: e.target.value }));
                        setProfileDataChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={!profileDataChanged}
                    className="h-[36px] px-4 bg-[#1B4F8A] hover:bg-[#0f3a66] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Firm Details Section */}
          {activeTab === 'firm' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-[20px] font-bold text-slate-900">Firm Details</h2>
                <p className="text-[13px] text-slate-500 mt-1">Update your firm information and professional details</p>
              </div>
              <div className="border-b border-slate-200 mb-6" />

              <form onSubmit={handleSaveFirm} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">Firm Name *</label>
                  <input
                    type="text"
                    value={firmData.firmName}
                    onChange={(e) => {
                      setFirmData(prev => ({ ...prev, firmName: e.target.value }));
                      setFirmDataChanged(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">ICAI Number *</label>
                  <input
                    type="text"
                    value={firmData.icaiNumber}
                    onChange={(e) => {
                      setFirmData(prev => ({ ...prev, icaiNumber: e.target.value }));
                      setFirmDataChanged(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-slate-700">City</label>
                    <input
                      type="text"
                      value={firmData.city}
                      onChange={(e) => {
                        setFirmData(prev => ({ ...prev, city: e.target.value }));
                        setFirmDataChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-slate-700">State</label>
                    <input
                      type="text"
                      value={firmData.state}
                      onChange={(e) => {
                        setFirmData(prev => ({ ...prev, state: e.target.value }));
                        setFirmDataChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={firmData.designation}
                    onChange={(e) => {
                      setFirmData(prev => ({ ...prev, designation: e.target.value }));
                      setFirmDataChanged(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={!firmDataChanged}
                    className="h-[36px] px-4 bg-[#1B4F8A] hover:bg-[#0f3a66] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-[20px] font-bold text-slate-900">Security</h2>
                <p className="text-[13px] text-slate-500 mt-1">Manage password and authentication settings</p>
              </div>
              <div className="border-b border-slate-200 mb-6" />

              <form onSubmit={handleSavePassword} className="space-y-4 pb-6">
                <h3 className="text-[14px] font-semibold text-slate-900 mb-2">Change Password</h3>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">Current Password *</label>
                  <input
                    type="password"
                    name="current"
                    value={passwordForm.current}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">New Password *</label>
                  <input
                    type="password"
                    name="new"
                    value={passwordForm.new}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        <div className={`flex-1 h-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : 'bg-slate-200'}`} />
                        <div className={`flex-1 h-1 rounded ${['fair', 'strong', 'veryStrong'].includes(passwordStrength) ? 'bg-amber-500' : 'bg-slate-200'}`} />
                        <div className={`flex-1 h-1 rounded ${['strong', 'veryStrong'].includes(passwordStrength) ? 'bg-green-500' : 'bg-slate-200'}`} />
                        <div className={`flex-1 h-1 rounded ${passwordStrength === 'veryStrong' ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 capitalize">
                        {passwordStrength.replace('veryStrong', 'Very Strong')}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-slate-700">Confirm New Password *</label>
                  <input
                    type="password"
                    name="confirm"
                    value={passwordForm.confirm}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!passwordForm.current || !passwordForm.new || !passwordForm.confirm || passwordForm.new !== passwordForm.confirm}
                    className="h-[36px] px-4 bg-[#1B4F8A] hover:bg-[#0f3a66] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-[20px] font-bold text-slate-900">Notifications</h2>
                <p className="text-[13px] text-slate-500 mt-1">Configure notification preferences</p>
              </div>
              <div className="border-b border-slate-200 mb-6" />

              <div className="space-y-4">
                {[
                  { key: 'reconComplete', title: 'Reconciliation Complete', desc: 'Get notified when a reconciliation job finishes' },
                  { key: 'mismatchDetected', title: 'Mismatch Detected', desc: 'Alert when mismatches are found during reconciliation' },
                  { key: 'itcRisk', title: 'ITC Risk Alert', desc: 'Notify about potential ITC risks' },
                  { key: 'deadline7d', title: 'Deadline - 7 Days', desc: 'Remind 7 days before a filing deadline' },
                  { key: 'deadline3d', title: 'Deadline - 3 Days', desc: 'Remind 3 days before a filing deadline' },
                  { key: 'deadline1d', title: 'Deadline - 1 Day', desc: 'Remind 1 day before a filing deadline' },
                  { key: 'overdue', title: 'Overdue Tasks', desc: 'Alert about overdue compliance tasks' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-[13px] font-medium text-slate-900">{item.title}</div>
                      <div className="text-[12px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        notifications[item.key as keyof typeof notifications] ? 'bg-[#10B981]' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                        notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Section */}
          {activeTab === 'sessions' && (
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-bold text-slate-900">Sessions</h2>
                  <p className="text-[13px] text-slate-500 mt-1">Manage your active login sessions</p>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={handleLogoutOthers}
                    className="h-[36px] px-4 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-[13px] font-semibold rounded-lg"
                  >
                    Logout All Other Devices
                  </button>
                )}
              </div>
              <div className="border-b border-slate-200 mb-6" />

              <div className="space-y-3">
                {sessions.map((session) => {
                  const isCurrent = session.last_active === 'Active now';
                  return (
                    <div key={session.id} className={`p-4 rounded-lg border ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                          {session.is_mobile ? <Smartphone size={16} className="text-slate-600" /> : <Laptop size={16} className="text-slate-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-[13px] font-semibold text-slate-900">{session.device}</div>
                            {isCurrent && (
                              <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">This device</span>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-500 mt-1">{session.location}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{session.last_active}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeTab === 'billing' && (
            <div className="max-w-2xl flex items-center justify-center py-16">
              <div className="text-center">
                <CreditCard size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-[15px] font-semibold text-slate-800 mb-1">Billing coming soon</h3>
                <p className="text-[12px] text-slate-500">Billing management will be available in a future update</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone (Bottom of page) */}
      <div className="mt-auto px-6 pb-6 pt-4 border-t border-slate-200">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-white border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-red-700">Delete Account</h3>
                <p className="text-[12px] text-red-600 mt-0.5">Permanently delete your account and all associated data</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-[36px] px-4 bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold rounded-lg"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Delete Account?</h3>
                <p className="text-[13px] text-slate-500 mt-1">
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-[36px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                className="h-[36px] px-4 bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold rounded-lg"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

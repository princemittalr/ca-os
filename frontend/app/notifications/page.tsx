"use client";

import React, { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { 
  Bell, 
  CheckCircle2, 
  Calendar, 
  Check, 
  Eye, 
  Trash2,
  Settings
} from 'lucide-react';

const initialNotifications = [
  {
    id: 'n-1',
    type: 'reconciliation', // reconciliation / compliance / system / account
    title: 'Reconciliation Complete',
    message: 'Monthly GST reconciliation finalized for TechNova Solutions Pvt Ltd.',
    subtext: '1,102 of 1,243 invoices successfully matched. ₹42.3L ITC protected.',
    time_ago: '2 hours ago',
    is_read: false
  },
  {
    id: 'n-2',
    type: 'reconciliation',
    title: 'Mismatch Warning',
    message: 'Value mismatches detected in GSTR-2B run for Apex Innovations.',
    subtext: '3 invoices show discrepancy in taxable value. ITC at Risk: ₹32,500.',
    time_ago: '5 hours ago',
    is_read: false
  },
  {
    id: 'n-3',
    type: 'compliance',
    title: 'GSTR-1 filing due in 3 days',
    message: 'Upcoming filing deadline approaching for Wayne Enterprises Ltd.',
    subtext: 'Filing period: March 2024. Due Date: 11-04-2026. Avoid penalties.',
    time_ago: 'Yesterday',
    is_read: false
  },
  {
    id: 'n-4',
    type: 'compliance',
    title: 'GSTR-3B OVERDUE return',
    message: 'Filing period March 2024 is currently overdue for Global Trade LLC.',
    subtext: 'Accumulating active daily late penalties. Filing must be completed.',
    time_ago: '2 days ago',
    is_read: false
  },
  {
    id: 'n-5',
    type: 'system',
    title: 'System Maintenance Scheduled',
    message: 'Scheduled server optimization and database indexing running this weekend.',
    subtext: 'Expect minor API response latency of 1-2 seconds between 2:00 AM and 4:00 AM IST.',
    time_ago: '3 days ago',
    is_read: true
  },
  {
    id: 'n-6',
    type: 'account',
    title: 'New Session Login',
    message: 'Successful user authentication logged from new IP address in Mumbai.',
    subtext: 'Device: Chrome Browser (Windows 11). IP: 103.44.82.10.',
    time_ago: '4 days ago',
    is_read: true
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState('all'); // all / unread / reconciliation / compliance / system

  const handleMarkRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Filter calculations
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    return n.type === activeTab;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reconciliation':
        return <CheckCircle2 size={18} className="text-[#10B981]" />;
      case 'compliance':
        return <Calendar size={18} className="text-[#F59E0B]" />;
      case 'system':
        return <Settings size={18} className="text-[#7C3AED]" />;
      default:
        return <Bell size={18} className="text-[#4F46E5]" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'reconciliation':
        return 'bg-[#10B981]/10 border border-[#10B981]/15';
      case 'compliance':
        return 'bg-[#F59E0B]/10 border border-[#F59E0B]/15';
      case 'system':
        return 'bg-[#7C3AED]/10 border border-[#7C3AED]/15';
      default:
        return 'bg-[#4F46E5]/10 border border-[#4F46E5]/15';
    }
  };

  return (
    <div className="space-y-12 pb-16 animate-in fade-in duration-500 relative">
      
      <PageHeader
        sectionLabel="Security Logs"
        title="Notifications"
        description="Audit event logs, reconciliation pipeline statuses, and client filing reminders."
        hasSeparator={true}
        actions={
          unreadCount > 0 ? (
            <button 
              onClick={handleMarkAllRead}
              className="bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] h-[40px] px-[16px] rounded-[var(--radius-md)] font-medium text-[14px] inline-flex items-center justify-center transition-all hover:bg-slate-50 gap-2 cursor-pointer"
            >
              <Eye size={14} className="text-[#4F46E5]" />
              <span>Mark All as Read</span>
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-1.5 overflow-x-auto hidden-scrollbar">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === 'all' ? 'text-white font-bold border-b-2 border-[#4F46E5]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          All
        </button>
        
        <button 
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
            activeTab === 'unread' ? 'text-white font-bold border-b-2 border-[#4F46E5]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-lg bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-[#EF4444]/20">
              {unreadCount}
            </span>
          )}
        </button>
        
        <button 
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === 'reconciliation' ? 'text-white font-bold border-b-2 border-[#4F46E5]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Reconciliation
        </button>
        
        <button 
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === 'compliance' ? 'text-white font-bold border-b-2 border-[#4F46E5]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Compliance
        </button>
        
        <button 
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === 'system' ? 'text-white font-bold border-b-2 border-[#4F46E5]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          System
        </button>
      </div>

      {/* List items */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id}
              className={`bg-white rounded-[24px] border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative transition-all duration-300 hover:border-slate-200 shadow-md group ${
                !notif.is_read ? 'border-l-4 border-l-[#4F46E5]' : ''
              }`}
            >
              <div className="flex gap-4 items-center min-w-0">
                {/* Left Colored Icon */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${getIconBg(notif.type)}`}>
                  {getTypeIcon(notif.type)}
                </div>

                {/* Middle details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-bold truncate ${!notif.is_read ? 'text-white font-black' : 'text-slate-900/80'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">• {notif.time_ago}</span>
                  </div>
                  <p className="text-xs text-white leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{notif.subtext}</p>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3.5 self-end sm:self-center">
                {!notif.is_read && (
                  <button 
                    onClick={() => handleMarkRead(notif.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#F8FAFC] border border-slate-200 text-slate-500 hover:text-[#10B981] px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Check size={12} strokeWidth={3} />
                    <span>Mark Read</span>
                  </button>
                )}
                
                <button 
                  onClick={() => handleDelete(notif.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 rounded-xl bg-[#F8FAFC] border border-slate-200 hover:border-[#EF4444] text-slate-500 hover:text-[#EF4444] flex items-center justify-center cursor-pointer shadow-md"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>

                {/* Orange/Violet active dot indicator if unread */}
                {!notif.is_read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] group-hover:hidden shadow-lg shadow-[#4F46E5]/30"></div>
                )}
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-500 shadow-fintech-md">
            All caught up! No notifications in this category.
          </div>
        )}
      </div>

    </div>
  );
}

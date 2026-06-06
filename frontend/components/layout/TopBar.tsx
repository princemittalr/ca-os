"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  MessageSquare, 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  MessageCircle,
  Menu
} from 'lucide-react';

import { getAuthToken } from "../../lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatTimeAgo(dateString: string) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export default function TopBar({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const pathname = usePathname() || '';
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userInitials, setUserInitials] = useState("U");

  const getBreadcrumb = (path: string) => {
    if (!path || path === '/' || path === '/dashboard') return 'Dashboard';
    
    const routeNames: Record<string, string> = {
      'dashboard': 'Dashboard',
      'clients': 'Client Portfolio',
      'gst-recon': 'GST Recon',
      'import-recon': 'Import Recon',
      'notices': 'Notice Desk',
      'compliance': 'Compliance Operations Center',
      'action-center': 'Action Center',
      'automation': 'Automation',
      'audit-trail': 'Audit Trail',
      'settings': 'Settings',
      'support': 'Support',
    };

    const segments = path.split('/').filter(Boolean);
    return segments
      .map(seg => routeNames[seg.toLowerCase()] || seg.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .join(' / ');
  };

  useEffect(() => {
    const fullName = localStorage.getItem("full_name");
    if (fullName) {
      const initials = fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      setUserInitials(initials || "U");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      fetch(`${API_BASE}/api/notifications/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => setNotifications(data))
        .catch(() => setNotifications([]));

      fetch(`${API_BASE}/api/messages/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => setMessages(data))
        .catch(() => setMessages([]));
    })();
  }, []);

  // Messages Dataset
  const [messages, setMessages] = useState<any[]>([]);

  // Notifications Dataset
  const [notifications, setNotifications] = useState<any[]>([]);

  const messagesRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setIsMessageOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMessageOpen(false);
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Handlers for Messages
  const handleMarkMessageRead = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, unread: false } : m));
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  // Handlers for Notifications
  const handleMarkNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    const token = await getAuthToken();
    fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    const token = await getAuthToken();
    fetch(`${API_BASE}/api/notifications/read-all`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    }).catch(() => {});
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const unreadMessagesCount = messages.filter(m => m.unread).length;
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div 
      className="w-full flex items-center justify-between px-4 bg-white flex-shrink-0 relative z-50"
      style={{
        height: '48px',
        borderBottom: '1px solid #E5E7EB',
        boxShadow: '0 1px 0 #E5E7EB',
      }}
    >
      {/* Left side: Hamburger (mobile only) + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center rounded-[3px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors duration-150 flex-shrink-0 cursor-pointer"
          style={{ width: '28px', height: '28px' }}
          aria-label="Open navigation menu"
        >
          <Menu size={15} />
        </button>
        <div 
          className="select-none truncate font-normal"
          style={{
            fontSize: '13px',
            color: '#4B5563',
          }}
        >
          {getBreadcrumb(pathname)}
        </div>
      </div>

      {/* Right side: Search + Utility Buttons + User Avatar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Search bar (hidden on very small screens, 200px wide on sm and up) */}
        <div 
          className="hidden sm:flex relative items-center bg-white"
          style={{
            height: '28px',
            width: '200px',
            border: '1px solid #D1D5DB',
            borderRadius: '3px',
          }}
        >
          <Search 
            size={15} 
            className="absolute left-2.5 text-[#6B7280] pointer-events-none" 
          />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full h-full bg-transparent pl-8 pr-2 focus:outline-none text-[12px] text-slate-900 placeholder:text-[#9CA3AF]"
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Messages */}
          <div ref={messagesRef} className="relative">
            <button 
              onClick={() => {
                setIsMessageOpen(!isMessageOpen);
                setIsNotificationOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={isMessageOpen}
              aria-label="Toggle messages panel"
              className="w-7 h-7 rounded-[3px] bg-transparent hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] relative cursor-pointer transition-colors duration-150 focus:outline-none"
            >
              <MessageSquare size={15} />
              {unreadMessagesCount > 0 && (
                <span 
                  className="absolute top-[2px] right-[2px] block rounded-full" 
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#B91C1C',
                  }}
                />
              )}
            </button>

            {isMessageOpen && (
              <div 
                role="menu"
                aria-label="Messages Dropdown"
                className="absolute right-0 mt-2 w-[320px] border border-[#E5E7EB] rounded-[3px] shadow-sm p-4 z-[9999] flex flex-col bg-white"
              >
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-2.5">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">Recent Communications ({unreadMessagesCount})</h4>
                    <p className="text-[10px] text-slate-500">CA communications & AI alerts</p>
                  </div>
                  {messages.length > 0 && (
                    <button 
                      onClick={handleClearMessages}
                      className="text-[10px] font-bold text-[#EF4444] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="max-h-[240px] overflow-y-auto space-y-1.5 hidden-scrollbar">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div 
                        key={msg.id}
                        onClick={() => handleMarkMessageRead(msg.id)}
                        className={`p-2 rounded-[3px] transition-colors duration-150 cursor-pointer relative hover:bg-slate-50 flex flex-col gap-0.5 border ${
                          msg.unread 
                            ? 'bg-[#F8FAFC] border-slate-200' 
                            : 'bg-transparent border-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[11.5px] font-bold text-slate-900 tracking-tight leading-none">{msg.sender}</span>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap leading-none">{msg.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal truncate mt-0.5">{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <MessageSquare size={14} />
                      </div>
                      <div>
                        <h5 className="text-[11.5px] font-bold text-slate-900">All Conversations Read</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">Inbox is completely clear.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button 
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsMessageOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={isNotificationOpen}
              aria-label="Toggle notifications panel"
              className="w-7 h-7 rounded-[3px] bg-transparent hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] relative cursor-pointer transition-colors duration-150 focus:outline-none"
            >
              <Bell size={15} />
              {unreadNotificationsCount > 0 && (
                <span 
                  className="absolute top-[2px] right-[2px] block rounded-full" 
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#B91C1C',
                  }}
                />
              )}
            </button>

            {isNotificationOpen && (
              <div 
                role="menu"
                aria-label="Notifications Dropdown"
                className="absolute right-0 mt-2 w-[320px] border border-[#E5E7EB] rounded-[3px] shadow-sm p-4 z-[9999] flex flex-col bg-white"
              >
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-2.5">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">Notifications ({unreadNotificationsCount})</h4>
                    <p className="text-[10px] text-slate-500">Platform compliance updates</p>
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Check size={11} />
                        <span>Read All</span>
                      </button>
                      <span className="text-slate-300 text-[10px]">|</span>
                      <button 
                        onClick={handleClearNotifications}
                        className="text-[10px] font-bold text-[#EF4444] hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-[240px] overflow-y-auto space-y-1.5 hidden-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        className={`p-2 rounded-[3px] transition-colors duration-150 cursor-pointer relative hover:bg-slate-50 flex gap-2.5 items-start border ${
                          !notif.is_read 
                            ? 'bg-[#F8FAFC] border-slate-200' 
                            : 'bg-transparent border-transparent'
                        }`}
                      >
                        {/* Compact notification icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {notif.type === 'warning' && <AlertTriangle size={13} className="text-[#F59E0B]" />}
                          {notif.type === 'success' && <CheckCircle2 size={13} className="text-[#10B981]" />}
                          {notif.type === 'error' && <AlertCircle size={13} className="text-[#EF4444]" />}
                          {notif.type !== 'warning' && notif.type !== 'success' && notif.type !== 'error' && <MessageCircle size={13} className="text-[#4F46E5]" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[11.5px] font-bold text-slate-900 truncate leading-none mt-0.5">{notif.title}</span>
                            <span className="text-[9px] text-slate-400 whitespace-nowrap leading-none mt-0.5">
                              {notif.time || (notif.created_at ? formatTimeAgo(notif.created_at) : '')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal mt-1">
                            {notif.description || notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <Bell size={14} />
                      </div>
                      <div>
                        <h5 className="text-[11.5px] font-bold text-slate-900">All Caught Up!</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">No critical alerts detected.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User avatar */}
        <div 
          className="w-[26px] h-[26px] rounded-full bg-[#E8EFF7] text-[#1B4F8A] text-[11px] font-bold flex items-center justify-center flex-shrink-0 select-none"
        >
          {userInitials}
        </div>
      </div>
    </div>
  );
}

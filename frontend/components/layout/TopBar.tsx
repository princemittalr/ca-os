"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Menu,
  X
} from 'lucide-react';

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
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [userInitials, setUserInitials] = useState("U");

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
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/api/notifications/`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setNotifications(data))
      .catch(() => setNotifications([]));
  }, []);

  // Messages Dataset
  const [messages, setMessages] = useState([
    { id: 'm1', sender: 'TechNova Solutions', text: 'Uploaded the Q4 purchase ledger Excel sheet.', time: '10m ago', unread: true },
    { id: 'm2', sender: 'Gemini AI Assistant', text: 'Discrepancy alert: GSTIN mismatch detected in 4 invoices of Sharma Traders.', time: '1h ago', unread: true },
    { id: 'm3', sender: 'System Audit', text: 'Reconciliation process completed for TechNova Solutions Pvt Ltd.', time: '2h ago', unread: false },
    { id: 'm4', sender: 'Priyanka Patel (Assistant CA)', text: 'Draft GSTR-1 ready for review.', time: '1d ago', unread: false }
  ]);

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
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    fetch(`${API_BASE}/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    fetch(`${API_BASE}/api/notifications/read-all`, { method: "POST" }).catch(() => {});
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#F59E0B] flex items-center justify-center flex-shrink-0 border border-amber-200">
            <AlertTriangle size={15} />
          </div>
        );
      case 'success':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center flex-shrink-0 border border-emerald-200">
            <CheckCircle2 size={15} />
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#EF4444] flex items-center justify-center flex-shrink-0 border border-red-200">
            <AlertCircle size={15} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center flex-shrink-0 border border-indigo-200">
            <MessageCircle size={15} />
          </div>
        );
    }
  };

  const unreadMessagesCount = messages.filter(m => m.unread).length;
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="h-16 w-full flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex-shrink-0 relative z-50"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="absolute inset-0 bg-white px-4 flex items-center gap-3 z-[60]">
          <div className="flex-1 relative flex items-center h-[40px] rounded-xl border border-[#4F46E5] bg-[#FFFFFF] shadow-[0_0_0_3px_rgba(79,70,229,0.1)]">
            <div className="flex items-center pl-3.5 pointer-events-none gap-2">
              <Search size={16} className="text-[#4F46E5]" />
              <Sparkles size={13} className="text-[#7C3AED] animate-pulse" />
            </div>
            <input 
              type="text" 
              autoFocus
              placeholder="Search clients, GSTIN, invoices..." 
              className="w-full h-full bg-transparent pl-2.5 pr-12 text-[13px] font-medium text-slate-900 placeholder:text-muted focus:outline-none search-input"
            />
            {/* AI badge */}
            <div className="absolute right-3 pointer-events-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#7C3AED] bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md">
                AI
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileSearchOpen(false)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex-shrink-0"
            aria-label="Close search overlay"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Hamburger button */}
      <button
        onClick={onMenuClick}
        data-tooltip="Open Menu"
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 mr-2 flex-shrink-0"
        style={{ color: 'var(--color-text-primary)' }}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>
      
      {/* Left side search block */}
      <div className="flex items-center flex-1 max-w-xl">
        {/* Mobile search icon trigger */}
        <button
          onClick={() => setIsMobileSearchOpen(true)}
          data-tooltip="Search"
          className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-[#4F46E5] hover:bg-indigo-50 active:scale-95 transition-all duration-200 mr-2"
          aria-label="Open search overlay"
        >
          <Search size={18} />
        </button>

        {/* Search bar */}
        <div 
          className="relative max-w-md w-full transition-all duration-300 ease-out group hidden md:block"
        >
          {/* Outer container */}
          <div 
            className="relative flex items-center w-full h-[40px] rounded-xl transition-all duration-200 ease-out border overflow-hidden"
            style={{
              background: isFocused 
                ? '#FFFFFF' 
                : '#F1F5F9',
              borderColor: isFocused 
                ? '#4F46E5' 
                : '#E2E8F0',
              boxShadow: isFocused 
                ? '0 0 0 3px rgba(79, 70, 229, 0.1)' 
                : 'none',
            }}
          >
            {/* Left Side: Search icon */}
            <div className="flex items-center pl-3.5 z-10 pointer-events-none gap-2">
              <div className="relative flex items-center justify-center">
                <Search 
                  size={16} 
                  className="relative transition-all duration-200"
                  style={{
                    color: isFocused ? '#4F46E5' : '#64748B',
                  }}
                />
              </div>
              
              {/* AI Sparkle on focus */}
              <div 
                className="flex items-center transition-all duration-200 overflow-hidden"
                style={{
                  width: isFocused ? '16px' : '0px',
                  opacity: isFocused ? 1 : 0,
                  marginRight: isFocused ? '2px' : '-8px',
                }}
              >
                <Sparkles 
                  size={13} 
                  className="text-[#7C3AED] animate-pulse"
                />
              </div>
            </div>

            {/* Actual Input */}
            <input 
              type="text" 
              placeholder="Search clients, GSTIN, invoices or ask AI..." 
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full h-full bg-transparent pl-2.5 pr-20 text-[13px] font-medium text-slate-900 placeholder:text-muted focus:outline-none transition-all duration-200 search-input"
              style={{
                letterSpacing: '-0.01em',
              }}
            />

            {/* Right Side: Shortcut & AI Badge */}
            <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none z-10">
              {/* Keyboard shortcut hint */}
              <div 
                className="search-shortcut flex items-center gap-0.5 border border-slate-200 tracking-widest transition-all duration-200"
                style={{
                  opacity: isFocused ? 0 : 1,
                  transform: isFocused ? 'translateX(6px)' : 'translateX(0)',
                }}
              >
                <span className="text-[10px]">⌘</span>K
              </div>

              {/* AI badge */}
              <div 
                className="flex items-center gap-1 transition-all duration-200"
                style={{
                  opacity: isFocused ? 1 : 0.5,
                  transform: isFocused ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-[#7C3AED] bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md">
                  AI
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side interaction buttons */}
      <div className="flex items-center gap-3">
        
        {/* Messages Dropdown & Button */}
        <div ref={messagesRef} className="relative">
          <button 
            onClick={() => {
              setIsMessageOpen(!isMessageOpen);
              setIsNotificationOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isMessageOpen}
            aria-label="Toggle messages panel"
            data-tooltip="Communications"
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-[#7C3AED] hover:bg-violet-50 active:scale-95 group cursor-pointer relative transition-all duration-200 ${
              isMessageOpen ? 'text-[#7C3AED] bg-violet-50' : 'hover:bg-slate-100'
            }`}
            style={{
              border: isMessageOpen ? '1px solid #DDD6FE' : '1px solid transparent',
            }}
          >
            <MessageSquare size={18} className={`transition-colors ${isMessageOpen ? 'text-[#7C3AED]' : ''}`} />
            {unreadMessagesCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#7C3AED] text-[8.5px] font-black text-white flex items-center justify-center border-2 border-white shadow-sm">
                {unreadMessagesCount}
              </div>
            )}
          </button>

          {isMessageOpen && (
            <div 
              role="menu"
              aria-label="Messages Dropdown"
              className="absolute right-0 mt-2 w-[380px] border border-slate-200 rounded-2xl shadow-fintech-lg p-5 z-[9999] backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200 ease-out flex flex-col bg-white"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight">Recent Communications</h4>
                  <p className="text-[10px] text-muted">CA communications & AI alerts</p>
                </div>
                {messages.length > 0 && (
                  <button 
                    onClick={handleClearMessages}
                    className="text-[10px] font-extrabold text-[#EF4444] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Message scroll list */}
              <div className="max-h-[280px] overflow-y-auto space-y-2 hidden-scrollbar">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div 
                      key={msg.id}
                      onClick={() => handleMarkMessageRead(msg.id)}
                      className={`p-3 rounded-xl transition-all duration-200 cursor-pointer relative hover:bg-slate-50 flex flex-col gap-1 border ${
                        msg.unread 
                          ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' 
                          : 'bg-transparent border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[13px] font-bold text-slate-900 tracking-tight leading-none">{msg.sender}</span>
                        <span className="text-[9.5px] text-muted whitespace-nowrap leading-none">{msg.time}</span>
                      </div>
                      <p className="text-[12px] text-secondary leading-relaxed truncate-3-lines mt-1">{msg.text}</p>
                      
                      {msg.unread && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#4F46E5] shadow-sm" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h5 className="text-[12.5px] font-bold text-slate-900">All Conversations Read</h5>
                      <p className="text-[11px] text-muted mt-0.5">Inbox is completely clear.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown & Button */}
        <div ref={notificationsRef} className="relative">
          <button 
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              setIsMessageOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isNotificationOpen}
            aria-label="Toggle notifications panel"
            data-tooltip="Notifications"
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-[#4F46E5] hover:bg-indigo-50 active:scale-95 group cursor-pointer relative transition-all duration-200 ${
              isNotificationOpen ? 'text-[#4F46E5] bg-indigo-50' : 'hover:bg-slate-100'
            }`}
            style={{
              border: isNotificationOpen ? '1px solid #C7D2FE' : '1px solid transparent',
            }}
          >
            <Bell size={18} className={`transition-colors ${isNotificationOpen ? 'text-[#4F46E5]' : ''}`} />
            {unreadNotificationsCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4F46E5] text-[8.5px] font-black text-white flex items-center justify-center border-2 border-white shadow-sm">
                {unreadNotificationsCount}
              </div>
            )}
          </button>

          {isNotificationOpen && (
            <div 
              role="menu"
              aria-label="Notifications Dropdown"
              className="absolute right-0 mt-2 w-[380px] border border-slate-200 rounded-2xl shadow-fintech-lg p-5 z-[9999] backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200 ease-out flex flex-col bg-white"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 tracking-tight">Notifications</h4>
                  <p className="text-[10px] text-muted">Platform compliance updates</p>
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[10px] font-extrabold text-[#10B981] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Check size={11} />
                      <span>Read All</span>
                    </button>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <button 
                      onClick={handleClearNotifications}
                      className="text-[10px] font-extrabold text-[#EF4444] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[280px] overflow-y-auto space-y-2 hidden-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      className={`p-3 rounded-xl transition-all duration-200 cursor-pointer relative hover:bg-slate-50 flex gap-3 items-start border ${
                        !notif.is_read 
                          ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' 
                          : 'bg-transparent border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {getNotificationIcon(notif.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[12.5px] font-bold text-slate-900 truncate leading-none mt-0.5">{notif.title}</span>
                          <span className="text-[9.5px] text-muted whitespace-nowrap leading-none mt-0.5">
                            {notif.time || (notif.created_at ? formatTimeAgo(notif.created_at) : '')}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-secondary leading-relaxed mt-1.5">
                          {notif.description || notif.message}
                        </p>
                      </div>
                      
                      {!notif.is_read && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#4F46E5] shadow-sm" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                      <Bell size={16} />
                    </div>
                    <div>
                      <h5 className="text-[12.5px] font-bold text-slate-900">All Caught Up!</h5>
                      <p className="text-[11px] text-muted mt-0.5">No critical alerts detected.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div 
          className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-[11px] shadow-sm flex-shrink-0 select-none"
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          }}
        >
          {userInitials}
        </div>

      </div>
      
    </div>
  );
}

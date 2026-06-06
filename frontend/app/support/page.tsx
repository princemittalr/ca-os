"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { getUnifiedBadgeClass, renderBadgeDot } from '@/lib/badgeHelper';
import { 
  MessageSquare, 
  Ticket, 
  BookOpen, 
  X,
  CheckCircle,
  FileText,
  ChevronRight,
  ShieldQuestion,
  HelpCircle,
  Video,
  FileCode,
  Lock,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { getAuthToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const helpCategories = [
  { icon: ShieldQuestion, name: 'Getting Started', count: '12 articles' },
  { icon: FileText, name: 'GST Reconciliation', count: '18 articles' },
  { icon: HelpCircle, name: 'Customs BOE Sync', count: '8 articles' },
  { icon: Video, name: 'Video Walkthroughs', count: '10 tutorials' },
  { icon: FileCode, name: 'API Connectors', count: '6 developer files' },
  { icon: Lock, name: 'Data Security & RLS', count: '7 papers' }
];

const formatDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return dateStr;
};

export default function SupportCenterPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      const formatted = data.map((t: any) => ({
        ...t,
        date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : t.date || ''
      }));
      setTickets(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatAgent, setChatAgent] = useState({ name: 'CA Co-Pilot (AI)', role: 'Compliance Assistant', avatar: 'AI' });

  // Ticket Drawer States
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [replyInput, setReplyInput] = useState('');

  // Form Fields
  const [category, setCategory] = useState('API Integration');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsChatOpen(false);
        setIsTicketOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isChatOpen || isTicketOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isChatOpen, isTicketOpen]);

  const handleStartChat = () => {
    console.log("[Support Desk] Initializing support live chat session...");
    setChatAgent({ name: 'CA Co-Pilot (AI)', role: 'Compliance Assistant', avatar: 'AI' });
    setIsChatOpen(true);
    setChatMessages([
      {
        id: 'msg-1',
        sender: 'bot',
        text: "Hello! Welcome to Reckon AI Live Support. I'm your CA Co-Pilot assistant. You can ask me any compliance questions, select a quick assistance category, or request an immediate transfer to a live senior CA.",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const sendBotReply = async (userQuery: string) => {
    setIsBotTyping(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: userQuery })
      });
      if (!res.ok) throw new Error("Failed to fetch chat response");
      const data = await res.json();
      
      if (data.agent) {
        setChatAgent({
          name: data.agent.name,
          role: data.agent.role,
          avatar: data.agent.avatar
        });
      }
      
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to fetch chat response.");
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleSendChatMessage = (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    sendBotReply(text);
  };

  const handleSendTicketReply = async () => {
    if (!replyInput.trim() || !selectedTicket) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/support/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sender: 'user',
          text: replyInput,
          date: new Date().toLocaleString('en-GB').replace(',', '')
        })
      });
      if (!res.ok) throw new Error("Failed to post reply");
      
      const updatedTicket = await res.json();
      const formattedTicket = {
        ...updatedTicket,
        date: updatedTicket.created_at ? new Date(updatedTicket.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : updatedTicket.date || ''
      };

      setTickets(tickets.map(t => t.id === selectedTicket.id ? formattedTicket : t));
      setSelectedTicket(formattedTicket);
      setReplyInput('');
      triggerToast("✓ Reply submitted to support ticket.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to submit reply.");
    }
  };

  const handleBrowseArticles = () => {
    triggerToast("📚 Opening Reckon AI Knowledge base.");
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ category, subject, description, priority })
      });
      if (!res.ok) throw new Error("Failed to submit ticket");
      
      const newTicket = await res.json();
      const formatted = {
        ...newTicket,
        date: newTicket.created_at ? new Date(newTicket.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : newTicket.date || ''
      };

      setTickets([formatted, ...tickets]);
      setIsModalOpen(false);
      
      // reset form
      setSubject('');
      setDescription('');
      setCategory('API Integration');
      setPriority('Medium');

      triggerToast(`✓ Support ticket ${formatted.id} created successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to submit support ticket.");
    }
  };

  const getPriorityStyle = (prio: string) => {
    return getUnifiedBadgeClass(prio);
  };

  const getStatusStyle = (status: string) => {
    return getUnifiedBadgeClass(status);
  };

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-500 relative">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 bg-white border border-slate-200 text-slate-800 px-6 py-4 rounded-[20px] shadow-fintech-lg z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-sm flex items-center gap-3">
          <CheckCircle className="text-[#10B981] flex-shrink-0" size={18} />
          <span className="text-[13.5px] font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Global CSS Injector to hide TopBar elements and floating icons during support panel focus */}
      {(isChatOpen || isTicketOpen) && (
        <style dangerouslySetInnerHTML={{__html: `
          /* Fade out global floating and header components for absolute support focus */
          .flex.items-center.gap-4, .flex.items-center.flex-1.max-w-xl, aside button {
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
        `}} />
      )}

      {/* Header */}
      <PageHeader
        sectionLabel="Support Desk"
        title="Support Center"
        description="Get real-time filing assistance or search our extensive technical compliance archives."
      />

      {/* 3 premium action cards at top (horizontal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Live Chat */}
        <div className="std-card std-card-interactive flex flex-col justify-between relative overflow-hidden group" style={{ padding: 28 }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-4">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-primary-light)',
              flexShrink: 0
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                Live Expert Chat
              </h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Connect with a senior Chartered Accountant or technical representative right away.
              </p>
            </div>
          </div>
          <button 
            onClick={handleStartChat}
            className="btn btn-md btn-primary w-full mt-6"
          >
            Start Chat (Replies in 5m)
          </button>
        </div>

        {/* Card 2: Raise Ticket */}
        <div className="std-card std-card-interactive flex flex-col justify-between relative overflow-hidden group" style={{ padding: 28 }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F46E5]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-4">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-info-soft)',
              color: 'var(--color-info)',
              flexShrink: 0
            }}>
              <Ticket size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                Raise Ticket
              </h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Lodge an official ticket regarding GSTR API errors, calculation logs, or billing issues.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-md btn-secondary w-full mt-6"
          >
            Raise Support Ticket
          </button>
        </div>

        {/* Card 3: Help Center */}
        <div className="std-card std-card-interactive flex flex-col justify-between relative overflow-hidden group" style={{ padding: 28 }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-4">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-success-soft)',
              color: 'var(--color-success)',
              flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                Help Center
              </h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Browse extensive platform video walkthroughs, system schemas, and GST rules.
              </p>
            </div>
          </div>
          <button 
            onClick={handleBrowseArticles}
            className="btn btn-md btn-ghost w-full mt-6"
          >
            Browse Articles (50+)
          </button>
        </div>
      </div>

      {/* Tickets table */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Your Support Tickets</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-sm btn-secondary"
          >
            <Plus size={14} className="mr-1" />
            <span>+ New Ticket</span>
          </button>
        </div>
        
        <div className="data-table-shell">
          <div className="overflow-x-auto">
            <table className="data-table data-table-striped-6plus">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject / Query</th>
                  <th>Category</th>
                  <th className="text-center">Priority</th>
                  <th className="text-center">Status</th>
                  <th>Created Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      Loading support tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((tkt) => {
                    const isActive = selectedTicket?.id === tkt.id && isTicketOpen;
                    return (
                      <tr 
                        key={tkt.id} 
                        onClick={() => {
                          console.log("[Support Desk] Opening ticket details for:", tkt.id);
                          setSelectedTicket(tkt);
                          setIsTicketOpen(true);
                        }}
                        className={`data-table-row-clickable group ${
                          isActive ? 'bg-slate-50' : ''
                        }`}
                      >
                        {/* ID */}
                        <td className="relative" style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#4F46E5] shadow-[0_0_8px_#4F46E5]" />
                          )}
                          <span className={isActive ? 'text-[#4F46E5]' : ''}>
                            {tkt.id}
                          </span>
                        </td>
                        
                        {/* Subject */}
                        <td style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }} className="max-w-xs truncate group-hover:text-[#4F46E5] transition-colors">
                          {tkt.subject}
                        </td>
                        
                        {/* Category */}
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {tkt.category}
                        </td>
   
                        {/* Priority */}
                        <td className="text-center">
                          <span className={`status-badge ${getPriorityStyle(tkt.priority)}`}>
                            {renderBadgeDot(tkt.priority)}
                            {tkt.priority}
                          </span>
                        </td>
   
                        {/* Status */}
                        <td className="text-center">
                          <span className={`status-badge ${getStatusStyle(tkt.status)}`}>
                            {renderBadgeDot(tkt.status)}
                            {tkt.status}
                          </span>
                        </td>
   
                        {/* Date */}
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {formatDate(tkt.date)}
                        </td>
   
                        {/* Actions */}
                        <td className="text-right">
                          <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} className="ml-auto" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Help Center Grid (below tickets) */}
      <div className="space-y-5 pt-4">
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }} className="tracking-tight px-1">
          Help Center & Knowledge Base
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {helpCategories.map((cat, idx) => (
            <div 
              key={idx}
              onClick={handleBrowseArticles}
              className="std-card std-card-interactive flex flex-row items-center cursor-pointer group"
              style={{ minHeight: 80, paddingLeft: 24, paddingRight: 24, gap: 16 }}
            >
              <div 
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                className="group-hover:border-[#4F46E5]/30 group-hover:text-[#4F46E5] transition-all"
              >
                <cat.icon size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="truncate group-hover:text-[#4F46E5] transition-colors" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {cat.name}
                </h4>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {cat.count}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* Raise Ticket Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 p-8 flex flex-col gap-6 relative shadow-fintech-lg animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:border-slate-200 flex items-center justify-center"
            >
              <X size={16} />
            </button>
            
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5]">
                  <Ticket size={18} />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">
                    Submit Developer Ticket
                  </h2>
                  <p className="text-[12.5px] text-slate-400 mt-0.5">Submit your GSTR filing error logs. SLA is 24 hours.</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmitTicket} className="space-y-5">
              
              {/* Category */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Trouble Category</label>
                <div className="relative">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all cursor-pointer appearance-none"
                  >
                    <option value="API Integration">GSTR Portal Sync error (API)</option>
                    <option value="Calculations">ITC protected difference (Math)</option>
                    <option value="Account Management">Seats / Billing query</option>
                    <option value="Other">General UI feedback</option>
                  </select>
                  <div className="absolute right-4 inset-y-0 flex items-center pointer-events-none text-slate-400">
                    <ArrowUpRight size={14} className="rotate-90 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Subject Summary *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Columns map failed on GSTR-2B JSON import"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Description of Issue *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Paste portal error codes or describe what went wrong..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 transition-all focus:border-[#4F46E5]/50"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Issue Priority</label>
                <div className="flex gap-6 items-center">
                  <label className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="priority" 
                      value="Low"
                      checked={priority === 'Low'}
                      onChange={() => setPriority('Low')}
                      className="accent-[#4F46E5] h-4 w-4" 
                    />
                    <span>Low</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="priority" 
                      value="Medium"
                      checked={priority === 'Medium'}
                      onChange={() => setPriority('Medium')}
                      className="accent-[#4F46E5] h-4 w-4" 
                    />
                    <span>Medium</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="priority" 
                      value="High"
                      checked={priority === 'High'}
                      onChange={() => setPriority('High')}
                      className="accent-[#4F46E5] h-4 w-4" 
                    />
                    <span className="text-[#EF4444] font-bold">High (SLA: 4h)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-md"
                >
                  Submit Ticket
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Support Live Chat Drawer ────────────────────────────── */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-[rgba(3,7,18,0.72)] backdrop-blur-xl z-[150] flex justify-end animate-in fade-in duration-300 overflow-hidden">
          {/* Backdrop Closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsChatOpen(false)} />

          <div 
            className="w-full sm:w-[460px] h-full bg-white border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 flex flex-col relative overflow-hidden animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-[11px] select-none"
                  style={{
                    background: chatAgent.avatar === 'AI' 
                      ? 'linear-gradient(135deg, #7C3AED 0%, #10B981 100%)' 
                      : 'linear-gradient(135deg, #4F46E5 0%, #9B5FFF 100%)',
                    boxShadow: '0 0 12px rgba(108, 99, 255, 0.2)'
                  }}
                >
                  {chatAgent.avatar === 'AI' ? 'AI' : 'RS'}
                </div>
                <div>
                  <h3 id="chat-title" className="text-sm font-bold text-slate-900 leading-tight">
                    {chatAgent.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-none">
                      {chatAgent.role}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsChatOpen(false)}
                className="w-8.5 h-8.5 rounded-full bg-slate-50 hover:bg-white/[0.07] border border-slate-200 hover:border-white/[0.12] text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all duration-300 hover:rotate-90 cursor-pointer focus:outline-none"
                title="Close Support Desk"
              >
                <X size={14} />
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 hidden-scrollbar bg-[#F8FAFC]/30 min-h-0">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div 
                      className={`p-4 rounded-[20px] text-xs leading-relaxed ${
                        isUser 
                          ? 'bg-[#1B4F8A] text-white rounded-tr-none shadow-md shadow-[#7C3AED]/10' 
                          : 'bg-[#F8FAFC] border border-slate-200 text-slate-800 rounded-tl-none shadow-inner'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-[#5B6478] font-bold mt-1.5 font-mono tracking-tight px-1">
                      {msg.time}
                    </span>
                  </div>
                );
              })}

              {/* Bot Typing Indicator */}
              {isBotTyping && (
                <div className="flex flex-col items-start mr-auto max-w-[80%]">
                  <div className="p-4 rounded-[20px] rounded-tl-none bg-[#F8FAFC] border border-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions / Suggested Chips */}
            <div className="px-6 py-3 border-t border-slate-100 space-y-2 bg-[#F8FAFC]/10 flex-shrink-0">
              <span className="text-[9.5px] font-black text-[#5B6478] uppercase tracking-wider block">Suggested Topics</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'GST Recon Discrepancy', query: 'I have a GST reconciliation error' },
                  { label: 'TDS Challan Mismatch', query: 'TDS mismatch on Form 26AS' },
                  { label: 'Talk to Live Accountant', query: 'I want to talk to a human live agent' },
                  { label: 'Seats & Licensing Query', query: 'Seat license and pricing' }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(chip.query)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#7C3AED]/30 bg-[#F8FAFC] hover:bg-slate-900/60 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-all cursor-pointer select-none"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-6 pb-9 border-t border-slate-200 bg-slate-50/50 flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Type your compliance question..."
                className="flex-1 h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#7C3AED]/40 focus:ring-1 focus:ring-[#7C3AED]/40 transition-all shadow-inner"
              />
              <button
                onClick={() => handleSendChatMessage()}
                className="h-11 px-5 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#7C3AED]/15 transition-all flex items-center justify-center cursor-pointer select-none"
              >
                Send
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Support Ticket Details Drawer ────────────────────────── */}
      {isTicketOpen && selectedTicket && (
        <div className="fixed inset-0 bg-[rgba(3,7,18,0.72)] backdrop-blur-xl z-[160] flex justify-end animate-in fade-in duration-300 overflow-hidden">
          {/* Backdrop Closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsTicketOpen(false)} />

          <div 
            className="w-full sm:w-[500px] h-full bg-white border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 flex flex-col relative overflow-hidden animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-title"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-xs text-[#4F46E5] bg-[#4F46E5]/10 border border-[#4F46E5]/20 px-2.5 py-1 rounded-lg">
                  {selectedTicket.id}
                </span>
                <span className={`status-badge ${getPriorityStyle(selectedTicket.priority)}`}>
                  {renderBadgeDot(selectedTicket.priority)}
                  {selectedTicket.priority} Priority
                </span>
                <span className={`status-badge ${getStatusStyle(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>

              <button 
                onClick={() => setIsTicketOpen(false)}
                className="w-8.5 h-8.5 rounded-full bg-slate-50 hover:bg-white/[0.07] border border-slate-200 hover:border-white/[0.12] text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all duration-300 hover:rotate-90 cursor-pointer focus:outline-none"
                title="Close Ticket Desk"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable details and timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 hidden-scrollbar bg-[#F8FAFC]/30 min-h-0">
              {/* Subject & Description */}
              <div className="space-y-3">
                <h3 id="ticket-title" className="text-lg font-black text-slate-900 leading-tight tracking-tight">
                  {selectedTicket.subject}
                </h3>
                <div className="text-xs text-slate-400 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 leading-relaxed font-sans shadow-inner">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Assignment details */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-[20px] p-4 flex items-center gap-3.5 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] font-black text-xs">
                  CA
                </div>
                <div>
                  <span className="text-[9.5px] font-black text-[#5B6478] uppercase tracking-wider block">Assigned CA Specialist</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{selectedTicket.agent || 'Awaiting Allocation'}</span>
                </div>
              </div>

              {/* Audit Timeline */}
              {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-[#5B6478] uppercase tracking-wider block">Filing Audit History</span>
                  
                  <div className="relative pl-6 border-l border-slate-200 space-y-5 py-1">
                    {selectedTicket.timeline.map((item: any, idx: number) => (
                      <div key={idx} className="relative">
                        {/* Glowing track node */}
                        <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-[#4F46E5] shadow-[0_0_6px_#4F46E5] border border-[#1A1D26]" />
                        
                        <div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-900">{item.event}</span>
                            <span className="font-mono text-[#5B6478] font-bold">{item.date}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 mt-1 font-sans leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion thread / replies */}
              <div className="space-y-4 pt-2">
                <span className="text-[10px] font-black text-[#5B6478] uppercase tracking-wider block">Resolutions & Communications</span>
                
                <div className="space-y-4">
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((reply: any, idx: number) => {
                      const isUser = reply.sender === 'user';
                      return (
                        <div key={idx} className={`flex flex-col max-w-[90%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          <div 
                            className={`p-4 rounded-[20px] text-xs leading-relaxed ${
                              isUser 
                                ? 'bg-[#1B4F8A] text-white rounded-tr-none shadow-md shadow-[#7C3AED]/10' 
                                : 'bg-[#F8FAFC] border border-slate-200 text-gray-200 rounded-tl-none shadow-inner'
                            }`}
                          >
                            {reply.text}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-[#5B6478] font-bold mt-1.5 font-mono tracking-tight px-1">
                            <span>{reply.sender === 'agent' ? selectedTicket.agent : 'You'}</span>
                            <span>•</span>
                            <span>{reply.date}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 bg-[#F8FAFC]/25 border border-dashed border-slate-200 rounded-2xl text-[11.5px] text-slate-500 font-sans italic">
                      No communications recorded. File is active under queue.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom reply field */}
            <div className="p-6 pb-9 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3 flex-shrink-0">
              <span className="text-[9.5px] font-black text-[#5B6478] uppercase tracking-wider block">Post Reply To Support Lead</span>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendTicketReply(); }}
                  placeholder="Type updates, challan logs, or messages..."
                  className="flex-1 h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5]/40 focus:ring-1 focus:ring-[#4F46E5]/40 transition-all shadow-inner"
                />
                <button
                  onClick={handleSendTicketReply}
                  className="h-11 px-5 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#4F46E5]/15 transition-all flex items-center justify-center cursor-pointer select-none"
                >
                  Post
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

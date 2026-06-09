"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Search, 
  BookOpen, 
  ArrowLeftRight, 
  ShieldCheck, 
  Bot, 
  X, 
  Send, 
  Paperclip
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export default function KnowledgeCenter() {
  const { showToast, ToastComponent } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat States
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatAgent, setChatAgent] = useState({ name: 'CA Co-Pilot (AI)', role: 'Compliance Assistant', avatar: 'AI' });

  // Ticket Expand State
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Form Fields
  const [category, setCategory] = useState('Technical Issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [file, setFile] = useState<File | null>(null);

  // Quick Search
  const [searchQuery, setSearchQuery] = useState('');

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<any[]>('/api/support/tickets');
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

  const sendBotReply = async (userQuery: string) => {
    setIsBotTyping(true);
    try {
      const data = await api.post<any>('/api/support/chat', { message: userQuery });
      
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
      showToast("Failed to fetch chat response.");
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
    if (!replyInput.trim() || !expandedTicketId) return;
    const selectedTicket = tickets.find(t => t.id === expandedTicketId);
    if (!selectedTicket) return;

    try {
      const updatedTicket = await api.post<any>(`/api/support/tickets/${selectedTicket.id}/replies`, {
        sender: 'user',
        text: replyInput,
        date: new Date().toLocaleString('en-GB').replace(',', '')
      });
      
      const formattedTicket = {
        ...updatedTicket,
        date: updatedTicket.created_at ? new Date(updatedTicket.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : updatedTicket.date || ''
      };

      setTickets(tickets.map(t => t.id === selectedTicket.id ? formattedTicket : t));
      setReplyInput('');
      showToast("✓ Reply submitted to support ticket.");
    } catch (err) {
      console.error(err);
      showToast("Failed to submit reply.");
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    try {
      const newTicket = await api.post<any>('/api/support/tickets', { category, subject, description, priority });
      const formatted = {
        ...newTicket,
        date: newTicket.created_at ? new Date(newTicket.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : newTicket.date || ''
      };

      setTickets([formatted, ...tickets]);
      
      // reset form
      setSubject('');
      setDescription('');
      setCategory('Technical Issue');
      setPriority('Medium');
      setFile(null);

      showToast(`✓ Support ticket ${formatted.id} created successfully!`);
    } catch (err) {
      console.error(err);
      showToast("Failed to submit support ticket.");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('open')) return 'bg-blue-100 text-blue-700 border border-blue-200';
    if (s.includes('progress') || s.includes('pending')) return 'bg-amber-100 text-amber-700 border border-amber-200';
    if (s.includes('resolved')) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const initChat = () => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'msg-1',
          sender: 'bot',
          text: "Hello! Welcome to Reckon AI Knowledge Center. I'm your CA Co-Pilot assistant. How can I help you today?",
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  useEffect(() => {
    initChat();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {ToastComponent}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-6 py-10">
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-[32px] font-bold text-slate-900 mb-3">How can we help?</h1>
            <p className="text-[15px] text-slate-500 mb-6">
              Search documentation, submit a ticket, or chat with our team.
            </p>
            {/* Search Bar */}
            <div className="relative max-w-[480px] mx-auto">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-800 focus:outline-none focus:border-[#1B4F8A] shadow-lg"
              />
            </div>
          </div>

          {/* Quick Links Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { icon: BookOpen, title: 'Getting Started', desc: 'New to Reckon AI?' },
              { icon: ArrowLeftRight, title: 'GST Reconciliation Guide', desc: 'Step-by-step instructions' },
              { icon: ShieldCheck, title: 'Compliance Setup', desc: 'Configure firm settings' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-[#1B4F8A] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-[#1B4F8A]">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-[12px] text-slate-500 ml-12">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Submit Ticket Section */}
          <div className="mb-10">
            <h2 className="text-[18px] font-bold text-slate-900 mb-5">Submit a Support Request</h2>
            <form onSubmit={handleSubmitTicket} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                >
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Billing">Billing</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="GST">GST</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your request"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                        priority === prio 
                          ? 'bg-[#1B4F8A] text-white' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A] min-h-[120px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700">Attach File</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 cursor-pointer hover:bg-slate-100 transition-all">
                    <Paperclip size={16} />
                    {file ? file.name : 'Choose file'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1B4F8A] hover:bg-[#0f3a66] text-white text-[13px] font-semibold rounded-lg transition-all"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>

          {/* Tickets Section */}
          <div className="mb-10">
            <h2 className="text-[18px] font-bold text-slate-900 mb-5">Your Tickets</h2>
            {isLoading ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {[1,2,3].map(i => (
                  <div key={i} className="px-6 py-4 border-b border-slate-100 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-24" />
                        <div className="h-3 bg-slate-200 rounded w-48" />
                      </div>
                      <div className="h-3 bg-slate-200 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-[13px] text-slate-500">No tickets yet. Submit your first request above.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Ticket #</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Created</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((tkt) => {
                      const isExpanded = expandedTicketId === tkt.id;
                      return (
                        <React.Fragment key={tkt.id}>
                          <tr
                            onClick={() => setExpandedTicketId(isExpanded ? null : tkt.id)}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4 text-[13px] font-mono text-slate-700">{tkt.id}</td>
                            <td className="px-6 py-4 text-[13px] text-slate-800 truncate max-w-[200px]">{tkt.subject}</td>
                            <td className="px-6 py-4 text-[13px] text-slate-700">{tkt.category}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[11px] font-semibold ${getStatusBadgeClass(tkt.status)}`}>
                                {tkt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[13px] text-slate-700">{formatDate(tkt.date)}</td>
                            <td className="px-6 py-4 text-[13px] text-slate-700">{formatDate(tkt.date)}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                                <div className="mb-4">
                                  <h4 className="text-[13px] font-semibold text-slate-900 mb-2">Description</h4>
                                  <p className="text-[13px] text-slate-700 bg-white border border-slate-200 rounded-lg p-3">{tkt.description}</p>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="text-[13px] font-semibold text-slate-900">Conversation</h4>
                                  {tkt.replies && tkt.replies.length > 0 ? (
                                    tkt.replies.map((reply: any, idx: number) => (
                                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[12px] font-semibold text-slate-800">{reply.sender === 'user' ? 'You' : 'Agent'}</span>
                                          <span className="text-[11px] text-slate-500">{reply.date}</span>
                                        </div>
                                        <p className="text-[13px] text-slate-700">{reply.text}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[13px] text-slate-500 bg-white border border-slate-200 rounded-lg p-3">No replies yet.</p>
                                  )}
                                  <div className="flex gap-2 mt-4">
                                    <input
                                      type="text"
                                      value={replyInput}
                                      onChange={(e) => setReplyInput(e.target.value)}
                                      placeholder="Type your reply..."
                                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                                    />
                                    <button
                                      onClick={handleSendTicketReply}
                                      className="px-4 py-2 bg-[#1B4F8A] hover:bg-[#0f3a66] text-white text-[13px] font-semibold rounded-lg"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Chat Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
                <Bot size={20} />
              </div>
              <h2 className="text-[18px] font-bold text-slate-900">Chat with AI Assistant</h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Chat Messages */}
              <div className="h-[300px] overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      {!isUser && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <Bot size={14} className="text-purple-700" />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">{chatAgent.name}</span>
                        </div>
                      )}
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        isUser 
                          ? 'bg-[#1B4F8A] text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}>
                        <p className="text-[13px]">{msg.text}</p>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">{msg.time}</span>
                    </div>
                  );
                })}
                {isBotTyping && (
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <Bot size={14} className="text-purple-700" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
              {/* Input Area */}
              <div className="p-4 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Type your question..."
                  className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:border-[#1B4F8A]"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  className="h-10 px-4 bg-[#1B4F8A] hover:bg-[#0f3a66] text-white rounded-xl flex items-center gap-1.5"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

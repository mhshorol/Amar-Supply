import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Search, Filter, MoreVertical, Paperclip, Image as ImageIcon, Smile, 
  Send, Phone, Video, Info, Tag, User, Clock, CheckCircle, Package, AlertCircle,
  Facebook, Instagram, MessageCircle, Globe, ChevronDown, Check, Briefcase, FileText
} from 'lucide-react';

// --- Type Definitions ---
type Platform = 'whatsapp' | 'messenger' | 'instagram' | 'website';
type Status = 'open' | 'pending' | 'resolved';
type Priority = 'low' | 'medium' | 'high';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  totalOrders: number;
  lifetimeValue: number;
  tags: string[];
}

interface Message {
  id: string;
  content: string;
  sender: 'agent' | 'customer' | 'bot';
  timestamp: string;
  type: 'text' | 'image' | 'file';
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  contact: Contact;
  platform: Platform;
  status: Status;
  priority: Priority;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  assignee?: string;
  messages: Message[];
}

// --- Mock Data ---
const mockConversations: Conversation[] = [];

const platformIcons = {
  whatsapp: <MessageCircle className="text-green-500" size={16} />,
  messenger: <Facebook className="text-brand" size={16} />,
  instagram: <Instagram className="text-pink-500" size={16} />,
  website: <Globe className="text-secondary" size={16} />
};

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);

  const activeConv = useMemo(() => conversations.find(c => c.id === activeConvId), [conversations, activeConvId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchSearch = c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [conversations, filterStatus, searchQuery]);

  const [showChannelSettings, setShowChannelSettings] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: replyText,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'sent'
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: replyText,
          lastMessageTime: newMessage.timestamp,
          messages: [...c.messages, newMessage]
        };
      }
      return c;
    }));
    setReplyText('');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-surface rounded-2xl shadow-subtle border border-border overflow-hidden text-sm relative">
      
      {/* Channel Settings Modal */}
      <AnimatePresence>
        {showChannelSettings && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6 outline-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                     <Globe size={20} />
                   </div>
                   <div>
                     <h3 className="text-base font-bold text-primary">Channel Integrations</h3>
                     <p className="text-xs text-secondary">Connect messaging APIs</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowChannelSettings(false)}
                  className="p-2 text-muted hover:text-secondary hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <AlertCircle size={20} className="rotate-45" /> {/* simple cross */}
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Facebook Messenger */}
                <div className="border border-border rounded-xl p-5 relative overflow-hidden group hover:border-blue-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand/100"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Facebook size={24} className="text-brand" />
                      <div>
                        <h4 className="font-bold text-primary">Facebook Messenger API</h4>
                        <p className="text-xs text-secondary">Connect Facebook Pages</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-hover text-secondary rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">Page Access Token</label>
                      <input type="password" placeholder="EAAI..." className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-brand focus:bg-surface outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">App Secret</label>
                      <input type="password" placeholder="••••••••••••••••" className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-brand focus:bg-surface outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

                {/* Instagram */}
                <div className="border border-border rounded-xl p-5 relative overflow-hidden group hover:border-pink-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Instagram size={24} className="text-pink-500" />
                      <div>
                        <h4 className="font-bold text-primary">Instagram Messaging API</h4>
                        <p className="text-xs text-secondary">Connect IG Professional Account</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-hover text-secondary rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">Access Token</label>
                      <input type="password" placeholder="IGQV..." className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-pink-500 focus:bg-surface outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="border border-border rounded-xl p-5 relative overflow-hidden group hover:border-green-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle size={24} className="text-green-500" />
                      <div>
                        <h4 className="font-bold text-primary">WhatsApp Business API</h4>
                        <p className="text-xs text-secondary">Official Cloud API</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-hover text-secondary rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">Phone Number ID</label>
                        <input type="text" placeholder="1023456789..." className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-green-500 focus:bg-surface outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">WABA ID</label>
                        <input type="text" placeholder="WhatsApp Business Account ID" className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-green-500 focus:bg-surface outline-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">Permanent Access Token</label>
                      <input type="password" placeholder="EAAL..." className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm focus:border-green-500 focus:bg-surface outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

              </div>
              <div className="p-4 border-t border-border bg-surface-hover flex justify-end shrink-0">
                <button onClick={() => setShowChannelSettings(false)} className="px-6 py-2 bg-gray-200 text-primary rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT PANEL: Conversation List */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-surface-hover/30">
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary text-lg flex items-center gap-2">
              <MessageSquare size={20} className="text-brand" />
              Unified Inbox
            </h2>
            <button 
              onClick={() => setShowChannelSettings(true)}
              className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
              title="Channel Integrations"
            >
              <Globe size={18} />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search messages..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'resolved'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterStatus === status 
                    ? 'bg-brand text-white shadow-premium shadow-brand/20' 
                    : 'bg-surface text-secondary border border-border hover:bg-surface-hover'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${
                activeConvId === conv.id 
                  ? 'bg-surface border-brand/20 shadow-subtle ring-1 ring-brand/20' 
                  : 'bg-transparent border-transparent hover:bg-surface hover:border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-primary line-clamp-1">
                  {conv.contact.name}
                  {conv.unreadCount > 0 && (
                    <span className="bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted whitespace-nowrap ml-2">
                  {conv.lastMessageTime}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary">
                {platformIcons[conv.platform]}
                <span className="line-clamp-1 truncate">{conv.lastMessage}</span>
              </div>
              <div className="mt-2 flex gap-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  conv.status === 'open' ? 'bg-green-100 text-green-700' :
                  conv.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  'bg-surface-hover text-secondary'
                }`}>
                  {conv.status}
                </span>
                {conv.priority === 'high' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-red-100 text-red-700">
                    High Priority
                  </span>
                )}
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="text-center py-10 text-muted text-sm">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL: Chat Window */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-surface min-w-0">
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="font-bold text-primary text-base flex items-center gap-2">
                  {activeConv.contact.name}
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Online"></div>
                </h3>
                <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                  {platformIcons[activeConv.platform]}
                  <span className="capitalize">{activeConv.platform}</span>
                  <span>•</span>
                  <span>Assignee: {activeConv.assignee || 'Unassigned'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={activeConv.status}
                onChange={() => {}}
                className="bg-surface-hover border border-border text-secondary text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
              <button className="p-2 text-muted hover:text-secondary hover:bg-surface-hover rounded-lg transition-colors">
                <Phone size={18} />
              </button>
              <button 
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-lg transition-colors ${showRightPanel ? 'bg-brand/10 text-brand' : 'text-muted hover:text-secondary hover:bg-surface-hover'}`}
              >
                <Info size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-hover/50">
            {activeConv.messages.map((msg, idx) => {
              const isAgent = msg.sender === 'agent' || msg.sender === 'bot';
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                    isAgent 
                      ? 'bg-brand text-white rounded-br-sm' 
                      : 'bg-surface border border-border text-primary shadow-subtle rounded-bl-sm'
                  }`}>
                    <p className="text-[13px] leading-relaxed break-words">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-muted font-medium">
                      {msg.sender === 'bot' ? 'Bot • ' : ''}{msg.timestamp}
                    </span>
                    {isAgent && msg.status && (
                      <Check size={12} className={msg.status === 'read' ? 'text-brand' : 'text-muted'} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="p-4 bg-surface border-t border-border">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1 relative flex items-center bg-surface-hover border border-border rounded-xl px-3 group focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all">
                <button type="button" className="p-1.5 text-muted hover:text-secondary transition-colors">
                  <Smile size={18} />
                </button>
                <button type="button" className="p-1.5 text-muted hover:text-secondary transition-colors">
                  <Paperclip size={18} />
                </button>
                <input 
                  type="text" 
                  placeholder="Type a message or type '/' for quick replies..." 
                  className="flex-1 px-3 py-3 bg-transparent border-none focus:outline-none text-[13px]"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={!replyText.trim()}
                className="w-12 h-[46px] flex items-center justify-center bg-brand text-white rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-surface-hover">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-primary font-bold text-lg">No Conversation Selected</h3>
            <p className="text-secondary mt-1">Select a conversation from the left to start chatting.</p>
          </div>
        </div>
      )}

      {/* RIGHT PANEL: Customer Details */}
      <AnimatePresence>
        {activeConv && showRightPanel && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-l border-border bg-surface overflow-y-auto"
          >
            <div className="p-6 text-center border-b border-border">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 text-brand mx-auto flex items-center justify-center text-2xl font-bold mb-3 border border-blue-200 font-serif">
                {activeConv.contact.name.charAt(0)}
              </div>
              <h3 className="font-bold text-primary text-base">{activeConv.contact.name}</h3>
              <p className="text-xs text-secondary mt-1 flex items-center justify-center gap-1">
                <Clock size={12} /> Customer since 2023
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Contact Info</h4>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-sm">
                      <Phone size={14} className="text-muted" />
                      <span className="text-secondary">{activeConv.contact.phone}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm">
                      <FileText size={14} className="text-muted" />
                      <span className="text-secondary">{activeConv.contact.email}</span>
                   </div>
                </div>
              </div>

              {/* Ecommerce Stats */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Order History</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-hover rounded-xl border border-border text-center">
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-1">Total Orders</p>
                    <p className="text-lg font-black text-brand">{activeConv.contact.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-surface-hover rounded-xl border border-border text-center">
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-1">LTV (BDT)</p>
                    <p className="text-lg font-black text-green-600">৳{activeConv.contact.lifetimeValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center justify-between">
                  Tags
                  <button className="text-brand hover:underline text-[10px]">Edit</button>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeConv.contact.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-surface-hover text-secondary rounded text-xs font-medium border border-border">
                      {tag}
                    </span>
                  ))}
                  <button className="px-2 py-1 border border-dashed border-border text-muted rounded text-xs hover:border-brand hover:text-brand transition-colors">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase size={14} /> Internal Notes
                </h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <textarea 
                    className="w-full bg-transparent border-none focus:outline-none text-xs text-yellow-800 placeholder-yellow-600/50 resize-none h-20"
                    placeholder="Add a private note for your team..."
                  ></textarea>
                  <div className="flex justify-end mt-2">
                    <button className="text-[10px] font-bold text-yellow-700 bg-yellow-200/50 px-2.5 py-1.5 rounded hover:bg-yellow-200 transition-colors">
                      Save Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

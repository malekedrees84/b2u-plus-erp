
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ChatMessage, ProductionRequest, UserRole } from '../types';
import { X, Search, Send, Paperclip, MessageSquare, CheckCheck, File, Briefcase, ArrowRight, Users, Mic, MicOff, Image as ImageIcon } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface TeamChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  onMarkRead: (ids: string[]) => void;
  requests: ProductionRequest[];
  onOpenRequest: (req: ProductionRequest) => void;
}

const TeamChatPanel: React.FC<TeamChatPanelProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  users = [], 
  messages = [], 
  onSendMessage, 
  onMarkRead, 
  requests = [], 
  onOpenRequest 
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // null = Public Channel
  const [searchText, setSearchText] = useState('');
  const [text, setText] = useState('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe Filter contacts & Privacy Rule
  const contacts = useMemo(() => {
      if (!Array.isArray(users)) return [];
      return users.filter(u => {
          if (!u || !u.id || u.id === currentUser?.id) return false;
          // Hide Admin from non-admins
          if (u.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) return false;
          // Search logic
          return u.name && u.name.toLowerCase().includes(searchText.toLowerCase());
      });
  }, [users, currentUser?.id, searchText, currentUser?.role]);

  // Safe Find selected user
  const selectedUser = useMemo(() => {
      if (!users || !selectedUserId) return null;
      return users.find(u => u && u.id === selectedUserId);
  }, [users, selectedUserId]);

  // Safe Filter messages for current view
  const currentMessages = useMemo(() => {
      if (!Array.isArray(messages)) return [];
      return messages.filter(m => 
          m && m.id && (
          (selectedUserId === null && (m.receiverId === 'all' || !m.receiverId)) || 
          (selectedUserId && (
              (m.senderId === currentUser?.id && m.receiverId === selectedUserId) || 
              (m.senderId === selectedUserId && m.receiverId === currentUser?.id)
          )))
      );
  }, [messages, selectedUserId, currentUser?.id]);

  useEffect(() => {
      if (isOpen && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      if (isOpen && currentUser?.id) {
          const unreadIds = currentMessages
            .filter(m => m && !m.read && m.receiverId === currentUser.id)
            .map(m => m.id);
          if (unreadIds.length > 0) onMarkRead(unreadIds);
      }
  }, [isOpen, currentMessages.length, selectedUserId, currentUser?.id]);

  const send = (type: 'text' | 'image' | 'file' | 'audio' | 'task', payload?: any) => {
      if (!currentUser?.id) return;
      if (type === 'text' && !text.trim()) return;
      
      const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          receiverId: selectedUserId || 'all',
          timestamp: new Date().toISOString(),
          read: false,
          text: type === 'text' ? text : (payload?.text || undefined),
          ...payload
      };
      onSendMessage(msg);
      setText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (file.type.startsWith('image/')) {
              send('image', { image: dataUrl });
          } else {
              send('file', { fileUrl: dataUrl, fileName: file.name });
          }
      };
      reader.readAsDataURL(file);
  };

  const handleTaskShare = (task: ProductionRequest) => {
      send('task', { 
          taskId: task.id, 
          taskTitle: task.title, 
          taskStatus: task.status,
          text: `قام بمشاركة المهمة: ${task.title}` 
      });
      setShowTaskSelector(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-charcoal-900 h-full shadow-2xl flex animate-slide-in-right overflow-hidden rounded-l-[30px] border-l border-white/5">
        
        {/* Task Selector Modal (Overlay inside Panel) */}
        {showTaskSelector && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-charcoal-900 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[70%] animate-slide-up">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm">اختر مهمة للمشاركة</h3>
                        <button onClick={() => setShowTaskSelector(false)} className="text-zinc-500 hover:text-white"><X size={18}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {requests.filter(r => r).map(req => (
                            <button key={req.id} onClick={() => handleTaskShare(req)} className="w-full p-3 rounded-xl bg-charcoal-800 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors group text-right">
                                <div className="min-w-0">
                                    <h4 className="text-white text-xs font-bold group-hover:text-primary transition-colors truncate max-w-[200px]">{req.title}</h4>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                                </div>
                                <ArrowRight size={14} className="text-zinc-600 group-hover:text-white shrink-0" />
                            </button>
                        ))}
                        {requests.length === 0 && <p className="text-center text-zinc-500 text-xs py-4">لا توجد مهام متاحة</p>}
                    </div>
                </div>
            </div>
        )}

        {/* Sidebar: Contacts */}
        <div className="w-80 bg-charcoal-950 border-l border-white/5 flex flex-col shrink-0 hidden md:flex">
            <div className="p-6 border-b border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white">المحادثات</h2>
                    <button onClick={onClose} className="md:hidden text-zinc-500"><X size={24}/></button>
                </div>
                <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-zinc-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="بحث..." 
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="w-full bg-charcoal-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-xs text-white focus:border-primary outline-none" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Public Channel */}
                <button 
                    onClick={() => setSelectedUserId(null)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all border-r-4 ${selectedUserId === null ? 'bg-white/5 border-primary' : 'border-transparent'}`}
                >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <MessageSquare size={20} />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                        <div className="font-bold text-white text-sm">المحادثة العامة</div>
                        <div className="text-[10px] text-zinc-500">للجميع</div>
                    </div>
                </button>

                {contacts.map(user => {
                    if (!user || !user.id) return null; // Extra safety
                    const unread = Array.isArray(messages) 
                        ? messages.filter(m => m && !m.read && m.senderId === user.id && m.receiverId === currentUser?.id).length
                        : 0;
                        
                    return (
                        <button 
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all border-r-4 ${selectedUserId === user.id ? 'bg-white/5 border-primary' : 'border-transparent'}`}
                        >
                            <div className="relative shrink-0">
                                <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt={user.name} />
                                <div className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border-2 border-charcoal-950 ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></div>
                            </div>
                            <div className="text-right flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <div className="font-bold text-white text-sm truncate">{user.name}</div>
                                    {unread > 0 && <span className="bg-primary text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{unread}</span>}
                                </div>
                                <div className="text-[10px] text-zinc-500 truncate">{user.role}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-charcoal-900 relative min-w-0">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-charcoal-900 shrink-0">
                <div className="flex items-center gap-3">
                    {selectedUser ? (
                        <>
                            <img src={selectedUser.avatar} className="w-10 h-10 rounded-xl" alt={selectedUser.name} />
                            <div>
                                <h3 className="text-white font-bold text-sm">{selectedUser.name}</h3>
                                <span className="text-[10px] text-emerald-500 font-bold">{selectedUser.status === 'Active' ? 'متصل الآن' : 'غير متصل'}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Users size={20}/></div>
                            <div>
                                <h3 className="text-white font-bold text-sm">الفريق العام</h3>
                                <span className="text-[10px] text-zinc-500 font-bold">{Array.isArray(users) ? users.length : 0} أعضاء</span>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"><X size={20}/></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-charcoal-900">
                {currentMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                        <MessageSquare size={48} className="mb-4" />
                        <p className="text-sm font-bold">ابدأ المحادثة الآن</p>
                    </div>
                ) : (
                    currentMessages.map(m => {
                        if (!m) return null;
                        const isMe = m.senderId === currentUser?.id;
                        const sender = Array.isArray(users) ? users.find(u => u && u.id === m.senderId) : null;
                        
                        return (
                            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && selectedUserId === null && <span className="text-[9px] text-zinc-500 mb-1 px-1">{sender?.name || 'Unknown'}</span>}
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-primary text-black rounded-tr-none' : 'bg-charcoal-800 text-white rounded-tl-none border border-white/5'}`}>
                                    {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                                    {m.image && <img src={m.image} className="rounded-lg max-h-60 w-full object-cover mb-2" alt="attachment" />}
                                    {m.fileUrl && (
                                        <a href={m.fileUrl} download={m.fileName || 'file'} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg hover:bg-black/30 transition-all">
                                            <File size={16}/> <span className="text-xs">{m.fileName || 'ملف مرفق'}</span>
                                        </a>
                                    )}
                                    {m.taskId && (
                                        <div 
                                            onClick={() => { 
                                                const req = Array.isArray(requests) ? requests.find(r => r && r.id === m.taskId) : null; 
                                                if(req) onOpenRequest(req); 
                                            }}
                                            className="bg-black/20 p-3 rounded-xl cursor-pointer hover:bg-black/30 transition-all border border-black/10 mt-1"
                                        >
                                            <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-black uppercase"><Briefcase size={10}/> مهمة</div>
                                            <div className="font-bold text-xs">{m.taskTitle}</div>
                                            <div className="text-[9px] opacity-70 mt-1">{m.taskStatus}</div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                                        <span className="text-[9px] font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                        {isMe && <CheckCheck size={12} className={m.read ? 'text-blue-500' : 'text-black/50'} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-charcoal-950 border-t border-white/5">
                <div className="flex items-center gap-2 bg-charcoal-900 p-2 rounded-2xl border border-white/5">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"><Paperclip size={18}/></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    
                    <button 
                        onClick={() => setShowTaskSelector(true)} 
                        className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                        title="مشاركة مهمة"
                    >
                        <Briefcase size={18}/>
                    </button>

                    <input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && send('text')}
                        placeholder="اكتب رسالة..." 
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm" 
                    />
                    <button 
                        onClick={() => send('text')} 
                        disabled={!text.trim()}
                        className="p-2 bg-primary text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TeamChatPanel;


import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ChatMessage, ProductionRequest } from '../types';
import { Search, MessageSquare, Paperclip, Mic, MicOff, Send, Play, File, CheckCheck, MoreVertical, Phone, Video, ArrowRight, Briefcase, ScreenShare, X } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface MessagesPageProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  onMarkRead: (ids: string[]) => void;
  initialSelectedUserId?: string | null;
  requests: ProductionRequest[];
  onOpenRequest: (req: ProductionRequest) => void;
}

const MessagesPage: React.FC<MessagesPageProps> = ({ currentUser, users, messages, onSendMessage, onMarkRead, initialSelectedUserId, requests, onOpenRequest }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
  const [searchText, setSearchText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | 'screen' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSelectedUserId) setSelectedUserId(initialSelectedUserId);
  }, [initialSelectedUserId]);

  const selectedUser = useMemo(() => users.find(u => u && u.id === selectedUserId), [selectedUserId, users]);

  const sortedContacts = useMemo(() => {
    // Safe filter: Check if user exists before accessing properties
    let contacts = users.filter(u => 
        u && 
        u.id &&
        u.id !== currentUser.id && 
        u.name && 
        u.name.toLowerCase().includes(searchText.toLowerCase())
    );

    return contacts.sort((a, b) => {
        const lastMsgA = [...messages].reverse().find(m => 
            m && (
            (m.senderId === a.id && m.receiverId === currentUser.id) || 
            (m.senderId === currentUser.id && m.receiverId === a.id)
            )
        );
        const lastMsgB = [...messages].reverse().find(m => 
            m && (
            (m.senderId === b.id && m.receiverId === currentUser.id) || 
            (m.senderId === currentUser.id && m.receiverId === b.id)
            )
        );

        const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
        const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;
        
        return timeB - timeA;
    });
  }, [users, messages, currentUser.id, searchText]);

  // Safe filter: Check if message exists
  const currentChatMessages = messages.filter(m => 
    m && (
    (selectedUserId && (
      (m.senderId === currentUser.id && m.receiverId === selectedUserId) || 
      (m.senderId === selectedUserId && m.receiverId === currentUser.id)
    )) || (!selectedUserId && (m.receiverId === 'all' || !m.receiverId))
    )
  );

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (selectedUserId) {
      const unreadIds = currentChatMessages.filter(m => m && !m.read && m.receiverId === currentUser.id).map(m => m.id);
      if (unreadIds.length > 0) onMarkRead(unreadIds);
    }
  }, [currentChatMessages.length, selectedUserId]);

  const handleSend = (type: 'text' | 'image' | 'file' | 'audio' | 'task', payload?: any) => {
    if (type === 'text' && !inputText.trim()) return;
    
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: selectedUserId || 'all',
      timestamp: new Date().toISOString(),
      read: false,
      text: type === 'text' ? inputText : undefined,
      ...payload
    };

    onSendMessage(msg);
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (file.type.startsWith('image/')) {
        handleSend('image', { image: dataUrl });
      } else {
        handleSend('file', { fileUrl: dataUrl, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTaskShare = (task: ProductionRequest) => {
      handleSend('task', { 
          taskId: task.id, 
          taskTitle: task.title, 
          taskStatus: task.status,
          text: `قام بمشاركة المهمة: ${task.title}` 
      });
      setShowTaskSelector(false);
  };

  const startCall = (type: 'video' | 'audio' | 'screen') => {
      setCallType(type);
      setIsCalling(true);
      // Mock call timeout
      setTimeout(() => setIsCalling(false), 5000); 
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: any[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        handleSend('audio', { audioUrl: url });
      };
      mediaRecorder.start();
      setIsRecording(true);
      (window as any)._recorder = mediaRecorder;
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if ((window as any)._recorder) {
      (window as any)._recorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-full bg-charcoal-950 animate-fade-in overflow-hidden relative">
      
      {/* Sidebar Contacts List */}
      <div className={`${selectedUserId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-l border-white/5 flex-col bg-charcoal-900 shrink-0`}>
        <div className="p-4 md:p-6 border-b border-white/5">
          <h2 className="text-xl md:text-2xl font-black text-white mb-4 md:mb-6 tracking-tight">المحادثات</h2>
          <div className="relative">
            <Search className="absolute right-3 top-3 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث عن زميل..." 
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full bg-charcoal-800 border border-white/5 rounded-xl py-2 md:py-2.5 pr-10 pl-4 text-[11px] md:text-xs text-white focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => setSelectedUserId(null)}
            className={`w-full p-4 flex items-center gap-3 md:gap-4 hover:bg-white/5 transition-all border-r-4 ${selectedUserId === null ? 'bg-primary/5 border-primary' : 'border-transparent'}`}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MessageSquare size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="text-right flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5 md:mb-1">
                <span className="text-xs md:text-sm font-black text-white">المحادثة العامة</span>
                <span className="text-[9px] md:text-[10px] text-zinc-600 font-mono">نشط</span>
              </div>
              <p className="text-[10px] md:text-xs text-zinc-500 truncate">تواصل مع الفريق بالكامل</p>
            </div>
          </button>

          {sortedContacts.map(user => {
            if (!user) return null;
            const lastMsg = [...messages].reverse().find(m => 
              m && (
              (m.senderId === user.id && m.receiverId === currentUser.id) || 
              (m.senderId === currentUser.id && m.receiverId === user.id)
              )
            );
            const unreadCount = messages.filter(m => m && !m.read && m.senderId === user.id && m.receiverId === currentUser.id).length;

            return (
              <button 
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full p-4 flex items-center gap-3 md:gap-4 hover:bg-white/5 transition-all border-r-4 relative ${selectedUserId === user.id ? 'bg-white/5 border-primary' : 'border-transparent'}`}
              >
                <div className="relative shrink-0">
                  <img src={user.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover border border-white/5 shadow-sm" alt={user.name} />
                  <div className={`absolute -bottom-1 -left-1 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-2 border-charcoal-900 ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                </div>
                <div className="text-right flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5 md:mb-1">
                    <span className="text-xs md:text-sm font-black text-white truncate">{user.name}</span>
                    <span className="text-[8px] md:text-[9px] text-zinc-600 font-mono">
                      {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-[10px] md:text-xs truncate flex-1 ${unreadCount > 0 ? 'text-white font-bold' : 'text-zinc-500'}`}>{lastMsg?.text || (lastMsg?.taskId ? 'قام بمشاركة مهمة' : '') || lastMsg?.fileName || 'لا توجد رسائل سابقة'}</p>
                    {unreadCount > 0 && <span className="bg-primary text-black text-[9px] md:text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center mr-2 animate-pulse">{unreadCount}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${selectedUserId === null ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col bg-charcoal-950 shadow-inner relative h-full`}>
        
        {/* Mock Call Overlay */}
        {isCalling && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                <div className="w-32 h-32 rounded-full border-4 border-primary/30 p-2 animate-pulse mb-8">
                    <img src={selectedUser?.avatar || currentUser.avatar} className="w-full h-full rounded-full object-cover" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">{callType === 'screen' ? 'مشاركة الشاشة...' : 'جاري الاتصال...'}</h2>
                <p className="text-zinc-400 mb-12">يرجى الانتظار لحين رد الطرف الآخر</p>
                <button onClick={() => setIsCalling(false)} className="bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                    إلغاء المكالمة
                </button>
            </div>
        )}

        {/* Task Selector Modal */}
        {showTaskSelector && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                <div className="bg-charcoal-900 w-full max-w-md rounded-2xl border border-white/5 shadow-2xl flex flex-col max-h-[70vh] animate-slide-up">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-bold">اختر مهمة للمشاركة</h3>
                        <button onClick={() => setShowTaskSelector(false)}><X size={20} className="text-zinc-500"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {requests.filter(r => r).map(req => (
                            <button key={req.id} onClick={() => handleTaskShare(req)} className="w-full p-3 rounded-xl bg-charcoal-800 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors group text-right">
                                <div>
                                    <h4 className="text-white text-sm font-bold group-hover:text-primary transition-colors">{req.title}</h4>
                                    <span className={`text-[10px] ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                                </div>
                                <ArrowRight size={16} className="text-zinc-600 group-hover:text-white" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Chat Header */}
        <div className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-charcoal-900/40 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setSelectedUserId(null)}
              className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-white"
            >
              <ArrowRight size={20} />
            </button>

            {selectedUser ? (
              <>
                <img src={selectedUser.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-white/5" />
                <div>
                  <h3 className="text-white font-black text-xs md:text-sm truncate max-w-[120px] sm:max-w-none">{selectedUser.name}</h3>
                  <span className="text-[8px] md:text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{selectedUser.status === 'Active' ? 'نشط الآن' : 'غير متصل'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center text-primary"><MessageSquare size={16} className="md:w-[20px] md:h-[20px]"/></div>
                <div>
                  <h3 className="text-white font-black text-xs md:text-sm">المحادثة العامة للفريق</h3>
                  <span className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{users ? users.length : 0} عضو</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => startCall('audio')} title="مكالمة صوتية" className="p-2 md:p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all"><Phone size={16} className="md:w-[18px] md:h-[18px]" /></button>
            <button onClick={() => startCall('video')} title="مكالمة فيديو" className="p-2 md:p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all hidden sm:block"><Video size={16} className="md:w-[18px] md:h-[18px]" /></button>
            <button onClick={() => startCall('screen')} title="مشاركة الشاشة" className="p-2 md:p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all hidden sm:block"><ScreenShare size={16} className="md:w-[18px] md:h-[18px]" /></button>
            <div className="w-px h-5 md:h-6 bg-white/5 mx-1 md:mx-2"></div>
            <button className="p-2 md:p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg md:rounded-xl transition-all"><MoreVertical size={16} className="md:w-[18px] md:h-[18px]" /></button>
          </div>
        </div>

        {/* Messages List - Clean Solid Background */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 custom-scrollbar bg-charcoal-950">
          {currentChatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-40">
                <MessageSquare size={48} className="mb-4" />
                <p className="text-sm font-bold">لا توجد رسائل هنا بعد</p>
            </div>
          ) : currentChatMessages.map((m, idx) => {
            if (!m) return null;
            const isMe = m.senderId === currentUser.id;
            const sender = users.find(u => u && u.id === m.senderId);
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && !selectedUserId && <span className="text-[9px] md:text-[10px] font-black text-zinc-500 mb-0.5 md:mb-1 px-2 md:px-4">{sender?.name || 'Unknown'}</span>}
                <div className={`max-w-[85%] md:max-w-[70%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border ${isMe ? 'bg-primary/10 text-blue-100 rounded-tl-none border-primary/20' : 'bg-charcoal-900 text-zinc-300 rounded-tr-none border-white/5'}`}>
                    
                    {/* Render Task Card inside Chat */}
                    {m.taskId ? (
                        <div 
                            onClick={() => { const req = requests.find(r => r && r.id === m.taskId); if(req) onOpenRequest(req); }}
                            className="bg-charcoal-950/50 p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-black/30 transition-all shadow-lg group relative overflow-hidden min-w-[200px]"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                            <div className="flex items-center gap-2 mb-2 opacity-70">
                                <Briefcase size={12} className="text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">مهمة مشتركة</span>
                            </div>
                            <h4 className="text-sm font-black text-white mb-2 leading-tight">{m.taskTitle}</h4>
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] px-2 py-1 rounded-md font-bold ${STATUS_COLORS[m.taskStatus || 'CREATED']}`}>{m.taskStatus}</span>
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                                    <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Render plain text if not a task card
                        m.text && <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    )}
                    
                    {m.image && <img src={m.image} className="rounded-lg md:rounded-xl max-h-48 md:max-h-64 w-full object-cover mb-2 border border-white/5 shadow-md" />}
                    {m.fileUrl && (
                      <a href={m.fileUrl} download={m.fileName} className="flex items-center gap-2 md:gap-3 bg-black/10 p-2 md:p-3 rounded-lg md:rounded-xl border border-white/5 hover:bg-black/20 transition-all">
                        <File size={16} className="text-primary md:w-[20px] md:h-[20px]" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[9px] md:text-[10px] font-bold text-white truncate max-w-[120px] md:max-w-[180px]">{m.fileName}</span>
                          <span className="text-[7px] md:text-[8px] text-zinc-500 uppercase font-black">تحميل</span>
                        </div>
                      </a>
                    )}
                    {m.audioUrl && (
                      <div className="flex items-center gap-2 md:gap-3 bg-black/10 p-2 rounded-lg md:rounded-xl min-w-[150px] md:min-w-[200px]">
                        <button onClick={() => new Audio(m.audioUrl).play()} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:scale-105 transition-transform">
                          <Play size={12} fill="currentColor" className="md:w-[16px] md:h-[16px]" />
                        </button>
                        <div className="flex-1 flex flex-col gap-0.5 md:gap-1">
                           <div className="h-1 bg-white/5 rounded-full relative overflow-hidden"><div className="absolute inset-0 bg-primary/40 w-1/3"></div></div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5 md:mt-2 gap-4">
                      <span className="text-[8px] md:text-[9px] opacity-40 font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && <CheckCheck size={10} className={`md:w-[12px] md:h-[12px] ${m.read ? 'text-primary' : 'text-zinc-600'}`} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Control Area - Solid Background */}
        <div className="p-4 md:p-8 bg-charcoal-900 border-t border-white/5 backdrop-blur-md shrink-0">
          <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-4">
            <div className="flex-1 bg-charcoal-800 rounded-2xl md:rounded-3xl border border-white/5 p-1.5 md:p-2 flex items-end group focus-within:border-primary/20 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 md:p-3 text-zinc-500 hover:text-primary transition-colors"
                title="إرفاق ملف"
              >
                <Paperclip size={18} className="md:w-[20px] md:h-[20px]" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              
              <button 
                onClick={() => setShowTaskSelector(true)} 
                className="p-2 md:p-3 text-zinc-500 hover:text-primary transition-colors hidden sm:block"
                title="مشاركة مهمة"
              >
                <Briefcase size={18} className="md:w-[20px] md:h-[20px]" />
              </button>

              <textarea 
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend('text'); } }}
                placeholder="اكتب رسالة مهنية..."
                className="flex-1 bg-transparent border-none outline-none text-white text-[12px] md:text-sm py-2.5 md:py-3 px-1 md:px-2 resize-none max-h-32 custom-scrollbar"
              />

              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                className={`p-2 md:p-3 rounded-full transition-all ${isRecording ? 'text-red-500 bg-red-500/10 scale-125 animate-pulse' : 'text-zinc-500 hover:text-white'}`}
              >
                {isRecording ? <MicOff size={18} className="md:w-[20px] md:h-[20px]" /> : <Mic size={18} className="md:w-[20px] md:h-[20px]" />}
              </button>
            </div>

            <button 
              onClick={() => handleSend('text')}
              disabled={!inputText.trim() && !isRecording}
              className="bg-primary text-black w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={18} className="md:w-[22px] md:h-[22px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;

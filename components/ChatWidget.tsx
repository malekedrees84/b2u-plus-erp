
import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage, ProductionRequest } from '../types';
import { MessageSquare, X, Send, Paperclip, Mic, MicOff, Play, File, Image as ImageIcon, CheckCheck, Trash2, Volume2, Briefcase, ArrowRight } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface ChatWidgetProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  onMarkRead: (ids: string[]) => void;
  requests?: ProductionRequest[];
  onOpenRequest?: (req: ProductionRequest) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser, users, messages, onSendMessage, onMarkRead, requests, onOpenRequest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
        const unreadIds = messages.filter(m => m && !m.read && m.receiverId === currentUser.id).map(m => m.id);
        if (unreadIds.length > 0) onMarkRead(unreadIds);
    }
  }, [isOpen, messages, currentUser.id]);

  const send = (type: 'text' | 'image' | 'file' | 'audio', payload?: any) => {
      const msg: ChatMessage = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId: selectedUser?.id || 'all',
          timestamp: new Date().toISOString(),
          read: false,
          ...payload
      };
      if (type === 'text' && text.trim()) msg.text = text;
      
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

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = e => chunks.push(e.data);
          mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
              const url = URL.createObjectURL(blob);
              send('audio', { audioUrl: url });
          };
          mediaRecorder.start();
          setIsRecording(true);
          setTimeout(() => { if(mediaRecorder.state === 'recording') { mediaRecorder.stop(); setIsRecording(false); } }, 30000); 
          (window as any)._recorder = mediaRecorder;
      } catch (err) { console.error("Mic error:", err); }
  };

  const stopRecording = () => {
      if((window as any)._recorder) {
          (window as any)._recorder.stop();
          setIsRecording(false);
      }
  };

  const filteredMessages = messages.filter(m => 
      m && (
      (m.receiverId === 'all' && !selectedUser) || 
      (selectedUser && (
          (m.senderId === currentUser.id && m.receiverId === selectedUser.id) || 
          (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
      )))
  );

  if(!isOpen) return (
      <button 
        onClick={() => setIsOpen(true)} 
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary rounded-[24px] flex items-center justify-center text-black shadow-2xl hover:scale-110 active:scale-95 transition-all z-[250] group"
      >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <MessageSquare className="relative z-10" />
          {messages.filter(m => m && !m.read && m.receiverId === currentUser.id).length > 0 && (
              <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-charcoal-950 animate-bounce">
                  {messages.filter(m => m && !m.read && m.receiverId === currentUser.id).length}
              </span>
          )}
      </button>
  );

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-[400px] h-[650px] bg-charcoal-900 border border-white/5 rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-slide-up z-[250] backdrop-blur-3xl">
        {/* Header */}
        <div className="p-6 bg-charcoal-950/80 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-tighter">مركز المراسلة</h4>
                    <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> متصل الآن
                    </span>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"><X size={20} /></button>
        </div>

        {/* User Selection Bar */}
        <div className="px-4 py-3 bg-charcoal-950/40 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
             <button onClick={() => setSelectedUser(null)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${!selectedUser ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>المحادثة العامة</button>
             {users.filter(u => u && u.id !== currentUser.id).map(u => (
                 <button key={u.id} onClick={() => setSelectedUser(u)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedUser?.id === u.id ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
                     <img src={u.avatar} className="w-4 h-4 rounded-full" /> {u.name.split(' ')[0]}
                 </button>
             ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-charcoal-900/50">
            {filteredMessages.map(m => (
                <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${m.senderId === currentUser.id ? 'bg-primary/20 text-blue-100 rounded-tl-none border border-primary/10' : 'bg-charcoal-800 text-zinc-300 rounded-tr-none border border-white/5'}`}>
                        
                        {/* Render Task Card inside Widget */}
                        {m.taskId ? (
                            <div 
                                onClick={() => { 
                                    const req = requests?.find(r => r && r.id === m.taskId); 
                                    if(req && onOpenRequest) {
                                        onOpenRequest(req);
                                        setIsOpen(false); // Close chat to show the modal clearly
                                    }
                                }}
                                className="bg-charcoal-950/50 p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-black/30 transition-all shadow-lg group relative overflow-hidden"
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
                            // Only render text if not a task card (to avoid duplicate "Shared task..." text)
                            m.text && <p>{m.text}</p>
                        )}

                        {m.image && <img src={m.image} className="rounded-2xl max-h-48 w-full object-cover mb-2 border border-white/10" />}
                        {m.fileUrl && (
                            <a href={m.fileUrl} download={m.fileName} className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 hover:bg-black/40 transition-all">
                                <File size={20} className="text-primary" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{m.fileName}</span>
                                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest">تحميل الملف</span>
                                </div>
                            </a>
                        )}
                        {m.audioUrl && (
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl min-w-[160px]">
                                <button className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-primary" onClick={() => { const a = new Audio(m.audioUrl); a.play(); }}><Play size={14} fill="currentColor" /></button>
                                <div className="h-1 flex-1 bg-white/10 rounded-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-primary"></div>
                                </div>
                                <Volume2 size={12} className="text-zinc-600" />
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-4">
                            <span className="text-[9px] opacity-40 font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                            {m.senderId === currentUser.id && <CheckCheck size={12} className={m.read ? 'text-primary' : 'text-zinc-600'} />}
                        </div>
                    </div>
                    <span className="text-[8px] font-bold text-zinc-600 mt-1 uppercase tracking-widest px-2">
                        {users.find(u => u && u.id === m.senderId)?.name.split(' ')[0]}
                    </span>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-charcoal-950 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 bg-charcoal-900 rounded-2xl border border-white/5 p-2 pr-4 shadow-inner">
                <input 
                    type="text" 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && send('text')}
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2" 
                    placeholder="اكتب رسالة..." 
                />
                <div className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-white"><Paperclip size={18} /></button>
                    <button 
                        onMouseDown={startRecording} 
                        onMouseUp={stopRecording}
                        className={`p-2 rounded-xl transition-all ${isRecording ? 'text-red-500 bg-red-500/10 scale-125' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                </div>
            </div>
            <button 
                onClick={() => send('text')} 
                disabled={!text.trim() && !isRecording}
                className="w-full bg-primary text-black py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] shadow-xl shadow-primary/20 disabled:opacity-50 transition-all"
            >
                إرسال الرسالة <Send size={16} />
            </button>
        </div>
    </div>
  );
};
export default ChatWidget;


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, ProductionRequest, Client, RequestStatus, ChatMessage, Transaction, AppNotification } from '../types';
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, Search, FileText, Image as ImageIcon, DownloadCloud, MessageSquare, Send, X, LogOut, Check, ChevronRight, PenTool, Headphones, Paperclip, CheckCheck, Play, ArrowRight, ShieldCheck, Wallet, Settings, Bell, Lock, Mail, Phone, Download } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface ClientPortalProps {
  currentUser: User;
  clientData: Client | undefined;
  requests: ProductionRequest[];
  onUpdateRequest: (req: ProductionRequest) => void;
  onLogout: () => void;
  onSendMessage?: (msg: ChatMessage) => void;
  messages?: ChatMessage[];
  transactions?: Transaction[]; // Added for invoices
  notifications?: AppNotification[]; // Added for alerts
  onUpdateClient?: (client: Client) => void; // For updating client info
  onUpdateUser?: (user: User) => void; // For updating login info
}

const ClientPortal: React.FC<ClientPortalProps> = ({ 
    currentUser, 
    clientData, 
    requests, 
    onUpdateRequest, 
    onLogout, 
    onSendMessage, 
    messages = [], 
    transactions = [], 
    notifications = [],
    onUpdateClient,
    onUpdateUser
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'support' | 'invoices' | 'settings'>('active');
  const [selectedRequest, setSelectedRequest] = useState<ProductionRequest | null>(null);
  const [comment, setComment] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
      password: '',
      email: currentUser.email || '',
      phone: currentUser.phone || ''
  });

  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null); // For Support Chat
  const taskCommentsEndRef = useRef<HTMLDivElement>(null); // For Task Comments

  // 1. Filter requests belonging to this client
  const myRequests = useMemo(() => {
      return requests.filter(r => {
          if (clientData) {
              return r.client === clientData.name;
          }
          return r.client === currentUser.name;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, clientData, currentUser]);

  // 2. Filter Transactions (Invoices)
  const myInvoices = useMemo(() => {
      if (!clientData) return [];
      return transactions.filter(t => t.clientId === clientData.id && t.category === 'Invoice').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, clientData]);

  // Financial Stats
  const totalDue = myInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = myInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);

  // 3. Filter Notifications
  const myNotifications = useMemo(() => {
      // Logic could be enhanced to target specific user notifications
      // For now, show all notifications relevant to client context if targeted
      return notifications.filter(n => !n.isRead).slice(0, 5); // Mock: just show unread
  }, [notifications]);

  const filteredRequests = myRequests.filter(r => {
      if (activeTab === 'active') return ![RequestStatus.PUBLISHED, RequestStatus.CANCELLED, RequestStatus.ARCHIVED].includes(r.status);
      if (activeTab === 'completed') return r.status === RequestStatus.PUBLISHED;
      return true;
  });

  // Filter messages for Support Chat (Sender OR Receiver is this user)
  const myMessages = useMemo(() => {
      return messages.filter(m => 
          m && (m.senderId === currentUser.id || m.receiverId === currentUser.id)
      );
  }, [messages, currentUser.id]);

  // Auto-scroll for Support Chat
  useEffect(() => {
      if (activeTab === 'support' && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [myMessages.length, activeTab]);

  // Auto-scroll for Task Comments
  useEffect(() => {
      if (selectedRequest && taskCommentsEndRef.current) {
          taskCommentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [selectedRequest?.comments?.length, selectedRequest?.id]);

  const stats = {
      active: myRequests.filter(r => ![RequestStatus.PUBLISHED, RequestStatus.CANCELLED, RequestStatus.ARCHIVED].includes(r.status)).length,
      waitingAction: myRequests.filter(r => r.status === RequestStatus.WAITING_CLIENT_APPROVAL).length,
      completed: myRequests.filter(r => r.status === RequestStatus.PUBLISHED).length
  };

  const handleApprove = (req: ProductionRequest) => {
      if (confirm('هل أنت متأكد من اعتماد هذا العمل؟ سيتم إبلاغ الفريق فوراً.')) {
          onUpdateRequest({
              ...req,
              status: RequestStatus.APPROVED,
              comments: [...(req.comments || []), {
                  id: Date.now().toString(),
                  userId: currentUser.id,
                  text: '✅ تم اعتماد العمل من قبل العميل.',
                  timestamp: new Date().toISOString(),
                  isSystem: true
              }]
          });
          setSelectedRequest(null);
      }
  };

  const handleRequestChanges = (req: ProductionRequest) => {
      const reason = prompt('يرجى كتابة ملاحظات التعديل المطلوبة:');
      if (reason) {
          onUpdateRequest({
              ...req,
              status: RequestStatus.NEEDS_CHANGES,
              comments: [...(req.comments || []), {
                  id: Date.now().toString(),
                  userId: currentUser.id,
                  text: `⚠️ طلب تعديل من العميل: ${reason}`,
                  timestamp: new Date().toISOString()
              }]
          });
          setSelectedRequest(null);
      }
  };

  const handleSendComment = () => {
      if (!selectedRequest || !comment.trim()) return;
      onUpdateRequest({
          ...selectedRequest,
          comments: [...(selectedRequest.comments || []), {
              id: Date.now().toString(),
              userId: currentUser.id,
              text: comment,
              timestamp: new Date().toISOString()
          }]
      });
      setComment('');
  };

  const handleSendSupportMessage = () => {
      if (!supportMessage.trim() || !onSendMessage) return;
      
      const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          receiverId: 'all', // Send to general team channel
          text: supportMessage,
          timestamp: new Date().toISOString(),
          read: false
      };
      
      onSendMessage(msg);
      setSupportMessage('');
  };

  const handleSaveSettings = () => {
      if(onUpdateUser && settingsForm.password) {
          onUpdateUser({ ...currentUser, password: settingsForm.password, email: settingsForm.email, phone: settingsForm.phone });
          alert('تم تحديث البيانات بنجاح');
      }
  };

  // --- FILTER LOGIC FOR COMMENTS ---
  const visibleComments = useMemo(() => {
      if (!selectedRequest) return [];
      const firstHandoverEntry = selectedRequest.statusHistory?.find(
          h => h.status === RequestStatus.WAITING_CLIENT_APPROVAL
      );
      if (!firstHandoverEntry && selectedRequest.status !== RequestStatus.WAITING_CLIENT_APPROVAL) {
          return (selectedRequest.comments || []).filter(c => c.userId === currentUser.id);
      }
      const handoverTime = firstHandoverEntry ? new Date(firstHandoverEntry.timestamp).getTime() : 0;
      return (selectedRequest.comments || []).filter(c => {
          if (c.userId === currentUser.id) return true;
          if (c.isSystem) {
             const txt = c.text.toLowerCase();
             if (txt.includes('created') || txt.includes('in progress') || txt.includes('تم الإنشاء') || txt.includes('قيد التنفيذ')) return false;
          }
          const commentTime = new Date(c.timestamp).getTime();
          return commentTime >= handoverTime;
      });
  }, [selectedRequest, currentUser.id]);

  return (
    <div className="min-h-screen bg-charcoal-950 text-white font-sans flex flex-col md:flex-row h-screen overflow-hidden">
        
        {/* Sidebar / Navigation */}
        <div className="w-full md:w-72 bg-charcoal-900 border-b md:border-l border-white/5 flex flex-col shrink-0">
            <div className="p-8 flex flex-col items-center border-b border-white/5 relative">
                <div className="w-24 h-24 rounded-2xl bg-white p-2 mb-4 shadow-2xl shadow-primary/10">
                    <img 
                        src={clientData?.logo || currentUser.avatar} 
                        className="w-full h-full object-contain" 
                        alt="Logo" 
                    />
                </div>
                <h2 className="text-xl font-black text-center">{clientData?.name || currentUser.name}</h2>
                <p className="text-zinc-500 text-xs mt-1">بوابة العملاء</p>
                
                {/* Notification Bell */}
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="absolute top-6 left-6 p-2 text-zinc-400 hover:text-white transition-colors relative"
                >
                    <Bell size={20} />
                    {myNotifications.length > 0 && <span className="absolute top-1 left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-charcoal-900 animate-pulse"></span>}
                </button>
            </div>

            <div className="p-6 space-y-2">
                <button 
                    onClick={() => { setActiveTab('active'); setSelectedRequest(null); }} 
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'active' ? 'bg-primary text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3"><Clock size={18}/> مشاريع جارية</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'active' ? 'bg-black/20' : 'bg-charcoal-800'}`}>{stats.active}</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('completed'); setSelectedRequest(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'completed' ? 'bg-emerald-500 text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3"><CheckCircle2 size={18}/> الأرشيف المكتمل</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'completed' ? 'bg-black/20' : 'bg-charcoal-800'}`}>{stats.completed}</span>
                </button>
                
                {/* INVOICES TAB */}
                <button 
                    onClick={() => { setActiveTab('invoices'); setSelectedRequest(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'invoices' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3"><Wallet size={18}/> المالية والفواتير</span>
                </button>

                {/* SUPPORT TAB */}
                <button 
                    onClick={() => { setActiveTab('support'); setSelectedRequest(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'support' ? 'bg-blue-500 text-white font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3"><Headphones size={18}/> الدعم والمراسلات</span>
                </button>

                {/* SETTINGS TAB */}
                <button 
                    onClick={() => { setActiveTab('settings'); setSelectedRequest(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3"><Settings size={18}/> الإعدادات</span>
                </button>
            </div>

            <div className="mt-auto p-6">
                <button onClick={onLogout} className="w-full py-3 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-bold">
                    <LogOut size={16}/> تسجيل خروج
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header Mobile */}
            <div className="md:hidden p-4 bg-charcoal-900 border-b border-white/5 flex items-center justify-between shrink-0">
                <span className="font-bold">لوحة العميل</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">B2U Plus</span>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* 1. Projects View */}
                {['active', 'completed'].includes(activeTab) && !selectedRequest && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                        {/* Waiting Approval Alert */}
                        {stats.waitingAction > 0 && activeTab === 'active' && (
                            <div className="mb-8 bg-gradient-to-r from-orange-500/10 to-charcoal-900 border border-orange-500/20 p-6 rounded-2xl flex items-start gap-4 animate-slide-up">
                                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500 animate-pulse">
                                    <AlertCircle size={24}/>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">إجراء مطلوب منك</h3>
                                    <p className="text-zinc-400 text-sm">لديك {stats.waitingAction} مشروع بانتظار موافقتك أو ملاحظاتك للاستمرار.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredRequests.map(req => (
                                <div 
                                    key={req.id} 
                                    onClick={() => setSelectedRequest(req)}
                                    className={`bg-charcoal-900 border border-white/5 p-6 rounded-[24px] cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden ${req.status === RequestStatus.WAITING_CLIENT_APPROVAL ? 'ring-2 ring-orange-500/50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                                        <span className="text-zinc-500 text-[10px] font-mono">{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">{req.title}</h3>
                                    <p className="text-zinc-400 text-xs line-clamp-2 mb-4 h-8">{req.brief}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                                            <FileText size={14}/>
                                            <span>{req.attachments?.length || 0} ملفات</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                                            <ChevronRight size={16}/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Invoices Tab */}
                {activeTab === 'invoices' && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-charcoal-950 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-charcoal-900 p-6 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">إجمالي المستحقات (معلق)</div>
                                <div className="text-3xl font-black text-orange-500">₪{totalDue.toLocaleString()}</div>
                            </div>
                            <div className="bg-charcoal-900 p-6 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">إجمالي المدفوعات (سابقاً)</div>
                                <div className="text-3xl font-black text-emerald-500">₪{totalPaid.toLocaleString()}</div>
                            </div>
                        </div>

                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Wallet className="text-orange-500"/> سجل الفواتير</h3>
                        
                        <div className="bg-charcoal-900 rounded-[24px] border border-white/5 overflow-hidden">
                            {myInvoices.length === 0 ? (
                                <div className="p-10 text-center text-zinc-500">لا توجد فواتير مسجلة حالياً.</div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {myInvoices.map(inv => (
                                        <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-bold text-sm">{inv.description.split('-')[0]}</span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>{inv.status}</span>
                                                </div>
                                                <div className="text-zinc-500 text-[10px]">{new Date(inv.date).toLocaleDateString('ar-EG')} • {inv.description}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-white font-black text-sm">₪{inv.amount.toLocaleString()}</div>
                                                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors" title="تحميل PDF">
                                                    <DownloadCloud size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-charcoal-950 animate-fade-in">
                        <div className="max-w-2xl mx-auto bg-charcoal-900 rounded-[32px] border border-white/5 p-8">
                            <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2"><Settings className="text-zinc-400"/> إعدادات الحساب</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 mb-2">كلمة المرور الجديدة</label>
                                    <div className="relative">
                                        <Lock className="absolute right-4 top-3.5 text-zinc-600" size={16}/>
                                        <input type="password" value={settingsForm.password} onChange={e => setSettingsForm({...settingsForm, password: e.target.value})} placeholder="اتركها فارغة للاحتفاظ بالحالية" className="w-full bg-charcoal-950 border border-white/5 rounded-xl px-12 py-3 text-white text-sm outline-none focus:border-primary transition-all"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 mb-2">البريد الإلكتروني للتواصل</label>
                                    <div className="relative">
                                        <Mail className="absolute right-4 top-3.5 text-zinc-600" size={16}/>
                                        <input type="email" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} className="w-full bg-charcoal-950 border border-white/5 rounded-xl px-12 py-3 text-white text-sm outline-none focus:border-primary transition-all" dir="ltr"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 mb-2">رقم الهاتف</label>
                                    <div className="relative">
                                        <Phone className="absolute right-4 top-3.5 text-zinc-600" size={16}/>
                                        <input type="tel" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full bg-charcoal-950 border border-white/5 rounded-xl px-12 py-3 text-white text-sm outline-none focus:border-primary transition-all" dir="ltr"/>
                                    </div>
                                </div>

                                <button onClick={handleSaveSettings} className="w-full py-3 bg-primary text-black rounded-xl font-bold hover:scale-[1.02] transition-transform">
                                    حفظ التغييرات
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Detail View (Same as before) */}
                {['active', 'completed'].includes(activeTab) && selectedRequest && (
                    <div className="absolute inset-0 z-10 bg-charcoal-950 flex flex-col animate-slide-up">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-charcoal-900 shrink-0">
                            <div>
                                <button onClick={() => setSelectedRequest(null)} className="text-zinc-500 hover:text-white text-xs font-bold flex items-center gap-1 mb-2">
                                    <ChevronRight size={14} className="rotate-180"/> عودة للقائمة
                                </button>
                                <h2 className="text-xl font-black text-white">{selectedRequest.title}</h2>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${STATUS_COLORS[selectedRequest.status]}`}>{selectedRequest.status}</div>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                            {/* Left: Details & Files */}
                            <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                                <div className="mb-8">
                                    <h4 className="text-zinc-500 text-xs font-bold uppercase mb-3">تفاصيل المشروع</h4>
                                    <p className="text-zinc-300 text-sm leading-loose whitespace-pre-wrap bg-white/5 p-4 rounded-xl">{selectedRequest.brief}</p>
                                </div>

                                <div className="mb-8">
                                    <h4 className="text-zinc-500 text-xs font-bold uppercase mb-3">المرفقات والملفات</h4>
                                    <div className="space-y-2">
                                        {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                                            selectedRequest.attachments.map(att => (
                                                <div key={att.id} className="flex items-center justify-between p-3 bg-charcoal-800 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center text-zinc-400">
                                                            {att.type === 'image' ? <ImageIcon size={18}/> : <FileText size={18}/>}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="text-white text-xs font-bold truncate">{att.name}</div>
                                                            <div className="text-[10px] text-zinc-500">{att.size}</div>
                                                        </div>
                                                    </div>
                                                    <a href={att.url} download={att.name} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-colors text-zinc-400">
                                                        <DownloadCloud size={16}/>
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-zinc-600 text-xs border border-dashed border-white/10 rounded-xl">لا توجد مرفقات حالياً</div>
                                        )}
                                    </div>
                                </div>

                                {/* Approval Actions */}
                                {selectedRequest.status === RequestStatus.WAITING_CLIENT_APPROVAL && (
                                    <div className="bg-gradient-to-br from-charcoal-800 to-black p-6 rounded-2xl border border-primary/20 shadow-xl mb-8">
                                        <h3 className="text-white font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="text-primary"/> مطلوب موافقتك</h3>
                                        <p className="text-zinc-400 text-xs mb-6">يرجى مراجعة الملفات أعلاه واتخاذ قرار للاستمرار.</p>
                                        <div className="flex gap-4">
                                            <button onClick={() => handleApprove(selectedRequest)} className="flex-1 bg-emerald-500 text-black py-3 rounded-xl font-black text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                                                <Check size={18}/> اعتماد العمل
                                            </button>
                                            <button onClick={() => handleRequestChanges(selectedRequest)} className="flex-1 bg-white/10 text-white py-3 rounded-xl font-black text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                                                <X size={18}/> طلب تعديلات
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Comments / Feedback */}
                            <div className="w-full md:w-96 bg-charcoal-900 border-l border-white/5 flex flex-col shrink-0">
                                <div className="p-4 border-b border-white/5 font-bold text-sm text-zinc-400 flex items-center gap-2">
                                    <MessageSquare size={16}/> سجل المناقشات والملاحظات
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-charcoal-900">
                                    {visibleComments.length === 0 && (
                                        <div className="text-center py-10 opacity-50">
                                            <p className="text-xs text-zinc-500">لا توجد ملاحظات سابقة.</p>
                                        </div>
                                    )}
                                    {visibleComments.map(c => {
                                        const isMe = c.userId === currentUser.id;
                                        
                                        // 1. SYSTEM MESSAGES (Timeline Style)
                                        if (c.isSystem) {
                                            return (
                                                <div key={c.id} className="flex justify-center my-3 animate-fade-in">
                                                    <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-full text-[10px] text-zinc-400 text-center flex items-center gap-2">
                                                        <Clock size={10} className="opacity-50"/>
                                                        <span>{c.text}</span>
                                                        <span className="opacity-30 border-r border-zinc-600 pr-2 mr-1">{new Date(c.timestamp).toLocaleDateString('ar-EG')}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // 2. CHAT MESSAGES (Bubble Style)
                                        return (
                                            <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                                                {/* Label for Team Members */}
                                                {!isMe && (
                                                    <span className="text-[9px] text-primary mb-1 px-1 font-bold flex items-center gap-1">
                                                        <ShieldCheck size={10}/> فريق العمل / الإدارة
                                                    </span>
                                                )}
                                                
                                                <div className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${isMe ? 'bg-primary text-black rounded-tr-none' : 'bg-charcoal-800 text-zinc-200 rounded-tl-none border border-white/5'}`}>
                                                    {c.text}
                                                </div>
                                                <span className="text-[8px] text-zinc-600 mt-1 px-1 font-mono">{new Date(c.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        );
                                    })}
                                    <div ref={taskCommentsEndRef} />
                                </div>
                                <div className="p-4 border-t border-white/5 bg-charcoal-950">
                                    {selectedRequest.status === RequestStatus.WAITING_CLIENT_APPROVAL && (
                                        <div className="mb-2 text-[10px] text-primary bg-primary/10 p-2 rounded-lg border border-primary/20 flex items-center gap-2">
                                            <PenTool size={12}/> يمكنك كتابة ملاحظاتك هنا قبل الاعتماد أو الرفض.
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 bg-charcoal-900 p-2 rounded-xl border border-white/5">
                                        <input 
                                            type="text" 
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                                            placeholder="اكتب ملاحظة أو تعليق..." 
                                            className="flex-1 bg-transparent text-xs text-white outline-none px-2"
                                        />
                                        <button onClick={handleSendComment} className="p-2 bg-primary text-black rounded-lg hover:scale-105 transition-transform">
                                            <Send size={14}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Support Chat View */}
                {activeTab === 'support' && (
                    <div className="flex-1 flex flex-col bg-charcoal-900 animate-fade-in relative h-full">
                        <div className="p-6 border-b border-white/5 bg-charcoal-950 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2"><Headphones className="text-blue-500"/> الدعم الفني والإدارة</h2>
                                <p className="text-zinc-500 text-xs mt-1">تواصل مباشرة مع فريق الإدارة لأي استفسارات عامة.</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-charcoal-900">
                            {myMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                                    <MessageSquare size={48} className="mb-4" />
                                    <p className="text-sm font-bold">ابدأ المحادثة مع الإدارة هنا</p>
                                </div>
                            ) : (
                                myMessages.map(m => {
                                    const isMe = m.senderId === currentUser.id;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-sm shadow-sm border ${isMe ? 'bg-blue-500 text-white rounded-tr-none border-blue-600' : 'bg-charcoal-800 text-zinc-300 rounded-tl-none border-white/5'}`}>
                                                {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                                                
                                                {/* Attachments rendering if needed */}
                                                {m.image && <img src={m.image} className="rounded-lg max-h-60 w-full object-cover mb-2" />}
                                                {m.fileUrl && (
                                                    <a href={m.fileUrl} download={m.fileName || 'file'} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg hover:bg-black/30 transition-all">
                                                        <FileText size={16}/> <span className="text-xs">{m.fileName || 'ملف مرفق'}</span>
                                                    </a>
                                                )}

                                                <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                                                    <span className="text-[9px] font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                                    {isMe && <CheckCheck size={12} className={m.read ? 'text-white' : 'text-white/50'} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-charcoal-950 border-t border-white/5 shrink-0">
                            <div className="max-w-4xl mx-auto flex items-end gap-2">
                                <div className="flex-1 bg-charcoal-800 rounded-2xl border border-white/5 p-2 flex items-center">
                                    <input 
                                        type="text" 
                                        value={supportMessage} 
                                        onChange={e => setSupportMessage(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleSendSupportMessage()}
                                        placeholder="اكتب رسالتك للإدارة..." 
                                        className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2" 
                                    />
                                </div>
                                <button 
                                    onClick={handleSendSupportMessage} 
                                    disabled={!supportMessage.trim()}
                                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default ClientPortal;

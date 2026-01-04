
import React, { useState, useMemo, useRef } from 'react';
import { X, Trash2, Calendar, FileText, MessageSquare, CheckCircle2, Send, Play, AlertCircle, Check, Plus, Timer, History, Reply, UserCheck, Activity, UserPlus, Clock, Power, EyeOff, Eye, ToggleLeft, ToggleRight, Share2, Paperclip, Upload, File, Image as ImageIcon, DownloadCloud } from 'lucide-react';
import { ProductionRequest, RequestStatus, User as UserType, Permissions, UserRole, Client, WorkLog, StatusHistoryEntry, Attachment } from '../types';
import { STATUS_COLORS } from '../constants';

interface RequestDetailProps {
  request: ProductionRequest;
  onClose: () => void;
  currentUser: UserType;
  onUpdate: (updatedReq: ProductionRequest) => void;
  users: UserType[];
  onDelete?: (id: string) => void;
  userPermissions: Permissions;
  clients?: Client[];
}

const RequestDetail: React.FC<RequestDetailProps> = ({ request, onClose, onDelete, userPermissions, onUpdate, currentUser, users, clients = [] }) => {
  const [comment, setComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  
  // Work Log State
  const [logHours, setLogHours] = useState<number>(1);
  const [logNote, setLogNote] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Safe client lookup
  const clientLogo = (clients && clients.find(c => c && c.name === request.client)?.logo) || `https://ui-avatars.com/api/?name=${request.client}`;
  
  // Check Archive permissions: 
  // 1. Is Creator of the task?
  const isCreator = request.creatorId && request.creatorId === currentUser.id;
  // 2. Is Top Management (Admin or Tamir)?
  const isTopManagement = currentUser.role === UserRole.ADMIN || currentUser.username === 'tamir';
  
  const canArchive = isCreator || isTopManagement;
  // Regular supervisors can manage state only if they are the creator or top management (Admin/Tamir)
  // For permanent delete, stick to strict rules (Admin/Tamir)
  const canDeletePermanent = isTopManagement;
  
  const isActive = request.isActive !== false; // Default to true if undefined

  // Ensure arrays exist
  const safeChecklists = request.checklists || [];
  const safeWorkLogs = request.workLogs || [];
  const safeComments = request.comments || [];
  const safeAttachments = request.attachments || [];

  // --- CRM Calculation Handlers ---
  const handleUpdateStatus = (newStatus: RequestStatus, customNote?: string) => {
    const timestamp = new Date().toISOString();
    const historyEntry: StatusHistoryEntry = {
      status: newStatus,
      timestamp,
      userId: currentUser.id,
      userName: currentUser.name
    };

    let activityText = `🔄 تحديث: تم تغيير حالة المهمة إلى [${newStatus}] بواسطة [${currentUser.name}].`;
    if (customNote) activityText += `\n📝 ملاحظة إدارية: ${customNote}`;

    const systemMessage = {
      id: `sys-${Date.now()}`,
      userId: currentUser.id,
      text: activityText,
      timestamp,
      isSystem: true
    };

    const updatedRequest = {
      ...request,
      status: newStatus,
      lastActivity: timestamp,
      statusHistory: [...(request.statusHistory || []), historyEntry],
      comments: [...safeComments, systemMessage]
    };

    onUpdate(updatedRequest);
  };

  const handleToggleActive = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!canArchive) {
          alert("عذراً، فقط منشئ المهمة أو الإدارة العليا يمكنهم أرشفتها.");
          return;
      }

      const newState = !isActive;
      const updatedRequest = {
          ...request,
          isActive: newState,
          status: newState ? request.status : RequestStatus.ARCHIVED // Optional: Set status label to archived
      };
      
      onUpdate(updatedRequest);
      
      // If we are deactivating (archiving), close the modal immediately
      if (!newState) {
          onClose();
      }
  };

  const handleAddWorkLog = () => {
    if (logHours <= 0) return;
    const newLog: WorkLog = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
      hours: logHours,
      note: logNote
    };
    onUpdate({
      ...request,
      workLogs: [...safeWorkLogs, newLog]
    });
    setLogNote('');
    setShowLogForm(false);
  };

  const handleDelete = () => {
      if (!canDeletePermanent) return;
      if(confirm('هل أنت متأكد من حذف هذه المهمة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
          onDelete?.(request.id);
          onClose();
      }
  };

  const handleWhatsAppShare = () => {
      const assignee = users.find(u => u.id === request.assigneeId);
      
      // Clean phone number from non-numeric characters
      const rawPhone = assignee?.phone ? assignee.phone.replace(/[^0-9]/g, '') : '';

      if(!assignee || !rawPhone) {
          alert('لا يوجد رقم هاتف مسجل للمنفذ لهذا الطلب.');
          return;
      }
      
      const baseUrl = window.location.origin + window.location.pathname;
      const text = `📋 *مشاركة مهمة:* ${request.title}
👤 *العميل:* ${request.client}
📅 *الموعد:* ${request.dueDate}

🔗 *رابط الدخول المباشر للنظام:*
${baseUrl}#/?action=start&id=${request.id}`;

      window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- Attachments Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newAttachment: Attachment = {
            id: Date.now().toString(),
            name: file.name,
            url: result,
            type: file.type.includes('image') ? 'image' : 'file',
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            uploadedAt: new Date().toISOString()
        };
        
        onUpdate({
            ...request,
            attachments: [...safeAttachments, newAttachment]
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAttachment = (attId: string) => {
      if(confirm('حذف هذا المرفق؟')) {
          onUpdate({
              ...request,
              attachments: safeAttachments.filter(a => a.id !== attId)
          });
      }
  };

  const handleDownloadAttachment = (att: Attachment) => {
      const link = document.createElement("a");
      link.href = att.url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 md:p-6 animate-fade-in font-sans">
      <div className={`bg-charcoal-900 w-full max-w-[1600px] h-full rounded-[30px] border border-white/5 shadow-2xl flex flex-col overflow-hidden relative ${!isActive ? 'grayscale opacity-90' : ''}`}>
        
        {/* === Compact Header === */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-charcoal-950 shrink-0">
            <div className="flex items-center gap-4">
                <img src={clientLogo} className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 object-cover" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{request.client}</span>
                    <h2 className="text-sm font-black text-white truncate max-w-md">{request.title}</h2>
                </div>
                <div className={`hidden md:block w-px h-6 bg-white/10 mx-2`}></div>
                <span className={`hidden md:block px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${STATUS_COLORS[request.status]}`}>
                    {request.status}
                </span>
                {!isActive && <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-red-500 text-white animate-pulse flex items-center gap-2">غير فعال (مؤرشف)</span>}
            </div>
            
            <div className="flex items-center gap-2">
                {/* WhatsApp Share Button */}
                <button 
                    onClick={handleWhatsAppShare}
                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                    title="إرسال تذكير للمنفذ عبر واتساب"
                >
                    <Share2 size={18} />
                </button>

                {canArchive && (
                    <button 
                        type="button"
                        onClick={handleToggleActive} 
                        className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border ${!isActive ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`}
                        title={isActive ? "نقل للأرشيف (إلغاء التفعيل)" : "استعادة وتفعيل"}
                    >
                        {isActive ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                        {isActive ? 'أرشفة' : 'استعادة'}
                    </button>
                )}
                {canDeletePermanent && (
                    <button onClick={handleDelete} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="حذف نهائي">
                        <Trash2 size={18}/>
                    </button>
                )}
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X size={20}/></button>
            </div>
        </div>

        {/* === Three Column Layout (No Main Scroll) === */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            
            {/* COLUMN 1: BRIEF, CHECKLIST & ATTACHMENTS (40%) */}
            <div className="flex-1 md:flex-[0.4] flex flex-col border-l border-white/5 bg-charcoal-900 min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Brief */}
                    <div className="bg-charcoal-950/50 p-5 rounded-2xl border border-white/5">
                        <h3 className="text-white font-black text-xs mb-3 flex items-center gap-2"><FileText size={14} className="text-primary"/> التفاصيل الفنية</h3>
                        <p className="text-zinc-300 text-xs leading-loose whitespace-pre-wrap font-medium">{request.brief || 'لا يوجد وصف فني متوفر.'}</p>
                    </div>

                    {/* Checklist */}
                    <div>
                        <h3 className="text-white font-black text-xs mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> قائمة المهام</h3>
                        <div className="space-y-2">
                            {safeChecklists.filter(t => t && t.id).map(task => (
                                <div key={task.id} className="group flex items-center gap-3 p-3 bg-charcoal-950/50 rounded-xl border border-white/5 hover:border-primary/20 transition-all">
                                    <button 
                                        onClick={() => onUpdate({...request, checklists: safeChecklists.map(t => t.id === task.id ? {...t, completed: !t.completed} : t)})}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${task.completed ? 'bg-primary border-primary text-black' : 'border-zinc-700 hover:border-primary'}`}
                                    >
                                        {task.completed && <Check size={12} strokeWidth={4} />}
                                    </button>
                                    <span className={`flex-1 text-xs font-bold ${task.completed ? 'text-zinc-600 line-through' : 'text-white'}`}>{task.text}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-dashed border-white/10">
                                <Plus size={14} className="text-zinc-600" />
                                <input 
                                    type="text" 
                                    placeholder="مهمة فرعية..." 
                                    value={newSubtask}
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newSubtask.trim()) {
                                            onUpdate({...request, checklists: [...safeChecklists, { id: Date.now().toString(), text: newSubtask, completed: false }]});
                                            setNewSubtask('');
                                        }
                                    }}
                                    className="bg-transparent text-xs text-white w-full outline-none placeholder:text-zinc-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-black text-xs flex items-center gap-2"><Paperclip size={14} className="text-blue-400"/> مرفقات المهمة</h3>
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isUploading}
                                className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 px-2 py-1 rounded-lg border border-white/5 flex items-center gap-1 transition-all"
                            >
                                {isUploading ? 'جاري الرفع...' : <><Upload size={10}/> رفع ملف</>}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        </div>
                        
                        <div className="space-y-2">
                            {safeAttachments.length === 0 ? (
                                <div className="text-center p-4 border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                                    <p className="text-[10px] text-zinc-600">لا توجد مرفقات</p>
                                </div>
                            ) : (
                                safeAttachments.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-2 bg-charcoal-950/50 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-charcoal-800 flex items-center justify-center text-zinc-400 shrink-0">
                                                {att.type === 'image' ? <ImageIcon size={14}/> : <File size={14}/>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] text-white font-bold truncate">{att.name}</div>
                                                <div className="text-[8px] text-zinc-500">{att.size} • {new Date(att.uploadedAt).toLocaleDateString('ar-EG')}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDownloadAttachment(att)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"><DownloadCloud size={12}/></button>
                                            <button onClick={() => handleDeleteAttachment(att.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* COLUMN 2: CRM ACTIONS & META (30%) */}
            <div className="flex-1 md:flex-[0.3] flex flex-col border-l border-white/5 bg-charcoal-900/50 min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Actions */}
                    <div className="bg-charcoal-950 p-5 rounded-2xl border border-white/5 shadow-lg">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={12}/> الإجراءات</h4>
                        <div className="space-y-3">
                            {(() => {
                                const isAssignee = request.assigneeId === currentUser.id;
                                const isSupervisor = request.supervisorId === currentUser.id || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR;
                                
                                if (!isActive) {
                                    return <div className="text-center p-3 bg-red-500/10 rounded-xl text-red-400 text-[10px] font-bold border border-red-500/20">هذه المهمة مؤرشفة (للقراءة فقط)</div>;
                                }

                                // المنفذ (Assignee)
                                if (isAssignee) {
                                    if (request.status === RequestStatus.CREATED) {
                                        return <button onClick={() => handleUpdateStatus(RequestStatus.IN_PROGRESS)} className="w-full bg-primary text-black py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-blue-400 transition-all"><Play size={16}/> بدء العمل</button>;
                                    }
                                    if (request.status === RequestStatus.IN_PROGRESS || request.status === RequestStatus.NEEDS_CHANGES) {
                                        return <button onClick={() => handleUpdateStatus(RequestStatus.WAITING_REVIEW)} className="w-full bg-purple-500 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-purple-600 transition-all"><Send size={16}/> تسليم للمراجعة</button>;
                                    }
                                }

                                // المشرف (Supervisor)
                                if (isSupervisor) {
                                    if (request.status === RequestStatus.WAITING_REVIEW || request.status === RequestStatus.IN_REVIEW) {
                                        return (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleUpdateStatus(RequestStatus.NEEDS_CHANGES)} className="bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[10px] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><Reply size={14}/> طلب تعديل</button>
                                                <button onClick={() => handleUpdateStatus(RequestStatus.WAITING_CLIENT_APPROVAL)} className="bg-orange-500 text-black py-3 rounded-xl font-black text-[10px] hover:bg-orange-400 transition-all"><UserCheck size={14}/> إرسال للعميل</button>
                                            </div>
                                        );
                                    }
                                    if (request.status === RequestStatus.WAITING_CLIENT_APPROVAL) {
                                        return (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleUpdateStatus(RequestStatus.NEEDS_CHANGES)} className="bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[10px] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><X size={14}/> رفض العميل</button>
                                                <button onClick={() => handleUpdateStatus(RequestStatus.APPROVED)} className="bg-teal-500 text-black py-3 rounded-xl font-black text-[10px] hover:bg-teal-400 transition-all"><CheckCircle2 size={14}/> اعتماد العميل</button>
                                            </div>
                                        );
                                    }
                                }

                                // قسم النشر والآدمن (Publishing)
                                if ((currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PUBLISHING) && request.status === RequestStatus.APPROVED) {
                                    return <button onClick={() => handleUpdateStatus(RequestStatus.PUBLISHED)} className="w-full bg-emerald-500 text-black py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all"><CheckCircle2 size={16}/> تم النشر</button>;
                                }

                                return <div className="text-center p-3 bg-white/5 rounded-xl text-zinc-500 text-[10px] font-bold border border-white/5 italic">لا توجد إجراءات متاحة حالياً</div>;
                            })()}
                        </div>
                    </div>

                    {/* Team & Dates */}
                    <div className="space-y-4">
                        <div className="bg-charcoal-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${request.assigneeId}&background=random`} className="w-8 h-8 rounded-lg" />
                                <div><div className="text-[9px] text-zinc-500 font-bold uppercase">المنفذ</div><div className="text-white text-xs font-bold">{users.find(u => u && u.id === request.assigneeId)?.name}</div></div>
                            </div>
                        </div>
                        <div className="bg-charcoal-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><UserPlus size={16}/></div>
                                <div><div className="text-[9px] text-zinc-500 font-bold uppercase">المشرف</div><div className="text-white text-xs font-bold">{users.find(u => u && u.id === request.supervisorId)?.name || 'غير محدد'}</div></div>
                            </div>
                        </div>
                        <div className="bg-charcoal-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400"><Calendar size={16}/></div>
                                <div><div className="text-[9px] text-zinc-500 font-bold uppercase">التسليم</div><div className="text-white text-xs font-mono">{new Date(request.dueDate).toLocaleDateString('ar-EG')}</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Log Work */}
                    <div className="bg-charcoal-950 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Timer size={12}/> تسجيل الوقت</h4>
                            <button onClick={() => setShowLogForm(!showLogForm)} className="text-[10px] text-primary hover:underline" disabled={!isActive}>إضافة</button>
                        </div>
                        {showLogForm && isActive && (
                            <div className="mb-3 space-y-2 animate-slide-up">
                                <div className="flex gap-2">
                                    <input type="number" value={logHours} onChange={e => setLogHours(Number(e.target.value))} className="w-16 bg-charcoal-900 border border-white/10 rounded-lg p-2 text-white text-xs text-center" />
                                    <input type="text" placeholder="ماذا أنجزت؟" value={logNote} onChange={e => setLogNote(e.target.value)} className="flex-1 bg-charcoal-900 border border-white/10 rounded-lg p-2 text-white text-xs" />
                                </div>
                                <button onClick={handleAddWorkLog} className="w-full bg-primary/20 text-primary text-[10px] font-bold py-2 rounded-lg hover:bg-primary/30">حفظ</button>
                            </div>
                        )}
                        <div className="text-[10px] text-zinc-400">إجمالي الساعات: <span className="text-white font-bold">{safeWorkLogs.reduce((acc, log) => acc + log.hours, 0)}h</span></div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: CHAT & HISTORY (30%) */}
            <div className="flex-1 md:flex-[0.3] flex flex-col bg-charcoal-950 min-h-0">
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-white font-black text-xs flex items-center gap-2"><MessageSquare size={14} className="text-primary"/> المناقشات</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                     {safeComments.length === 0 ? (
                         <div className="text-center py-10 opacity-20"><MessageSquare size={32} className="mx-auto mb-2"/><p className="text-[10px] font-bold">لا توجد مناقشات</p></div>
                     ) : (
                         safeComments.filter(c => c && c.id).map(c => (
                             <div key={c.id} className="flex gap-3 animate-fade-in">
                                 {!c.isSystem && (
                                     <div className="w-8 h-8 rounded-lg bg-charcoal-800 flex items-center justify-center text-[10px] font-bold shrink-0 border border-white/5 text-zinc-400">
                                         {users.find(u => u && u.id === c.userId)?.name.charAt(0) || 'U'}
                                     </div>
                                 )}
                                 <div className={`flex-1 min-w-0 ${c.isSystem ? 'bg-primary/5 border border-primary/10 rounded-lg p-3' : 'bg-charcoal-900 border border-white/5 rounded-2xl rounded-tr-none p-3'}`}>
                                     <div className="flex items-center justify-between mb-1">
                                         <span className={`text-[9px] font-black ${c.isSystem ? 'text-primary' : 'text-zinc-400'}`}>{c.isSystem ? 'System' : users.find(u => u && u.id === c.userId)?.name}</span>
                                         <span className="text-[8px] font-mono text-zinc-600">{new Date(c.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                     </div>
                                     <p className={`text-[10px] leading-relaxed ${c.isSystem ? 'text-primary/80 italic' : 'text-zinc-300'}`}>{c.text}</p>
                                 </div>
                             </div>
                         ))
                     )}
                </div>

                <div className="p-4 border-t border-white/5 bg-charcoal-900">
                    <div className="flex gap-2">
                        <input 
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && comment.trim()) {
                                    onUpdate({...request, comments: [...safeComments, { id: Date.now().toString(), userId: currentUser.id, text: comment, timestamp: new Date().toISOString() }]});
                                    setComment('');
                                }
                            }}
                            placeholder="اكتب تعليقاً..."
                            disabled={!isActive}
                            className="flex-1 bg-charcoal-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button 
                            disabled={!isActive}
                            onClick={() => {
                                if (comment.trim()) {
                                    onUpdate({...request, comments: [...safeComments, { id: Date.now().toString(), userId: currentUser.id, text: comment, timestamp: new Date().toISOString() }]});
                                    setComment('');
                                }
                            }} 
                            className="p-3 bg-primary text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16}/>
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
export default RequestDetail;

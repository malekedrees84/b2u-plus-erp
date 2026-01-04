
import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Type, Calendar, User as UserIcon, AlertCircle, RefreshCcw, ShieldCheck, MessageSquare } from 'lucide-react';
import { ProductionRequest, RequestStatus, RequestType, User, UserRole, Client, RecurrencePattern } from '../types';

interface RequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request?: ProductionRequest | null;
  onSave: (req: Partial<ProductionRequest>) => void;
  users: User[];
  currentUser: User;
  clients: Client[];
}

const RequestDrawer: React.FC<RequestDrawerProps> = ({ isOpen, onClose, request, onSave, users, currentUser, clients }) => {
  const initialData: Partial<ProductionRequest> = { 
    title: '', 
    client: '', 
    type: RequestType.DESIGN, 
    priority: 'Medium', 
    dueDate: '', 
    brief: '', 
    assigneeId: '',
    supervisorId: '', 
    status: RequestStatus.CREATED, 
    tags: [],
    isRecurring: false,
    recurrence: RecurrencePattern.NONE,
    isActive: true 
  };
  const [formData, setFormData] = useState<Partial<ProductionRequest>>(initialData);

  useEffect(() => { 
      if (isOpen) {
          if (request) {
              setFormData({ ...request });
          } else {
              setFormData({
                  ...initialData,
                  supervisorId: (currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.ADMIN) ? currentUser.id : ''
              });
          }
      } 
  }, [isOpen, request, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- Consistency Logic ---
    // Generate the ID here if it's a new task, so we can use the SAME ID for both the database and the WhatsApp link.
    const finalId = request?.id || crypto.randomUUID();
    const payload = { ...formData, id: finalId };
    
    // Save to App State (Database)
    // Add safety cast
    onSave(payload as ProductionRequest);
    
    // --- WhatsApp Logic ---
    if (formData.assigneeId) {
        const assignee = users.find(u => u.id === formData.assigneeId);
        
        // Extract plain phone number (remove spaces, dashes, parentheses)
        const rawPhone = assignee?.phone ? assignee.phone.replace(/[^0-9]/g, '') : '';
        
        if (assignee && rawPhone) {
            const taskTitle = formData.title;
            const dueDate = formData.dueDate;
            // Base URL (assuming hash router)
            const baseUrl = window.location.origin + window.location.pathname;
            
            // Construct Deep Link using the CONSISTENT ID
            const text = `👋 مرحباً ${assignee.name.split(' ')[0]}
📋 *مهمة جديدة:* ${taskTitle}
👤 *العميل:* ${formData.client}
📅 *التسليم:* ${dueDate}

🔗 *اضغط هنا لاستلام المهمة وبدء العمل:*
${baseUrl}#/?action=start&id=${finalId}`;

            // Use setTimeout to ensure this executes after the form submission logic allows UI updates
            setTimeout(() => {
                const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`;
                const win = window.open(url, '_blank');
                if (!win) {
                    alert('يرجى السماح بالنوافذ المنبثقة لفتح واتساب');
                }
            }, 500);
        } else if (assignee && !assignee.phone) {
            alert(`تنبيه: لم يتم العثور على رقم هاتف للمستخدم ${assignee.name}. لن يتم إرسال واتساب.`);
        }
    }

    onClose();
  };

  // Privacy Rule: Filter users available for assignment
  // If current user is NOT admin, they cannot see or assign to ADMINs.
  const safeUsers = users.filter(u => {
      if (!u || !u.id) return false;
      if (u.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) return false;
      return true;
  });

  // Filter Clients: ONLY Active and Not Deleted
  const activeClients = clients.filter(c => c && c.id && !c.isDeleted && c.status !== 'Inactive');
  
  // Find selected client object to display logo
  const selectedClientObj = activeClients.find(c => c.name === formData.client);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-charcoal-900 h-full shadow-2xl border-r border-charcoal-800 flex flex-col animate-slide-in-right overflow-hidden md:rounded-l-[30px]">
        <div className="flex items-center justify-between p-6 border-b border-charcoal-800 bg-charcoal-950 pt-safe">
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{request ? 'تعديل المهمة' : 'إنشاء مهمة إنتاج جديدة'}</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">تحديد التفاصيل والمسؤوليات</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
            {/* Basic Info */}
            <div className="space-y-4">
                <h3 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Type size={14} /> المعلومات الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">عنوان المهمة</label>
                        <input required type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="مثال: تصميم هوية بصرية لشركة X" className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">العميل المستهدف</label>
                        <div className="relative">
                            <select required value={formData.client || ''} onChange={e => setFormData({ ...formData, client: e.target.value })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all appearance-none">
                                <option value="">اختر العميل...</option>
                                {activeClients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            {/* Visual Feedback for Selected Client */}
                            {selectedClientObj && (
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500">{selectedClientObj.industry}</span>
                                    <img src={selectedClientObj.logo} className="w-6 h-6 rounded-md object-cover border border-white/10" alt="logo" />
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] text-zinc-600 mt-1 flex items-center gap-1"><AlertCircle size={8}/> العملاء المؤرشفون لا يظهرون هنا</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">نوع الإنتاج</label>
                        <select required value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value as RequestType })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all">
                            {Object.values(RequestType).map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Smart Tracking & Periodicity */}
            <div className="space-y-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                <h3 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RefreshCcw size={14} /> نظام التكرار الدوري الذكي
                </h3>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-white text-sm font-bold">تفعيل المهمة الدورية</p>
                        <p className="text-zinc-500 text-[10px]">سيقوم النظام بإنشاء نسخة جديدة تلقائياً بناءً على النمط المحدد.</p>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })} className={`w-12 h-6 rounded-full relative transition-all ${formData.isRecurring ? 'bg-primary' : 'bg-charcoal-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isRecurring ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
                {formData.isRecurring && (
                    <div className="animate-fade-in">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">نمط التكرار</label>
                        <div className="grid grid-cols-3 gap-2">
                            {/* Fixed key error by casting pattern to string */}
                            {[RecurrencePattern.DAILY, RecurrencePattern.WEEKLY, RecurrencePattern.MONTHLY].map(pattern => (
                                <button 
                                    key={pattern as string}
                                    type="button"
                                    onClick={() => setFormData({...formData, recurrence: pattern})}
                                    className={`py-2 rounded-xl text-[10px] font-black transition-all border ${formData.recurrence === pattern ? 'bg-primary text-black border-primary' : 'bg-charcoal-800 text-zinc-500 border-white/5'}`}
                                >
                                    {pattern === RecurrencePattern.DAILY ? 'يومي' : pattern === RecurrencePattern.WEEKLY ? 'أسبوعي' : 'شهري'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Assignment & Date */}
            <div className="space-y-4">
                <h3 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <UserIcon size={14} /> الإسناد والجدولة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">المسؤول عن التنفيذ</label>
                        <select required value={formData.assigneeId || ''} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all">
                            <option value="">اختر المنفذ...</option>
                            {safeUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>

                    {/* NEW: Supervisor Selection */}
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase flex items-center gap-1"><ShieldCheck size={10} /> المشرف المسؤول</label>
                        <select required value={formData.supervisorId || ''} onChange={e => setFormData({ ...formData, supervisorId: e.target.value })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all">
                            <option value="">اختر المشرف...</option>
                            {safeUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">تاريخ الاستحقاق النهائي</label>
                        <input required type="date" value={formData.dueDate || ''} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">الأولوية</label>
                        <select value={formData.priority || 'Medium'} onChange={e => setFormData({ ...formData, priority: e.target.value as any })} className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all">
                            <option value="Low">منخفضة</option>
                            <option value="Medium">متوسطة</option>
                            <option value="High">عالية جداً</option>
                        </select>
                    </div>
                </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase">مواصفات الطلب (Brief)</label>
              <textarea required rows={5} value={formData.brief || ''} onChange={e => setFormData({ ...formData, brief: e.target.value })} placeholder="اكتب تفاصيل دقيقة للمنفذ هنا..." className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" />
            </div>
        </form>
        
        <div className="p-6 border-t border-white/5 bg-charcoal-950 flex justify-between items-center pb-safe">
            <button onClick={onClose} className="text-zinc-500 font-bold hover:text-white transition-colors">إلغاء</button>
            <div className="flex items-center gap-4">
                {formData.assigneeId && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 animate-pulse">
                        <MessageSquare size={12}/> سيتم إرسال واتساب للمنفذ
                    </span>
                )}
                <button onClick={handleSubmit} className="bg-primary text-black px-10 py-3.5 rounded-2xl font-black text-sm flex gap-2 hover:scale-105 transition-transform shadow-xl shadow-primary/20">
                    <Save size={18} /> {request ? 'تحديث المهمة' : 'إنشاء وإسناد'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default RequestDrawer;

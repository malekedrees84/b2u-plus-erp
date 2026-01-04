
import React, { useState } from 'react';
import { UserRole, User, Announcement, ProductionRequest, RolePermissions, Permissions, AppSettings, Client, RequestStatus } from '../types';
import { Shield, Save, Palette, Megaphone, Plus, Trash2, ShieldCheck, Archive, FolderArchive, Image as ImageIcon, MoveHorizontal, Layout, XCircle, Check, Monitor, RefreshCw } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  currentUser: User;
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  
  users?: User[];
  onUpdateUsers?: (users: User[]) => void;
  onRestoreUser?: (id: string) => void;
  onPermanentDeleteUser?: (id: string) => void;

  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;
  onRestoreClient?: (id: string) => void;
  onPermanentDeleteClient?: (id: string) => void;

  requests?: ProductionRequest[];
  onUpdateRequests?: (requests: ProductionRequest[]) => void;
  rolePermissions: RolePermissions;
  onUpdatePermissions: (perms: RolePermissions) => void;

  // New Empty Trash Props
  onEmptyTrashUsers?: () => void;
  onEmptyTrashClients?: () => void;
  onEmptyTrashRequests?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onUpdate, currentUser, announcements = [], onUpdateAnnouncements, 
  users = [], onUpdateUsers, onRestoreUser, onPermanentDeleteUser,
  clients = [], onUpdateClients, onRestoreClient, onPermanentDeleteClient,
  requests = [], onUpdateRequests,
  rolePermissions, onUpdatePermissions,
  onEmptyTrashUsers, onEmptyTrashClients, onEmptyTrashRequests
}) => {
  const [activeTab, setActiveTab] = useState('master_control');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  
  // Grant full access to 'malek' OR any ADMIN
  const hasFullAccess = currentUser.username === 'malek' || currentUser.role === UserRole.ADMIN;

  // Announcement Form State
  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [newAnnounce, setNewAnnounce] = useState<Partial<Announcement>>({
      title: '',
      content: '',
      type: 'hero', // Default to Hero (Banner) to ensure visibility
      isActive: true,
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      isScrolling: false
  });

  // Safe filtering with null checks and optional chaining
  const archivedClients = (clients || []).filter(c => c && (c.isDeleted === true || c.status === 'Inactive'));
  const deletedUsers = (users || []).filter(u => u && (u.isDeleted === true || u.status === 'Inactive'));
  const archivedRequests = (requests || []).filter(r => r && (r.isActive === false || r.status === RequestStatus.ARCHIVED || (r.status as string) === 'Archived'));

  const handleSaveSettings = () => { 
    onUpdate(localSettings); 
    const btn = document.getElementById('save-btn');
    if(btn) {
        btn.innerText = 'تم التحديث!';
        setTimeout(() => btn.innerText = 'تطبيق الإعدادات', 2000);
    }
  };

  const safeAnnouncements = announcements.filter(a => a && a.id);

  const handleAddAnnouncement = () => {
    if (!newAnnounce.title || !newAnnounce.content) {
        alert('يرجى كتابة العنوان والمحتوى');
        return;
    }
    
    // Explicitly set type based on scrolling flag
    const finalType = newAnnounce.isScrolling ? 'scrolling' : 'hero';

    const announce: Announcement = {
        ...newAnnounce as Announcement,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        authorId: currentUser.id,
        type: finalType,
        // Ensure defaults
        isActive: newAnnounce.isActive ?? true,
        isScrolling: newAnnounce.isScrolling ?? false
    };
    
    // Calls parent handler which now triggers notifications & cloud save
    onUpdateAnnouncements([...safeAnnouncements, announce]);
    
    setShowAnnounceForm(false);
    // Reset form
    setNewAnnounce({ title: '', content: '', type: 'hero', isActive: true, backgroundColor: '#1e293b', textColor: '#ffffff', isScrolling: false });
  };

  const handleToggleAnnounce = (id: string) => {
    // Operate on safeAnnouncements to ensure no nulls are passed back up
    onUpdateAnnouncements(safeAnnouncements.map(a => (a.id === id) ? {...a, isActive: !a.isActive} : a));
  };

  const handleDeleteAnnounce = (id: string) => {
    if(confirm('هل أنت متأكد من حذف الإعلان؟')) {
        onUpdateAnnouncements(safeAnnouncements.filter(a => a.id !== id));
    }
  };

  const handlePermissionToggle = (role: UserRole, key: keyof Permissions) => {
    if (role === UserRole.ADMIN && key === 'canManageUsers') {
        alert("لا يمكن إلغاء صلاحية إدارة المستخدمين للمدير العام.");
        return;
    }
    const updatedPermissions = {
      ...rolePermissions,
      [role]: { ...rolePermissions[role], [key]: !rolePermissions[role]?.[key] }
    };
    onUpdatePermissions(updatedPermissions);
  };

  if (currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-20 animate-fade-in">
        <Shield size={120} className="mb-8 opacity-10 text-red-500" />
        <h2 className="text-5xl black-header text-white mb-4">وصول مقيد</h2>
        <p className="text-zinc-500 font-bold text-lg max-w-sm">هذا القسم مخصص للمديرين فقط.</p>
      </div>
    );
  }

  const permissionLabels: Record<keyof Permissions, string> = {
      canCreateRequest: 'إنشاء طلبات',
      canEditRequest: 'تعديل طلبات',
      canDeleteRequest: 'حذف طلبات',
      canManageUsers: 'إدارة مستخدمين',
      canPostAnnouncements: 'نشر إعلانات',
      canViewReports: 'رؤية تقارير',
      canViewAllRequests: 'عرض كل الطلبات',
      canViewInternalNotes: 'عرض الملاحظات الداخلية',
      canApproveTasks: 'اعتماد المهام',
      canPublishTasks: 'نشر المهام',
      canSeeActivityLog: 'عرض سجل النشاط',
      canManageFinance: 'الإدارة المالية',
      canViewFinancials: 'عرض السجلات المالية'
  };

  const tabs = [
     { id: 'master_control', label: 'الهوية البصرية', icon: Palette, restricted: false },
     { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Shield, restricted: false },
     { id: 'trash', label: 'الأرشيف والمحذوفات', icon: Archive, restricted: false },
     { id: 'announcements', label: 'الإعلانات العامة', icon: Megaphone, restricted: !hasFullAccess },
  ].filter(t => !t.restricted);

  return (
    <div className="p-4 md:p-12 h-full flex flex-col animate-fade-in overflow-hidden bg-charcoal-950">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/5 pb-12 gap-6">
        <div className="text-right">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl md:text-6xl black-header text-white tracking-tighter">مركز التحكم</h2>
            <ShieldCheck className="text-primary w-12 h-12" />
          </div>
          <p className="text-zinc-500 font-bold text-xl">نظام التشغيل {settings.appName} (Master Console)</p>
        </div>
        <button id="save-btn" onClick={handleSaveSettings} className="bg-primary text-black px-12 py-5 rounded-[28px] font-black flex items-center justify-center gap-3 hover:scale-105 shadow-2xl shadow-primary/20 transition-all uppercase tracking-widest text-sm whitespace-nowrap">
          <Save size={20} /> تطبيق الإعدادات
        </button>
      </div>

      <div className="flex gap-12 mb-12 justify-start md:justify-end overflow-x-auto no-scrollbar pb-2 border-b border-white/5 w-full">
         {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-4 px-2 text-xs font-black transition-all border-b-4 flex items-center justify-center gap-3 uppercase tracking-wider whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
                <tab.icon size={16} /> {tab.label}
            </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-12 pb-24 custom-scrollbar pr-4">
         
         {activeTab === 'trash' && (
             <div className="animate-slide-up space-y-10">
                 {/* Clients Trash */}
                 <div className="premium-card p-8 rounded-[30px] border border-amber-500/10 bg-amber-950/5">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-amber-400 font-black text-2xl flex items-center gap-2"><FolderArchive size={24}/> أرشيف العملاء (المتوقفين)</h3>
                        {archivedClients.length > 0 && onEmptyTrashClients && (
                            <button onClick={onEmptyTrashClients} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                <Trash2 size={14}/> إفراغ الأرشيف
                            </button>
                        )}
                     </div>
                     {archivedClients.length === 0 ? <p className="text-zinc-600 text-sm italic">الأرشيف فارغ</p> : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {archivedClients.map(c => (
                                 <div key={c.id} className="bg-charcoal-900/50 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                                     <div className="flex items-center gap-3">
                                         <img src={c.logo} className="w-10 h-10 rounded-lg grayscale" alt="logo" />
                                         <div><div className="text-white font-bold text-sm">{c.name}</div><div className="text-[10px] text-zinc-500">ARCHIVED</div></div>
                                     </div>
                                     {onRestoreClient && (
                                         <button onClick={() => onRestoreClient(c.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-colors"><RefreshCw size={16}/></button>
                                     )}
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Users Trash */}
                 <div className="premium-card p-8 rounded-[30px] border border-red-500/10">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-black text-2xl flex items-center gap-2"><Trash2 size={24} className="text-zinc-600" /> سلة مهملات المستخدمين</h3>
                        {deletedUsers.length > 0 && onEmptyTrashUsers && (
                            <button onClick={onEmptyTrashUsers} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                <Trash2 size={14}/> إفراغ السلة
                            </button>
                        )}
                     </div>
                     {deletedUsers.length === 0 ? <p className="text-zinc-600 text-sm italic">السلة فارغة</p> : (
                         <div className="space-y-3">
                             {deletedUsers.map(u => (
                                 <div key={u.id} className="bg-charcoal-900/50 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                                     <div className="flex items-center gap-3">
                                         <img src={u.avatar} className="w-10 h-10 rounded-full grayscale" alt="avatar" />
                                         <div className="text-white font-bold text-sm">{u.name}</div>
                                     </div>
                                     <div className="flex gap-2">
                                         {onRestoreUser && (
                                             <button onClick={() => onRestoreUser(u.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg" title="استعادة"><RefreshCw size={16}/></button>
                                         )}
                                         {onPermanentDeleteUser && (
                                             <button onClick={() => onPermanentDeleteUser(u.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white" title="حذف نهائي"><Trash2 size={16}/></button>
                                         )}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Requests Trash */}
                 <div className="premium-card p-8 rounded-[30px] border border-blue-500/10 bg-blue-950/5">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-blue-400 font-black text-2xl flex items-center gap-2"><Archive size={24}/> أرشيف المهام</h3>
                        {archivedRequests.length > 0 && onEmptyTrashRequests && (
                            <button onClick={onEmptyTrashRequests} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                <Trash2 size={14}/> إفراغ الأرشيف
                            </button>
                        )}
                     </div>
                     {archivedRequests.length === 0 ? <p className="text-zinc-600 text-sm italic">الأرشيف فارغ</p> : (
                         <div className="space-y-3">
                             <p className="text-zinc-500 text-xs">يوجد {archivedRequests.length} مهمة في الأرشيف.</p>
                         </div>
                     )}
                 </div>
             </div>
         )}
         
         {activeTab === 'permissions' && (
             <div className="animate-slide-up premium-card p-12 rounded-[50px] border-white/5 overflow-x-auto">
                 <div className="mb-8">
                     <h3 className="text-white font-black text-2xl">إدارة صلاحيات الوصول</h3>
                     <p className="text-zinc-500 text-sm mt-2">انقر على المربع لتفعيل أو إيقاف الصلاحية لكل دور وظيفي.</p>
                 </div>
                 
                 <table className="w-full text-right border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-white/10 text-zinc-500 text-[10px] font-black uppercase">
                            <th className="pb-6">الدور الوظيفي</th>
                            {Object.values(permissionLabels).map(label => <th key={label} className="pb-6 text-center">{label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(UserRole).map(role => (
                            <tr key={role as string} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-6 text-white font-bold text-sm">
                                    <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5">{role as string}</span>
                                </td>
                                {Object.keys(permissionLabels).map(key => {
                                    // SAFE ACCESS: Check if role exists in permissions object
                                    const rolePerms = rolePermissions[role] || {};
                                    const isActive = rolePerms[key as keyof Permissions];
                                    return (
                                        <td key={key as string} className="py-6 text-center">
                                            <div 
                                                onClick={() => handlePermissionToggle(role, key as keyof Permissions)}
                                                className={`w-6 h-6 rounded border mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${isActive ? 'bg-primary border-primary text-black shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-zinc-700 hover:border-zinc-500 bg-charcoal-900'}`}
                                            >
                                                {isActive && <Check size={14} strokeWidth={4} />}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
         )}

         {activeTab === 'announcements' && hasFullAccess && (
             <div className="animate-slide-up space-y-10 max-w-5xl mx-auto">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-white font-black text-2xl flex items-center gap-4"><Megaphone size={32} className="text-primary" /> نظام الإعلانات والبانرات</h3>
                        <p className="text-zinc-500 text-sm mt-2">إدارة الرسائل العامة، أشرطة الأخبار، والبانرات الترويجية الداخلية.</p>
                    </div>
                    <button 
                        onClick={() => setShowAnnounceForm(!showAnnounceForm)}
                        className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                    >
                        {showAnnounceForm ? <XCircle size={20}/> : <Plus size={20}/>}
                        {showAnnounceForm ? 'إلغاء' : 'إنشاء إعلان جديد'}
                    </button>
                 </div>

                 {showAnnounceForm && (
                     <div className="premium-card p-10 rounded-[40px] border border-primary/20 bg-primary/5 space-y-8 animate-slide-up">
                         {/* Form Content */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-6">
                                <div>
                                    <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block tracking-widest">عنوان الإعلان</label>
                                    <input type="text" value={newAnnounce.title} onChange={e => setNewAnnounce({...newAnnounce, title: e.target.value})} className="w-full bg-charcoal-900 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-primary" placeholder="مثال: تحديث النظام القادم" />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block tracking-widest">محتوى الإعلان / النص</label>
                                    <textarea rows={3} value={newAnnounce.content} onChange={e => setNewAnnounce({...newAnnounce, content: e.target.value})} className="w-full bg-charcoal-900 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-primary" placeholder="اكتب تفاصيل الإعلان هنا..."></textarea>
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block tracking-widest">رابط البانر الصوري (اختياري)</label>
                                    <div className="flex gap-2">
                                        <div className="bg-charcoal-900 p-4 rounded-xl border border-white/5 flex items-center justify-center text-zinc-500"><ImageIcon size={20}/></div>
                                        <input type="text" value={newAnnounce.imageUrl || ''} onChange={e => setNewAnnounce({...newAnnounce, imageUrl: e.target.value})} className="flex-1 bg-charcoal-900 border border-white/5 rounded-xl p-4 text-white text-xs font-mono outline-none focus:border-primary" placeholder="https://..." />
                                    </div>
                                    <p className="text-zinc-500 text-[9px] mt-2">* إذا لم تضع صورة، سيظهر الإعلان كبطاقة ملونة (بانر).</p>
                                </div>
                             </div>

                             <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block tracking-widest">لون الخلفية</label>
                                        <div className="flex items-center gap-3 bg-charcoal-900 p-2 rounded-xl border border-white/5">
                                            <input type="color" value={newAnnounce.backgroundColor} onChange={e => setNewAnnounce({...newAnnounce, backgroundColor: e.target.value})} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                                            <span className="text-[10px] font-mono text-zinc-400">{newAnnounce.backgroundColor}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block tracking-widest">لون النص</label>
                                        <div className="flex items-center gap-3 bg-charcoal-900 p-2 rounded-xl border border-white/5">
                                            <input type="color" value={newAnnounce.textColor} onChange={e => setNewAnnounce({...newAnnounce, textColor: e.target.value})} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                                            <span className="text-[10px] font-mono text-zinc-400">{newAnnounce.textColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Scrolling Ticker Option */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-900 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><MoveHorizontal size={16}/></div>
                                            <div>
                                                <p className="text-white text-sm font-bold">شريط أخبار متحرك</p>
                                                <p className="text-[10px] text-zinc-500">سيظهر كشريط عاجل أعلى الشاشة.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setNewAnnounce({...newAnnounce, isScrolling: !newAnnounce.isScrolling})}
                                            className={`w-12 h-6 rounded-full relative transition-all ${newAnnounce.isScrolling ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-charcoal-800'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newAnnounce.isScrolling ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-charcoal-900 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Monitor size={16}/></div>
                                            <div>
                                                <p className="text-white text-sm font-bold">حالة النشر</p>
                                                <p className="text-[10px] text-zinc-500">تفعيل الإعلان فور الحفظ.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setNewAnnounce({...newAnnounce, isActive: !newAnnounce.isActive})}
                                            className={`w-12 h-6 rounded-full relative transition-all ${newAnnounce.isActive ? 'bg-emerald-500' : 'bg-charcoal-800'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newAnnounce.isActive ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                             </div>
                         </div>

                         <div className="pt-8 border-t border-white/5 flex justify-end gap-4">
                             <button onClick={() => setShowAnnounceForm(false)} className="px-8 py-3 text-zinc-500 font-bold text-sm">إلغاء</button>
                             <button onClick={handleAddAnnouncement} className="bg-primary text-black px-12 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary/20">تأكيد النشر</button>
                         </div>
                     </div>
                 )}

                 {/* Announcements List */}
                 <div className="space-y-6">
                    <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">الإعلانات الحالية ({safeAnnouncements.length})</h4>
                    {safeAnnouncements.length === 0 ? (
                        <div className="h-60 flex flex-col items-center justify-center text-zinc-800 border-4 border-dashed border-white/5 rounded-[40px]">
                            <Megaphone size={48} className="mb-4 opacity-10" />
                            <p className="font-black text-sm uppercase opacity-20">No active internal campaigns</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {safeAnnouncements.map(a => (
                                <div key={a.id} className={`premium-card p-6 rounded-[35px] border border-white/5 bg-charcoal-900/50 flex flex-col justify-between transition-all hover:bg-charcoal-900 group ${!a.isActive ? 'opacity-50 grayscale' : ''}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${a.isScrolling ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {a.isScrolling ? <MoveHorizontal size={18}/> : <Layout size={18}/>}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{a.isScrolling ? 'شريط إخباري' : 'بانر رئيسي'}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleToggleAnnounce(a.id)} className={`p-2 rounded-lg border transition-all ${a.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                                                    <Check size={16}/>
                                                </button>
                                                <button onClick={() => handleDeleteAnnounce(a.id)} className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                        <h5 className="text-white font-black text-lg mb-2 truncate" style={{ color: a.textColor }}>{a.title}</h5>
                                        <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2" style={{ color: a.textColor ? `${a.textColor}cc` : undefined }}>{a.content}</p>
                                    </div>
                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex gap-1">
                                            <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: a.backgroundColor }}></div>
                                            <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: a.textColor }}></div>
                                        </div>
                                        <span className="text-[9px] font-mono text-zinc-600">{new Date(a.date).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};

export default Settings;

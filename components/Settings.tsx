import React, { useState, useRef, useEffect } from 'react';
import { UserRole, User, Announcement, ProductionRequest, RolePermissions, Permissions, AppSettings, Client, RequestStatus } from '../types';
import { Shield, Save, Palette, Megaphone, Plus, Trash2, ShieldCheck, Archive, FolderArchive, Image as ImageIcon, MoveHorizontal, Layout, XCircle, Check, Monitor, RefreshCw, LogIn, Sparkles, Upload, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/realtime';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  currentUser: User;
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  users?: User[];
  clients?: Client[];
  requests?: ProductionRequest[];
  rolePermissions: RolePermissions;
  onUpdatePermissions: (perms: RolePermissions) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onUpdate, currentUser, announcements = [], onUpdateAnnouncements, 
  users = [], clients = [], requests = [],
  rolePermissions, onUpdatePermissions
}) => {
  const [activeTab, setActiveTab] = useState('master_control');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [localPermissions, setLocalPermissions] = useState<RolePermissions>(rolePermissions);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    setLocalSettings(settings);
    setLocalPermissions(rolePermissions);
  }, [settings, rolePermissions]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // حفظ الإعدادات والصلاحيات في قاعدة البيانات
      await api.saveSettings({ ...localSettings, rolePermissions: localPermissions });
      onUpdate(localSettings);
      onUpdatePermissions(localPermissions);
      
      // إرسال تنبيه عبر السوكيت لكافة المستخدمين لتحديث الواجهة فوراً
      getSocket().emit("settings:update", { settings: localSettings, rolePermissions: localPermissions });
      
      alert("✅ تم حفظ وتفعيل الإعدادات والصلاحيات بنجاح عبر النظام بالكامل.");
    } catch (e) {
      alert("❌ خطأ أثناء الحفظ: " + e);
    }
    setIsSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingLogo(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            setLocalSettings({ ...localSettings, appLogo: canvas.toDataURL('image/png', 0.8) });
            setIsProcessingLogo(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePermissionToggle = (role: UserRole, key: keyof Permissions) => {
    if (role === UserRole.ADMIN && key === 'canManageUsers') return;
    const updated = {
      ...localPermissions,
      [role]: { ...localPermissions[role], [key]: !localPermissions[role]?.[key] }
    };
    setLocalPermissions(updated);
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-20 animate-fade-in">
        <Shield size={120} className="mb-8 opacity-10 text-red-500" />
        <h2 className="text-5xl font-black text-white mb-4">وصول مقيد</h2>
        <p className="text-zinc-500 font-bold text-lg">هذا القسم مخصص للمدير العام فقط.</p>
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
      canViewAllRequests: 'عرض الكل',
      canViewInternalNotes: 'الملاحظات الداخلية',
      canApproveTasks: 'اعتماد المهام',
      canPublishTasks: 'نشر المهام',
      canSeeActivityLog: 'سجل النشاط',
      canManageFinance: 'المالية',
      canViewFinancials: 'السجلات المالية'
  };

  return (
    <div className="p-4 md:p-12 h-full flex flex-col animate-fade-in overflow-hidden bg-charcoal-950">
      
      {/* Top Bar Settings */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/5 pb-12 gap-6">
        <div className="text-right">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Command Center</h2>
            <div className="p-3 bg-primary/20 rounded-2xl text-primary animate-pulse"><ShieldCheck size={40} /></div>
          </div>
          <p className="text-zinc-500 font-bold text-xl">لوحة تحكم المدير العام - التحكم في كامل النظام</p>
        </div>
        <button 
          onClick={handleSaveAll} 
          disabled={isSaving}
          className="bg-primary text-black px-12 py-5 rounded-[28px] font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
          تطبيق وحفظ كافة التعديلات
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-12 mb-12 justify-start md:justify-end overflow-x-auto no-scrollbar pb-2 border-b border-white/5">
         {[
            { id: 'master_control', label: 'الهوية البصرية', icon: Palette },
            { id: 'login_config', label: 'واجهة الدخول', icon: LogIn },
            { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Shield },
            { id: 'trash', label: 'سلة الأرشيف', icon: Archive },
         ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-4 px-2 text-xs font-black transition-all border-b-4 flex items-center justify-center gap-3 uppercase tracking-wider whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
                <tab.icon size={18} /> {tab.label}
            </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-12 pb-24 custom-scrollbar pr-4">
         
         {/* Visual Identity Tab */}
         {activeTab === 'master_control' && (
             <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><Palette className="text-primary"/> شعار النظام واسمه</h3>
                    <div className="space-y-8">
                        <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl bg-black/40 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                                    {isProcessingLogo ? <Loader2 className="animate-spin text-primary"/> : <img src={localSettings.appLogo} className="max-w-full max-h-full object-contain p-2" />}
                                </div>
                                <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                                    <Upload className="text-white" size={24}/>
                                </button>
                                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">اسم التطبيق / الوكالة</label>
                                <input 
                                    type="text" 
                                    value={localSettings.appName} 
                                    onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} 
                                    className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-xl font-bold text-white outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><Sparkles className="text-primary"/> اللون الأساسي للنظام</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 p-6 bg-charcoal-800 rounded-3xl border border-white/5">
                            <input 
                                type="color" 
                                value={localSettings.primaryColor} 
                                onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} 
                                className="w-20 h-20 rounded-2xl bg-transparent border-none cursor-pointer"
                            />
                            <div>
                                <div className="text-2xl font-mono font-black text-white mb-1 uppercase">{localSettings.primaryColor}</div>
                                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Global Brand Color</div>
                            </div>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed">تغيير هذا اللون سيؤدي لتغيير مظهر كافة الأزرار، التنبيهات، والرسوم البيانية في النظام فوراً عند جميع المستخدمين.</p>
                    </div>
                 </div>
             </div>
         )}

         {/* Login Page Config Tab */}
         {activeTab === 'login_config' && (
             <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><LogIn className="text-primary"/> نصوص صفحة الدخول</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">العنوان الترحيبي الرئيسي</label>
                            <input 
                                type="text" 
                                value={localSettings.loginHeadline || localSettings.appName} 
                                onChange={e => setLocalSettings({...localSettings, loginHeadline: e.target.value})} 
                                className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary"
                                placeholder="أهلاً بك في نظام Flow"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">النص الفرعي (Tagline)</label>
                            <input 
                                type="text" 
                                value={localSettings.loginSubtext || 'Professional Enterprise Flow'} 
                                onChange={e => setLocalSettings({...localSettings, loginSubtext: e.target.value})} 
                                className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-primary"
                                placeholder="النظام المتكامل لإدارة المشاريع"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">لون خلفية صفحة الدخول</label>
                            <div className="flex items-center gap-4 bg-charcoal-800 p-3 rounded-2xl border border-white/5">
                                <input 
                                    type="color" 
                                    value={localSettings.loginBgColor || '#020617'} 
                                    onChange={e => setLocalSettings({...localSettings, loginBgColor: e.target.value})} 
                                    className="w-10 h-10 rounded-lg cursor-pointer"
                                />
                                <span className="text-white font-mono text-xs">{localSettings.loginBgColor || '#020617'}</span>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50 flex flex-col items-center justify-center text-center">
                    <div className="w-48 h-48 border-4 border-dashed border-white/5 rounded-[40px] flex items-center justify-center opacity-20">
                        <Monitor size={64}/>
                    </div>
                    <h4 className="text-zinc-500 font-bold mt-6 uppercase tracking-widest text-xs">Live Preview (SOON)</h4>
                    <p className="text-zinc-600 text-[10px] mt-2">نظام المعاينة الفورية لواجهة الدخول قيد التطوير.</p>
                 </div>
             </div>
         )}

         {/* Permissions Tab */}
         {activeTab === 'permissions' && (
             <div className="animate-slide-up premium-card p-12 rounded-[50px] border-white/5 overflow-x-auto bg-charcoal-900/50">
                 <div className="mb-10 flex justify-between items-center">
                     <div>
                        <h3 className="text-white font-black text-3xl">مصفوفة صلاحيات النظام</h3>
                        <p className="text-zinc-500 text-sm mt-2">تحكم كامل فيما يمكن لكل موظف القيام به. التغييرات تتفعل فورياً.</p>
                     </div>
                     <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Live Matrix Sync Active</span>
                     </div>
                 </div>
                 
                 <table className="w-full text-right border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-white/10 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                            <th className="pb-8 pr-4">الدور الوظيفي</th>
                            {Object.values(permissionLabels).map(label => <th key={label} className="pb-8 text-center px-2">{label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(UserRole).map(role => (
                            <tr key={role as string} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                <td className="py-8 pr-4">
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-sm uppercase tracking-tighter group-hover:text-primary transition-colors">{role as string}</span>
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Role Group</span>
                                    </div>
                                </td>
                                {Object.keys(permissionLabels).map(key => {
                                    const rolePerms = localPermissions[role] || {};
                                    const isActive = rolePerms[key as keyof Permissions];
                                    return (
                                        <td key={key as string} className="py-8 text-center px-2">
                                            <div 
                                                onClick={() => handlePermissionToggle(role, key as keyof Permissions)}
                                                className={`w-8 h-8 rounded-xl border mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${isActive ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-zinc-500 bg-black/20'}`}
                                            >
                                                {isActive && <Check size={18} strokeWidth={4} />}
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

         {/* Trash Tab (Simplified logic from before but in unified Settings) */}
         {activeTab === 'trash' && (
             <div className="animate-slide-up space-y-10">
                 <div className="premium-card p-10 rounded-[40px] border border-red-500/10 bg-red-950/5">
                     <div className="flex justify-between items-center mb-8">
                        <h3 className="text-white font-black text-2xl flex items-center gap-3"><Archive className="text-red-500"/> سلة المهملات والأرشيف</h3>
                        <span className="bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase">Restricted Area</span>
                     </div>
                     <p className="text-zinc-500 mb-8">يمكنك هنا استعادة الحسابات أو العملاء الذين تم إيقافهم أو نقلهم للأرشيف.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5">
                            <div className="text-zinc-500 text-[10px] font-bold uppercase mb-4 tracking-widest">المستخدمون الموقوفون</div>
                            <div className="text-2xl font-black text-white">{users.filter(u => u.status === 'Inactive' || u.isDeleted).length}</div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5">
                            <div className="text-zinc-500 text-[10px] font-bold uppercase mb-4 tracking-widest">العملاء المؤرشفون</div>
                            <div className="text-2xl font-black text-white">{clients.filter(c => c.status === 'Inactive').length}</div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5">
                            <div className="text-zinc-500 text-[10px] font-bold uppercase mb-4 tracking-widest">المهام المكتملة/المؤرشفة</div>
                            <div className="text-2xl font-black text-white">{requests.filter(r => !r.isActive || r.status === RequestStatus.ARCHIVED).length}</div>
                        </div>
                     </div>
                 </div>
             </div>
         )}
         
      </div>
    </div>
  );
};

export default Settings;
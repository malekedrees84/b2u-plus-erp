import React, { useState, useRef, useEffect } from 'react';
import { UserRole, User, Announcement, ProductionRequest, RolePermissions, Permissions, AppSettings, Client } from '../types';
import { Shield, Save, Palette, Megaphone, Plus, Trash2, ShieldCheck, Archive, Image as ImageIcon, MoveHorizontal, Layout, XCircle, Check, Monitor, RefreshCw, LogIn, Sparkles, Upload, Loader2, Type, PaintBucket, RotateCcw } from 'lucide-react';
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
  rolePermissions, onUpdatePermissions
}) => {
  const [activeTab, setActiveTab] = useState('visual_identity');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [localPermissions, setLocalPermissions] = useState<RolePermissions>(rolePermissions);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = 
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role as string) === 'Admin' || 
    currentUser.username === 'admin' || 
    currentUser.username === 'tamir';

  useEffect(() => {
    if (settings) setLocalSettings(settings);
    if (rolePermissions) setLocalPermissions(rolePermissions);
  }, [settings, rolePermissions]);

  const handleSaveAll = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      await api.saveSettings({ ...localSettings, rolePermissions: localPermissions });
      onUpdate(localSettings);
      onUpdatePermissions(localPermissions);
      getSocket().emit("settings:update", { settings: localSettings, rolePermissions: localPermissions });
      alert("✅ تم حفظ وتطبيق الهوية الجديدة بنجاح على كامل النظام.");
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
      <div className="h-full flex flex-col items-center justify-center text-center p-20 animate-fade-in bg-charcoal-950">
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
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/5 pb-12 gap-6">
        <div className="text-right">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Identity Lab</h2>
            <div className="p-3 bg-primary/20 rounded-2xl text-primary animate-pulse"><Palette size={40} /></div>
          </div>
          <p className="text-zinc-500 font-bold text-xl">مختبر الهوية البصرية - خصص مظهر النظام ليناسب علامتك التجارية</p>
        </div>
        <div className="flex gap-4">
             <button 
                onClick={() => setLocalSettings(settings)}
                className="px-6 py-5 rounded-[24px] border border-white/10 text-zinc-400 font-bold hover:bg-white/5 transition-all flex items-center gap-2"
             >
                <RotateCcw size={18} /> تراجع
             </button>
             <button 
                onClick={handleSaveAll} 
                disabled={isSaving}
                className="bg-primary text-black px-12 py-5 rounded-[28px] font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 transition-all disabled:opacity-50"
             >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                حفظ ونشر الهوية
             </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-10 mb-12 justify-start overflow-x-auto no-scrollbar pb-2 border-b border-white/5">
         {[
            { id: 'visual_identity', label: 'الهوية البصرية', icon: Palette },
            { id: 'login_config', label: 'تجربة الدخول', icon: LogIn },
            { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Shield },
            { id: 'archive', label: 'الأرشيف', icon: Archive },
         ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-4 px-2 text-xs font-black transition-all border-b-4 flex items-center justify-center gap-3 uppercase tracking-widest whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
                <tab.icon size={18} /> {tab.label}
            </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-12 pb-24 custom-scrollbar pr-4">
         
         {/* --- Tab 1: Visual Identity --- */}
         {activeTab === 'visual_identity' && (
             <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* App Name & Logo */}
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><ImageIcon className="text-primary"/> الشعار والاسم الرسمي</h3>
                    <div className="space-y-8">
                        <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl bg-black/40 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                                    {isProcessingLogo ? <Loader2 className="animate-spin text-primary"/> : <img src={localSettings.appLogo} className="max-w-full max-h-full object-contain p-2" />}
                                </div>
                                <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl backdrop-blur-sm">
                                    <Upload className="text-white" size={24}/>
                                </button>
                                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">اسم النظام / الوكالة</label>
                                    <input 
                                        type="text" 
                                        value={localSettings.appName} 
                                        onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} 
                                        className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-xl font-bold text-white outline-none focus:border-primary"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 leading-relaxed italic">يظهر هذا الاسم في العناوين، رسائل البريد الإلكتروني، والواتساب.</p>
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* System Colors */}
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><PaintBucket className="text-primary"/> ألوان النظام الأساسية</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex items-center gap-6 p-6 bg-charcoal-800 rounded-3xl border border-white/5">
                            <input 
                                type="color" 
                                value={localSettings.primaryColor} 
                                onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} 
                                className="w-20 h-20 rounded-2xl bg-transparent border-none cursor-pointer"
                            />
                            <div className="flex-1">
                                <div className="text-2xl font-mono font-black text-white mb-1 uppercase tracking-tighter">{localSettings.primaryColor}</div>
                                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Brand Primary Color</div>
                                <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full" style={{ backgroundColor: localSettings.primaryColor, width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center">اللون الأساسي يؤثر على الأزرار، الأيقونات النشطة، وعناصر التحميل.</p>
                    </div>
                 </div>
             </div>
         )}

         {/* --- Tab 2: Login Experience --- */}
         {activeTab === 'login_config' && (
             <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Content Config */}
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-charcoal-900/50">
                    <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3"><Type className="text-primary"/> محتوى صفحة الدخول</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">العنوان الترحيبي (Headline)</label>
                            <input 
                                type="text" 
                                value={localSettings.loginHeadline || ''} 
                                onChange={e => setLocalSettings({...localSettings, loginHeadline: e.target.value})} 
                                placeholder={localSettings.appName}
                                className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-primary font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">الوصف الفرعي (Subtext)</label>
                            <textarea 
                                rows={3}
                                value={localSettings.loginSubtext || ''} 
                                onChange={e => setLocalSettings({...localSettings, loginSubtext: e.target.value})} 
                                placeholder="مثال: Professional Enterprise Flow"
                                className="w-full bg-charcoal-800 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-primary text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">لون خلفية صفحة الدخول</label>
                            <div className="flex items-center gap-4 bg-charcoal-800 p-4 rounded-2xl border border-white/5">
                                <input 
                                    type="color" 
                                    value={localSettings.loginBgColor || '#020617'} 
                                    onChange={e => setLocalSettings({...localSettings, loginBgColor: e.target.value})} 
                                    className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                                />
                                <span className="text-sm font-mono text-zinc-400 uppercase">{localSettings.loginBgColor || '#020617'}</span>
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Preview Section */}
                 <div className="premium-card p-10 rounded-[40px] border-white/5 bg-black/40 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none" style={{ backgroundColor: localSettings.primaryColor }}></div>
                    <div className="text-[10px] font-black text-zinc-700 absolute top-6 right-8 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Monitor size={12}/> Live Preview (Login)
                    </div>
                    
                    <div className="relative z-10 w-full max-w-[280px] bg-charcoal-950 p-8 rounded-[40px] border border-white/10 shadow-2xl flex flex-col items-center text-center scale-90 md:scale-100" style={{ backgroundColor: localSettings.loginBgColor }}>
                        <img src={localSettings.appLogo} className="w-16 h-16 object-contain mb-6 drop-shadow-lg" alt="logo"/>
                        <h4 className="text-white font-black text-xl mb-2">{localSettings.loginHeadline || localSettings.appName}</h4>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-8">{localSettings.loginSubtext || 'Secure Access Panel'}</p>
                        <div className="w-full h-10 rounded-xl bg-white/5 border border-white/5 mb-3"></div>
                        <div className="w-full h-10 rounded-xl bg-white/5 border border-white/5 mb-4"></div>
                        <div className="w-full py-3 rounded-xl font-black text-[10px] text-black" style={{ backgroundColor: localSettings.primaryColor }}>تسجيل الدخول</div>
                    </div>
                 </div>
             </div>
         )}

         {/* --- Tab 3: Permissions Matrix --- */}
         {activeTab === 'permissions' && (
             <div className="animate-slide-up premium-card p-12 rounded-[50px] border-white/5 overflow-x-auto bg-charcoal-900/50">
                 <div className="mb-10 flex justify-between items-center">
                     <div>
                        <h3 className="text-white font-black text-3xl">مصفوفة صلاحيات النظام</h3>
                        <p className="text-zinc-500 text-sm mt-2">تحكم كامل فيما يمكن لكل دور وظيفي القيام به.</p>
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
                                    <span className="text-white font-black text-sm uppercase tracking-tighter group-hover:text-primary transition-colors">{role as string}</span>
                                </td>
                                {Object.keys(permissionLabels).map(key => {
                                    const isActive = localPermissions[role]?.[key as keyof Permissions];
                                    return (
                                        <td key={key as string} className="py-8 text-center px-2">
                                            <div 
                                                onClick={() => handlePermissionToggle(role, key as keyof Permissions)}
                                                className={`w-8 h-8 rounded-xl border mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${isActive ? 'bg-primary border-primary text-black' : 'border-white/10 hover:border-zinc-500 bg-black/20'}`}
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

         {/* --- Tab 4: Archive (Empty placeholder for now) --- */}
         {activeTab === 'archive' && (
             <div className="animate-slide-up h-64 flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-white/5 rounded-[50px]">
                 <Archive size={64} className="mb-4 opacity-10 text-zinc-400" />
                 <h4 className="text-white font-bold text-lg">سلة المحذوفات المركزية</h4>
                 <p className="text-zinc-600 text-sm mt-2">قريباً: إدارة كافة العناصر المحذوفة واستعادتها من مكان واحد.</p>
             </div>
         )}

      </div>
    </div>
  );
};

export default Settings;
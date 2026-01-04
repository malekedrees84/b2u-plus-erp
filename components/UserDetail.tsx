
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, ProductionRequest, Permissions } from '../types';
import { X, Camera, Mail, Briefcase, Shield, Save, Trash2, Activity, CheckCircle2, RefreshCw, Lock, Eye, EyeOff, Upload, Clock, Wifi, Loader2, Check, Phone, Power } from 'lucide-react';
import { AVAILABLE_DEPARTMENTS } from '../constants';

interface UserDetailProps {
  user: User;
  currentUser: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  onDelete?: (userId: string) => void;
  requests: ProductionRequest[];
}

const EXTRA_PERMISSIONS: { label: string; key: keyof Permissions }[] = [
    { label: 'الإدارة المالية', key: 'canManageFinance' },
    { label: 'إدارة المستخدمين', key: 'canManageUsers' },
    { label: 'نشر الإعلانات', key: 'canPostAnnouncements' },
    { label: 'حذف طلبات', key: 'canDeleteRequest' },
    { label: 'إدارة التقارير', key: 'canViewReports' }
];

const UserDetail: React.FC<UserDetailProps> = ({ user, currentUser, onClose, onUpdate, onDelete, requests }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(() => {
      // Ensure departments array is synced with department string
      const baseDepts = user.departments || [];
      const derivedDepts = baseDepts.length === 0 && user.department 
        ? user.department.split(/،|,/).map(d => d.trim()).filter(Boolean) 
        : baseDepts;
      
      // Ensure roles array is synced. If new system, it has roles. If old, derive from role.
      const baseRoles = user.roles || [user.role];

      return { ...user, departments: derivedDepts, roles: baseRoles, customPermissions: user.customPermissions || {} };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stats - Safe filter
  const userTasks = requests.filter(r => r && r.assigneeId === user.id);
  const completedTasks = userTasks.filter(r => r.status.includes('تم') || r.status.includes('منشور')).length;

  // Online Logic
  const getLastSeenStatus = () => {
    if (!user.lastSeen) return { isOnline: false, text: 'غير معروف' };
    const diff = new Date().getTime() - new Date(user.lastSeen).getTime();
    const isOnline = diff < 120000; // 2 mins
    return { 
        isOnline, 
        text: isOnline ? 'متصل الآن' : `آخر ظهور: ${new Date(user.lastSeen).toLocaleString('ar-EG')}` 
    };
  };
  const statusInfo = getLastSeenStatus();

  useEffect(() => {
      if (currentUser.id === user.id) {
         // Optional: open edit if needed
      }
  }, [currentUser.id, user.id]);

  const handleSave = () => {
    // Explicitly include customPermissions in the update payload
    onUpdate({
        ...formData,
        role: formData.roles && formData.roles.length > 0 ? formData.roles[0] : formData.role, // Primary role is first one
        department: formData.departments ? formData.departments.join('، ') : formData.department,
        lastUpdated: new Date().toISOString(),
        customPermissions: formData.customPermissions // Ensure overrides are passed
    });
    setIsEditing(false);
  };

  const generateRandomAvatar = () => {
    const randomColor = Math.floor(Math.random()*16777215).toString(16);
    setFormData({...formData, avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=${randomColor}&color=fff`});
  };

  const toggleDepartment = (dept: string) => {
    const currentDepts = formData.departments || [];
    const newDepts = currentDepts.includes(dept) 
        ? currentDepts.filter(d => d !== dept) 
        : [...currentDepts, dept];
    
    setFormData({...formData, departments: newDepts});
  };

  const toggleRole = (role: UserRole) => {
      const currentRoles = formData.roles || [formData.role];
      const newRoles = currentRoles.includes(role)
        ? (currentRoles.length > 1 ? currentRoles.filter(r => r !== role) : currentRoles) // Prevent empty roles
        : [...currentRoles, role];
      
      setFormData({ ...formData, roles: newRoles });
  };

  const toggleCustomPermission = (key: keyof Permissions) => {
      const current = formData.customPermissions || {};
      setFormData({
          ...formData,
          customPermissions: {
              ...current,
              [key]: !current[key]
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 300; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            
            setFormData({ ...formData, avatar: compressedDataUrl });
            setIsProcessingImage(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isOwner = currentUser.id === user.id;
  const canEdit = isAdmin || isOwner;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-charcoal-900 h-full shadow-2xl border-r border-charcoal-800 flex flex-col animate-slide-in-right overflow-hidden">
         
         {/* Header Image / Cover */}
         <div className="h-32 bg-gradient-to-r from-charcoal-800 to-primary/20 relative">
             <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"><X size={20} /></button>
             
             {/* Connection Status Badge */}
             <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 ${statusInfo.isOnline ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-white/10 text-zinc-400'}`}>
                 {statusInfo.isOnline ? <Wifi size={14} className="animate-pulse"/> : <Clock size={14}/>}
                 <span className="text-[10px] font-bold">{statusInfo.text}</span>
             </div>

             {/* Account Status Badge (Active/Inactive) */}
             <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 ${user.status === 'Active' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                 <Power size={14} />
                 <span className="text-[10px] font-bold uppercase">{user.status === 'Active' ? 'حساب فعال' : 'حساب موقوف'}</span>
             </div>
         </div>

         <div className="px-8 -mt-16 flex-1 overflow-y-auto custom-scrollbar pb-10">
             {/* Profile Picture Section */}
             <div className="relative w-32 h-32 mx-auto mb-6 group">
                 {isProcessingImage ? (
                    <div className="w-full h-full rounded-full bg-charcoal-800 flex items-center justify-center border-4 border-charcoal-900">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                 ) : (
                    <img src={formData.avatar} className="w-full h-full rounded-full border-4 border-charcoal-900 object-contain shadow-2xl bg-black" alt="avatar" />
                 )}
                 
                 {canEdit && (
                     <>
                        <div className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center gap-2 transition-opacity border-4 border-charcoal-900 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                             <button onClick={() => fileInputRef.current?.click()} title="رفع صورة" className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm"><Upload size={16} /></button>
                             {isEditing && <button onClick={generateRandomAvatar} title="توليد صورة عشوائية" className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm"><RefreshCw size={16} /></button>}
                        </div>
                     </>
                 )}
                 <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-charcoal-900 flex items-center justify-center ${statusInfo.isOnline ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
                    {statusInfo.isOnline && <div className="w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>}
                 </div>
             </div>

             {/* Header Info */}
             <div className="text-center mb-8">
                 {isEditing ? (
                     <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="bg-transparent border-b border-zinc-700 text-center text-2xl font-bold text-white focus:border-primary outline-none pb-2 mb-2 w-full"
                     />
                 ) : (
                     <h2 className="text-3xl font-bold text-white mb-2">{user.name}</h2>
                 )}
                 <div className="flex flex-wrap items-center justify-center gap-2">
                    {(formData.roles && formData.roles.length > 0 ? formData.roles : [user.role]).map(r => (
                        <span key={r as string} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">{r as string}</span>
                    ))}
                    {user.departments && user.departments.length > 0 ? (
                        user.departments.map(dept => (
                            <span key={dept} className="px-3 py-1 rounded-full bg-charcoal-800 text-zinc-400 text-xs border border-charcoal-700">{dept}</span>
                        ))
                    ) : (
                         <span className="px-3 py-1 rounded-full bg-charcoal-800 text-zinc-400 text-xs border border-charcoal-700">{user.department || 'عام'}</span>
                    )}
                 </div>
             </div>

             {/* Stats Cards */}
             <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-charcoal-800/50 p-4 rounded-2xl border border-charcoal-700 text-center">
                     <Activity className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                     <div className="text-2xl font-black text-white">{userTasks.length}</div>
                     <div className="text-xs text-zinc-500">مهام مسندة</div>
                 </div>
                 <div className="bg-charcoal-800/50 p-4 rounded-2xl border border-charcoal-700 text-center">
                     <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                     <div className="text-2xl font-black text-white">{completedTasks}</div>
                     <div className="text-xs text-zinc-500">مهام مكتملة</div>
                 </div>
             </div>

             {/* Editing Form */}
             <div className="space-y-6">
                 <div className="flex items-center justify-between border-b border-charcoal-800 pb-2 mb-4">
                     <h3 className="text-white font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary"/> البيانات الوظيفية</h3>
                     {!isEditing && canEdit && (
                         <button onClick={() => setIsEditing(true)} className="text-xs text-primary hover:underline">تعديل الملف</button>
                     )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                         <label className="text-xs text-zinc-500">البريد الإلكتروني</label>
                         <div className="flex items-center gap-2 bg-charcoal-800 p-3 rounded-xl border border-charcoal-700">
                             <Mail size={16} className="text-zinc-500" />
                             {isEditing ? (
                                 <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-transparent w-full outline-none text-white text-sm" />
                             ) : (
                                 <span className="text-sm text-zinc-300 truncate">{user.email}</span>
                             )}
                         </div>
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs text-zinc-500">رقم الهاتف (واتساب)</label>
                         <div className="flex items-center gap-2 bg-charcoal-800 p-3 rounded-xl border border-charcoal-700">
                             <Phone size={16} className="text-zinc-500" />
                             {isEditing ? (
                                 <input 
                                    type="tel"
                                    value={formData.phone || ''} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                    className="bg-transparent w-full outline-none text-white text-sm font-mono" 
                                    placeholder="972xxxxxxxxx"
                                    dir="ltr"
                                 />
                             ) : (
                                 <span className="text-sm text-zinc-300 truncate font-mono" dir="ltr">{user.phone || 'غير مسجل'}</span>
                             )}
                         </div>
                     </div>
                     
                     <div className="space-y-2">
                         <label className="text-xs text-zinc-500">كلمة المرور</label>
                         <div className="flex items-center gap-2 bg-charcoal-800 p-3 rounded-xl border border-charcoal-700 relative">
                             <Lock size={16} className="text-zinc-500" />
                             {isEditing ? (
                                 <>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={formData.password || ''} 
                                        onChange={e => setFormData({...formData, password: e.target.value})} 
                                        className="bg-transparent w-full outline-none text-white text-sm" 
                                        placeholder="تعيين كلمة مرور جديدة"
                                    />
                                    <button onClick={() => setShowPassword(!showPassword)} type="button" className="text-zinc-500 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                 </>
                             ) : (
                                 <span className="text-sm text-zinc-300 truncate font-mono tracking-widest">••••••••</span>
                             )}
                         </div>
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs text-zinc-500">رابط الصورة (URL)</label>
                         <div className="flex items-center gap-2 bg-charcoal-800 p-3 rounded-xl border border-charcoal-700">
                             <Camera size={16} className="text-zinc-500" />
                             {isEditing ? (
                                 <input value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} className="bg-transparent w-full outline-none text-white text-sm" placeholder="https://..." />
                             ) : (
                                 <span className="text-sm text-zinc-300 truncate opacity-50">رابط خارجي</span>
                             )}
                         </div>
                     </div>

                     {isEditing && isAdmin && (
                        <>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs text-zinc-500 mb-2 block">الأدوار الوظيفية (تحديد متعدد)</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(UserRole).map(role => {
                                        const isSelected = formData.roles?.includes(role) || (!formData.roles && role === formData.role);
                                        return (
                                            <button 
                                                key={role as string}
                                                type="button"
                                                onClick={() => toggleRole(role)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-primary/20 text-primary border-primary' : 'bg-charcoal-800 text-zinc-400 border-white/5'}`}
                                            >
                                                {isSelected && <Check size={10} />} {role as string}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs text-zinc-500 mb-2 block">الأقسام (تحديد متعدد)</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_DEPARTMENTS.map(dept => {
                                        const isSelected = formData.departments?.includes(dept);
                                        return (
                                            <button 
                                                key={dept}
                                                type="button"
                                                onClick={() => toggleDepartment(dept)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-primary/20 text-primary border-primary' : 'bg-charcoal-800 text-zinc-400 border-white/5'}`}
                                            >
                                                {isSelected && <Check size={10} />} {dept}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* CUSTOM PERMISSIONS OVERRIDE */}
                            <div className="space-y-2 col-span-2 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block tracking-widest">تخصيص صلاحيات خاصة (Override)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EXTRA_PERMISSIONS.map(p => {
                                        const isActive = formData.customPermissions?.[p.key];
                                        return (
                                            <button 
                                                key={p.key as string}
                                                type="button"
                                                onClick={() => toggleCustomPermission(p.key)}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between ${isActive ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-charcoal-800 text-zinc-500 border-white/5'}`}
                                            >
                                                {p.label}
                                                {isActive && <Check size={12}/>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500">حالة الحساب (تفعيل/إيقاف)</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="Active">نشط (Active)</option>
                                    <option value="Inactive">موقوف (Inactive)</option>
                                    <option value="Pending">معلق (Pending)</option>
                                </select>
                            </div>
                        </>
                     )}
                 </div>

                 {/* Danger Zone */}
                 {isAdmin && user.id !== currentUser.id && (
                    <div className="mt-12 pt-8 border-t border-red-500/20">
                        <h3 className="text-red-500 font-bold text-sm mb-4 flex items-center gap-2"><Shield size={16}/> منطقة الخطر</h3>
                        <div className="flex items-center justify-between bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                            <div>
                                <p className="text-white text-sm font-bold">حذف العضو</p>
                                <p className="text-zinc-500 text-xs mt-1">سيتم نقل العضو إلى سلة المهملات ويمكنك استعادته من الإعدادات.</p>
                            </div>
                            <button onClick={() => { if(confirm('هل أنت متأكد؟ سيتم إيقاف العضو ونقله لسلة المهملات.')) { onDelete?.(user.id); onClose(); } }} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                <Trash2 size={16} /> نقل للسلة
                            </button>
                        </div>
                    </div>
                 )}
             </div>
         </div>

         {/* Footer Actions */}
         {isEditing && (
            <div className="p-6 border-t border-charcoal-800 bg-charcoal-900 flex justify-end gap-3 z-10">
                <button onClick={() => {setIsEditing(false); setFormData(user);}} className="text-zinc-400 text-sm font-bold px-4 py-2 hover:text-white">إلغاء</button>
                <button onClick={handleSave} className="bg-primary text-black px-6 py-2 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                    <Save size={16} /> حفظ التغييرات
                </button>
            </div>
         )}
      </div>
    </div>
  );
};
export default UserDetail;


import React, { useState } from 'react';
import { X, User, Briefcase, Mail, Key, Shield, Save, Check, Phone } from 'lucide-react';
import { User as UserType, UserRole, Permissions } from '../types';
import { AVAILABLE_DEPARTMENTS } from '../constants';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserType) => void;
  currentUser: UserType;
}

const EXTRA_PERMISSIONS: { label: string; key: keyof Permissions }[] = [
    { label: 'الإدارة المالية', key: 'canManageFinance' },
    { label: 'إدارة المستخدمين', key: 'canManageUsers' },
    { label: 'نشر الإعلانات', key: 'canPostAnnouncements' },
    { label: 'حذف طلبات', key: 'canDeleteRequest' },
    { label: 'إدارة التقارير', key: 'canViewReports' }
];

const UserDrawer: React.FC<UserDrawerProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Changed to array for multiple selection
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([UserRole.CREATOR]);
  
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [customPermissions, setCustomPermissions] = useState<Partial<Permissions>>({});

  if (!isOpen) return null;

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleRole = (role: UserRole) => {
      setSelectedRoles(prev => {
          if (prev.includes(role)) {
              // Don't allow empty roles, keep at least one
              if (prev.length === 1) return prev;
              return prev.filter(r => r !== role);
          } else {
              return [...prev, role];
          }
      });
  };

  const togglePermission = (key: keyof Permissions) => {
      setCustomPermissions(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;
    
    onSave({ 
      id: crypto.randomUUID(), 
      name, 
      email,
      phone, 
      username,
      password,
      role: selectedRoles[0], // Primary role is the first one
      roles: selectedRoles, // All roles
      departments: selectedDepartments,
      department: selectedDepartments.join('، '), // Legacy support
      status: 'Active', 
      avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=3b82f6&color=fff`,
      isDeleted: false,
      customPermissions: customPermissions // Save custom overrides
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-charcoal-900 h-full shadow-2xl border-r border-white/5 flex flex-col animate-slide-in-right overflow-hidden">
         <div className="p-6 border-b border-white/5 bg-charcoal-950 flex justify-between items-center">
            <div>
              <h2 className="text-white font-black text-xl uppercase tracking-tighter">دعوة عضو جديد</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">تجهيز ملف تعريف الموظف</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"><X size={20} /></button>
         </div>

         <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-charcoal-900">
             <div className="space-y-4">
               <div>
                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">الاسم الكامل</label>
                 <div className="relative">
                   <User className="absolute right-4 top-3.5 text-zinc-600" size={18} />
                   <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أحمد محمد" className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-12 pl-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-all" />
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">اسم المستخدم للدخول</label>
                 <div className="relative">
                   <Shield className="absolute right-4 top-3.5 text-zinc-600" size={18} />
                   <input required type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" dir="ltr" className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-12 pl-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-all" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">كلمة المرور المؤقتة</label>
                   <div className="relative">
                     <Key className="absolute right-4 top-3.5 text-zinc-600" size={18} />
                     <input required type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-12 pl-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-all" />
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">البريد الإلكتروني</label>
                 <div className="relative">
                   <Mail className="absolute right-4 top-3.5 text-zinc-600" size={18} />
                   <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@b2u.com" dir="ltr" className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-12 pl-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-all" />
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">رقم الهاتف (للواتساب)</label>
                 <div className="relative">
                   <Phone className="absolute right-4 top-3.5 text-zinc-600" size={18} />
                   <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="9725xxxxxxxx" 
                    dir="ltr" 
                    className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-12 pl-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-all font-mono" 
                   />
                 </div>
                 <p className="text-[9px] text-zinc-600 mt-1 mr-1">يفضل استخدام الصيغة الدولية (مثال: 97259xxxxxxx) لضمان عمل الروابط.</p>
               </div>

               <div className="space-y-4 pt-4 border-t border-white/5">
                 <div>
                   <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">الأدوار الوظيفية (متعدد)</label>
                   <div className="flex flex-wrap gap-2">
                       {Object.values(UserRole).map(r => {
                           const isSelected = selectedRoles.includes(r);
                           return (
                               <button 
                                key={r as string} 
                                type="button"
                                onClick={() => toggleRole(r)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-primary text-black border-primary' : 'bg-charcoal-800 text-zinc-400 border-white/5 hover:border-white/20'}`}
                               >
                                   {isSelected && <Check size={12}/>} {r as string}
                               </button>
                           )
                       })}
                   </div>
                   <p className="text-[9px] text-zinc-600 mt-2">يمكن اختيار أكثر من دور؛ سيحصل العضو على صلاحيات جميع الأدوار المختارة.</p>
                 </div>
                 
                 <div>
                   <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">الأقسام (يمكن اختيار أكثر من قسم)</label>
                   <div className="flex flex-wrap gap-2">
                      {AVAILABLE_DEPARTMENTS.map(dept => {
                        const isSelected = selectedDepartments.includes(dept);
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => toggleDepartment(dept)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-primary text-black border-primary' : 'bg-charcoal-800 text-zinc-400 border-white/5 hover:border-white/20'}`}
                          >
                            {isSelected && <Check size={12} />}
                            {dept}
                          </button>
                        );
                      })}
                   </div>
                 </div>

                 <div className="pt-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">تخصيص صلاحيات الوصول (Override)</label>
                    <div className="grid grid-cols-2 gap-2">
                        {EXTRA_PERMISSIONS.map(p => {
                            const isActive = customPermissions[p.key];
                            return (
                                <button
                                    key={p.key as string}
                                    type="button"
                                    onClick={() => togglePermission(p.key)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between ${isActive ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-charcoal-800 text-zinc-500 border-white/5'}`}
                                >
                                    {p.label}
                                    {isActive && <Check size={12}/>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-2">امنح صلاحيات خاصة لهذا العضو بغض النظر عن دوره الوظيفي.</p>
                 </div>
               </div>
             </div>
         </form>

         <div className="p-6 border-t border-white/5 bg-charcoal-950 flex gap-3">
             <button onClick={onClose} className="flex-1 py-4 text-zinc-500 font-bold text-sm hover:text-white transition-colors">إلغاء</button>
             <button onClick={handleSubmit} className="flex-[2] bg-primary text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20">
                 <Save size={18} /> إنشاء العضوية
             </button>
         </div>
      </div>
    </div>
  );
};
export default UserDrawer;

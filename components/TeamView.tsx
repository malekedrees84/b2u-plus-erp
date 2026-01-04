
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Plus, Briefcase, Trash2, Clock, Wifi, WifiOff, Link, Copy, Check, ShieldCheck, UserPlus, X, RefreshCw } from 'lucide-react';

interface TeamViewProps {
  users: User[];
  currentUser: User;
  onAddUser: () => void;
  onUserClick: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUser: (user: User) => void;
}

const TeamView: React.FC<TeamViewProps> = ({ users, currentUser, onAddUser, onUserClick, onDeleteUser, onUpdateUser }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isSuperUser = currentUser.username === 'tamir' || currentUser.role === UserRole.ADMIN;
  const [copied, setCopied] = useState(false);
  
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const getLastSeenInfo = (lastSeen?: string) => {
      if (!lastSeen) return { isOnline: false, text: 'غير معروف' };
      const last = new Date(lastSeen).getTime();
      const now = new Date().getTime();
      const diffInSeconds = Math.floor((now - last) / 1000);
      const isOnline = diffInSeconds < 120;
      let text = isOnline ? 'متصل الآن' : diffInSeconds < 3600 ? `منذ ${Math.floor(diffInSeconds / 60)} دقيقة` : diffInSeconds < 86400 ? `منذ ${Math.floor(diffInSeconds / 3600)} ساعة` : new Date(lastSeen).toLocaleDateString('ar-EG');
      return { isOnline, text };
  };

  // تقسيم المستخدمين: نشطون مقابل معلقون
  const activeUsers = users.filter(u => u && !u.isDeleted && u.status === 'Active' && u.role !== UserRole.CLIENT && (isAdmin || u.role !== UserRole.ADMIN));
  const pendingUsers = users.filter(u => u && !u.isDeleted && u.status === 'Pending' && isAdmin);

  const copyRegisterLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}#/register`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = (u: User) => {
      if(confirm(`هل تريد الموافقة على انضمام "${u.name}"؟ سيمكنه الدخول للنظام فوراً.`)) {
          onUpdateUser({ ...u, status: 'Active', role: UserRole.CREATOR });
      }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto animate-fade-in custom-scrollbar bg-charcoal-950">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl black-header text-white mb-1">فريق العمل</h2>
            <p className="text-zinc-500 text-xs md:text-sm font-medium">إدارة الأعضاء ومتابعة التواجد</p>
          </div>
          
          {isAdmin && (
              <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={copyRegisterLink} 
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${copied ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-charcoal-800 text-zinc-400 border-white/5 hover:text-white hover:bg-charcoal-700'}`}
                  >
                    {copied ? <Check size={16}/> : <Link size={16} />}
                    {copied ? 'تم النسخ!' : 'نسخ رابط التسجيل'}
                  </button>
                  <button 
                    onClick={onAddUser} 
                    className="flex-1 md:flex-none bg-primary hover:scale-105 text-black px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Plus size={18} /> إضافة يدوية
                  </button>
              </div>
          )}
       </div>

       {/* قسم الطلبات المعلقة (للمدير فقط) */}
       {isAdmin && pendingUsers.length > 0 && (
           <div className="mb-12 animate-slide-up">
               <div className="flex items-center gap-2 mb-6">
                   <ShieldCheck className="text-emerald-500" size={20}/>
                   <h3 className="text-white font-black text-lg">طلبات انضمام جديدة ({pendingUsers.length})</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {pendingUsers.map(u => (
                       <div key={u.id} className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                               <img src={u.avatar} className="w-12 h-12 rounded-xl bg-black/20" alt="avatar" />
                               <div>
                                   <div className="text-white font-bold text-sm">{u.name}</div>
                                   <div className="text-[10px] text-zinc-500 font-mono">@{u.username}</div>
                               </div>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleApprove(u)} className="p-2 bg-emerald-500 text-black rounded-lg hover:scale-110 transition-transform shadow-lg" title="موافقة وتفعيل">
                                   <UserPlus size={18}/>
                               </button>
                               <button onClick={() => onDeleteUser(u.id)} className="p-2 bg-charcoal-800 text-red-500 rounded-lg border border-white/5 hover:bg-red-500 hover:text-white transition-colors" title="رفض">
                                   <X size={18}/>
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}

       <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20">
          {activeUsers.map(u => {
            const { isOnline, text: lastSeenText } = getLastSeenInfo(u.lastSeen);
            const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];

            return (
                <div key={u.id} onClick={() => onUserClick(u)} className={`glass p-4 md:p-6 rounded-2xl flex flex-col items-center text-center hover:bg-charcoal-800/80 transition-all cursor-pointer group border border-white/5 relative overflow-hidden transform hover:-translate-y-1`}>
                    {isSuperUser && u.id !== currentUser.id && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm(`هل أنت متأكد من حذف العضو "${u.name}"؟`)) onDeleteUser(u.id); }}
                            className="absolute top-2 left-2 p-1.5 bg-black/20 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-colors z-20"
                            title="حذف العضو"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}

                    <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-md ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-wider">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>

                    <div className="relative mb-4 mt-2">
                        <img src={u.avatar} className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 transition-colors object-cover shadow-xl ${isOnline ? 'border-emerald-500 shadow-emerald-500/20' : 'border-zinc-700'}`} alt={u.name} />
                    </div>
                    
                    <h3 className="text-white font-black text-xs md:text-sm mb-2 truncate w-full">{u.name}</h3>
                    
                    <div className="flex flex-wrap gap-1 items-center justify-center mb-4 min-h-[22px]">
                         {userRoles.map((r, i) => (
                             <span key={i} className="text-[8px] md:text-[9px] text-primary uppercase tracking-widest font-black bg-primary/10 px-2 py-0.5 rounded border border-primary/10">{r}</span>
                         ))}
                    </div>

                    <div className="w-full mt-auto space-y-2 border-t border-white/5 pt-3">
                        <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold ${isOnline ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {isOnline ? <Wifi size={12} /> : <Clock size={12} />}
                            <span className="truncate">{lastSeenText}</span>
                        </div>
                    </div>
                </div>
            );
          })}
          
          {isAdmin && (
            <button 
              onClick={onAddUser} 
              className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[160px] md:min-h-[220px] group"
            >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                <span className="font-black text-[10px] md:text-xs uppercase tracking-widest">إضافة يدوية</span>
            </button>
          )}
       </div>
    </div>
  );
};
export default TeamView;

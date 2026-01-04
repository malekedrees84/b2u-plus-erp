import React from 'react';
import { X, Bell, Check, Trash2, Briefcase, Info, ExternalLink, MessageSquare, Clock } from 'lucide-react';
import { AppNotification, Client, ProductionRequest, User } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onDeleteNotification: (id: string) => void;
  onNotificationClick: (notification: AppNotification) => void;
  clients: Client[];
  requests: ProductionRequest[];
  users: User[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
    isOpen, onClose, notifications, onMarkRead, onClearAll, 
    onDeleteNotification, onNotificationClick, clients, requests, users
}) => {
  if (!isOpen) return null;

  const validNotifications = notifications.filter(n => n && n.id);
  const unreadCount = validNotifications.filter(n => !n.isRead).length;

  const getNotificationVisual = (note: AppNotification) => {
      // ✅ البحث عن العميل المرتبط بالمهمة لعرض شعاره
      if (note.context === 'request' && note.entityId) {
          const request = requests.find(r => r.id === note.entityId);
          if (request) {
              const client = clients.find(c => c.name === request.client);
              if (client) return (
                <div className="relative shrink-0">
                    <img src={client.logo} className="w-11 h-11 rounded-xl object-contain bg-white/5 border border-white/10 p-1.5" alt="client"/>
                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-charcoal-900 shadow-lg">
                        <Briefcase size={8} className="text-white" />
                    </div>
                </div>
              );
          }
      }

      if (note.context === 'chat') return <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/10"><MessageSquare size={22}/></div>;

      const iconStyles = "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ";
      if (note.type === 'success') return <div className={iconStyles + "bg-emerald-500/10 text-emerald-500 border-emerald-500/10"}><Check size={22}/></div>;
      // Fixed: Removed comparison with 'alert' as it's not a valid member of ToastType
      if (note.type === 'error') return <div className={iconStyles + "bg-red-500/10 text-red-500 border-red-500/10"}><Info size={22}/></div>;
      return <div className={iconStyles + "bg-primary/10 text-primary border-primary/10"}><Bell size={22}/></div>;
  };

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-charcoal-900 h-full shadow-2xl border-l border-white/5 flex flex-col animate-slide-in-right">
        
        <div className="p-6 border-b border-white/5 bg-charcoal-950 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative border border-primary/10">
                    <Bell size={22} />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-charcoal-950 animate-bounce">{unreadCount}</span>}
                </div>
                <div>
                    <h3 className="text-white font-black text-lg tracking-tight">التنبيهات</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">إدارة تحديثات النظام</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-charcoal-900/50">
            {validNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                    <Bell size={64} className="mb-6" />
                    <p className="font-black text-lg">هدوء تام هنا</p>
                    <p className="text-xs mt-2">لا توجد إشعارات جديدة في الوقت الحالي.</p>
                </div>
            ) : (
                validNotifications.map(note => {
                    const visual = getNotificationVisual(note);
                    const isRequest = note.context === 'request';
                    const relatedReq = isRequest ? requests.find(r => r.id === note.entityId) : null;

                    return (
                        <div key={note.id} className={`p-4 rounded-[24px] border transition-all relative group overflow-hidden ${note.isRead ? 'bg-charcoal-950/40 border-white/5' : 'bg-charcoal-800 border-primary/20 shadow-xl'}`} onClick={() => onNotificationClick(note)}>
                            <div className="flex gap-4 cursor-pointer">
                                {visual}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-xs font-black truncate pr-1 ${note.isRead ? 'text-zinc-500' : 'text-white'}`}>
                                            {String(note.title || "تنبيه")}
                                        </h4>
                                        <div className="flex items-center gap-1 text-[9px] text-zinc-600 font-mono whitespace-nowrap">
                                            <Clock size={10}/>
                                            {new Date(note.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    
                                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${note.isRead ? 'text-zinc-500' : 'text-zinc-300'}`}>
                                        {String(note.message || "")}
                                    </p>

                                    {relatedReq && !note.isRead && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">
                                                {relatedReq.client}
                                            </span>
                                            <span className="text-[8px] text-zinc-500 truncate max-w-[120px]">
                                                {relatedReq.type}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-primary flex items-center gap-1 uppercase tracking-tighter">
                                            عرض التفاصيل <ExternalLink size={10}/>
                                        </span>
                                        <div className="flex gap-2">
                                            {!note.isRead && (
                                                <button onClick={(e) => { e.stopPropagation(); onMarkRead(note.id); }} className="p-1.5 bg-white/5 hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-500 rounded-lg transition-colors shadow-sm">
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteNotification(note.id); }} className="p-1.5 bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-colors shadow-sm">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {!note.isRead && <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                        </div>
                    );
                })
            )}
        </div>

        {validNotifications.length > 0 && (
            <div className="p-4 border-t border-white/5 bg-charcoal-950">
                <button onClick={onClearAll} className="w-full py-3.5 text-xs font-black text-red-400 hover:bg-red-500/10 rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-500/10">
                    <Trash2 size={16}/> مسح كافة التنبيهات
                </button>
            </div>
        )}
        
        <div className="p-4 text-center bg-charcoal-950/80">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">B2U Flow Targeted OS v3.0</p>
        </div>
      </div>
    </div>
  );
};
export default NotificationPanel;
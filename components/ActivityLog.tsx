
import React from 'react';
import { User, ProductionRequest } from '../types';
import { Activity, Clock, FileText } from 'lucide-react';

interface ActivityLogProps {
  users: User[];
  currentUser: User;
  requests?: ProductionRequest[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ users, currentUser, requests = [] }) => {
  // Safe sort requests by last activity or creation date desc
  const activities = [...requests]
    .filter(req => req && req.id) // Filter nulls first
    .sort((a, b) => {
        const dateA = new Date(a.lastActivity || a.createdAt).getTime();
        const dateB = new Date(b.lastActivity || b.createdAt).getTime();
        return dateB - dateA;
    });

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in custom-scrollbar bg-charcoal-950">
       <div className="mb-8">
          <h2 className="text-3xl black-header text-white mb-2">سجل النشاطات</h2>
          <p className="text-zinc-500 text-sm">تتبع آخر التحديثات والعمليات في النظام</p>
       </div>

       <div className="space-y-4 max-w-4xl relative">
          <div className="absolute top-4 bottom-4 right-5 w-px bg-white/5 hidden md:block"></div>
          
          {activities.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <Activity size={48} className="mx-auto text-zinc-700 mb-4"/>
                  <p className="text-zinc-500">لا توجد نشاطات مسجلة بعد</p>
              </div>
          ) : (
              activities.map((req, i) => {
                  const assignee = users.find(u => u && u.id === req.assigneeId);
                  const date = new Date(req.lastActivity || req.createdAt);
                  
                  return (
                      <div key={req.id} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute top-6 right-[15px] w-2.5 h-2.5 rounded-full bg-charcoal-950 border-2 border-primary z-10 hidden md:block group-hover:scale-125 transition-transform"></div>
                          
                          <div className="bg-charcoal-900 p-5 rounded-2xl border border-white/5 flex items-start gap-4 md:mr-10 hover:bg-white/5 transition-all">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                  <FileText size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                                      <h4 className="text-white font-bold text-sm truncate">{req.title}</h4>
                                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 bg-black/20 px-2 py-1 rounded shrink-0">
                                          <Clock size={10}/> {date.toLocaleDateString('ar-EG')} {date.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>
                                  <p className="text-zinc-400 text-xs leading-relaxed">
                                      تم تحديث حالة الطلب إلى <span className="text-white font-bold px-1.5 py-0.5 rounded bg-white/10">{req.status}</span>
                                      {assignee && <> • المسؤول الحالي: <span className="text-primary">{assignee.name}</span></>}
                                  </p>
                              </div>
                          </div>
                      </div>
                  )
              })
          )}
       </div>
    </div>
  );
};

export default ActivityLog;

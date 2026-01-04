
import React, { useMemo, useState, useEffect } from 'react';
import { ProductionRequest, RequestStatus, User, Client, UserRole, StatusHistoryEntry } from '../types';
import { Play, CheckCircle2, AlertCircle, RefreshCcw, Calendar, Zap, ArrowLeft, Send, SearchCheck, Globe, CornerDownLeft, Plus, Briefcase, Clock, Users, GripVertical, Lock, UserCheck, Search, Timer, BarChart3, ChevronRight, MessageSquare, ToggleLeft, ToggleRight, AlignLeft, Power, Hourglass, RotateCcw, ThumbsUp, UploadCloud } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface MyTasksProps {
  requests: ProductionRequest[];
  currentUser: User;
  onUpdateRequest: (req: ProductionRequest) => void;
  onOpenRequest: (req: ProductionRequest) => void;
  onCreateRequest: (req?: Partial<ProductionRequest>) => void;
  clients?: Client[];
}

const TaskCard: React.FC<{
  req: ProductionRequest;
  onOpenRequest: (req: ProductionRequest) => void;
  onUpdateRequest: (req: ProductionRequest) => void;
  clientLogo: string;
  currentUser: User;
}> = ({ req, onOpenRequest, onUpdateRequest, clientLogo, currentUser }) => {
  const isLate = new Date(req.dueDate) < new Date() && ![RequestStatus.PUBLISHED, RequestStatus.APPROVED, RequestStatus.ARCHIVED].includes(req.status);
  const isActive = req.isActive !== false;

  // Determine Archive Permission
  const isCreator = req.creatorId && req.creatorId === currentUser.id;
  const isTopManagement = currentUser.role === UserRole.ADMIN || currentUser.username === 'tamir';
  const canArchive = isCreator || isTopManagement;

  // Role Checks for Quick Actions
  const isSupervisor = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR || req.supervisorId === currentUser.id;
  const isPublishing = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PUBLISHING;

  // حساب الوقت المنقضي
  const timeInStatus = useMemo(() => {
    const lastHistory = req.statusHistory && req.statusHistory.length > 0 
      ? req.statusHistory[req.statusHistory.length - 1] 
      : null;
    const startTime = lastHistory ? new Date(lastHistory.timestamp).getTime() : new Date(req.createdAt).getTime();
    const diff = Math.floor((new Date().getTime() - startTime) / (1000 * 60 * 60)); 
    return diff;
  }, [req.statusHistory, req.createdAt]);

  const totalLogHours = (req.workLogs || []).reduce((acc, log) => acc + log.hours, 0);

  const handleToggleActive = (e: React.MouseEvent) => {
      e.stopPropagation();
      onUpdateRequest({ ...req, isActive: !isActive });
  };

  const handleQuickAction = (e: React.MouseEvent, action: 'redo' | 'approve' | 'publish') => {
      e.stopPropagation();
      let newStatus = req.status;
      let note = '';

      if (action === 'redo') {
          newStatus = RequestStatus.NEEDS_CHANGES;
          note = 'طلب تعديل سريع (Redo)';
      } else if (action === 'approve') {
          newStatus = RequestStatus.APPROVED;
          note = 'اعتماد سريع';
      } else if (action === 'publish') {
          newStatus = RequestStatus.PUBLISHED;
          note = 'تم النشر';
      }

      const timestamp = new Date().toISOString();
      // Create simplified update with history
      const updatedReq = {
          ...req,
          status: newStatus,
          lastActivity: timestamp,
          statusHistory: [...(req.statusHistory || []), { status: newStatus, timestamp, userId: currentUser.id, userName: currentUser.name }],
          comments: [...(req.comments || []), { id: `sys-${Date.now()}`, userId: currentUser.id, text: `⚡ تحديث سريع: ${note}`, timestamp, isSystem: true }]
      };
      
      if (action === 'publish') {
          updatedReq.publishedAt = timestamp;
      }

      onUpdateRequest(updatedReq);
  };

  return (
      <div 
          onClick={() => onOpenRequest(req)} 
          className={`group bg-charcoal-900/60 p-5 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 backdrop-blur-md flex flex-col ${isLate ? 'border-red-500/30' : 'border-white/5 hover:border-primary/40'} ${!isActive ? 'opacity-60 grayscale bg-zinc-900/80 border-zinc-800' : ''}`}
      >
          {req.priority === 'High' && isActive && <div className="absolute top-0 right-10 bg-red-500 w-16 h-1 rounded-full blur-sm"></div>}
          
          <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                   <div className="relative">
                       <img 
                           src={clientLogo} 
                           className={`w-12 h-12 rounded-full border-2 border-charcoal-800 object-contain bg-black/20 shadow-lg transition-transform ${!isActive ? 'opacity-50' : 'group-hover:scale-105'}`} 
                           alt={req.client} 
                       />
                       {req.priority === 'High' && isActive && (
                           <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-charcoal-900 flex items-center justify-center">
                               <AlertCircle size={8} className="text-white"/>
                           </div>
                       )}
                   </div>
                   <div className="min-w-0">
                       <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{req.client}</div>
                       <div className="text-[10px] font-black text-white flex items-center gap-1">
                           {req.priority === 'High' && isActive ? <span className="text-red-500 font-bold">عاجل جداً</span> : <span className="text-zinc-400">مهمة عادية</span>}
                       </div>
                   </div>
               </div>
               
               <div className="flex items-center gap-2">
                   {!isActive && <div className="text-[9px] font-bold text-zinc-500 flex items-center gap-1"><Power size={12}/> غير فعال</div>}
                   <div className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase ${STATUS_COLORS[req.status]}`}>{req.status}</div>
                   {canArchive && (
                       <button onClick={handleToggleActive} className={`text-zinc-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'hover:text-emerald-500' : 'hover:text-zinc-300'}`} title={isActive ? "تعطيل" : "تفعيل"}>
                           {isActive ? <ToggleRight size={20} className="text-emerald-500"/> : <ToggleLeft size={20}/>}
                       </button>
                   )}
               </div>
          </div>
          
          <div className="mb-4 flex-1">
              <h4 className={`font-black text-sm mb-2 leading-relaxed line-clamp-2 tracking-tight transition-colors ${!isActive ? 'text-zinc-500 line-through' : 'text-white group-hover:text-primary'}`}>
                  {req.title}
              </h4>
              {req.brief && (
                  <p className="text-[10px] text-zinc-500 line-clamp-2 leading-normal flex items-start gap-1">
                      <AlignLeft size={10} className="mt-0.5 shrink-0" />
                      {req.brief}
                  </p>
              )}
          </div>
          
          {/* QUICK ACTIONS BAR */}
          {isActive && (
              <div className="flex gap-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Supervisor Actions: Redo / Approve */}
                  {isSupervisor && [RequestStatus.WAITING_REVIEW, RequestStatus.IN_REVIEW, RequestStatus.WAITING_CLIENT_APPROVAL].includes(req.status) && (
                      <>
                          <button 
                            onClick={(e) => handleQuickAction(e, 'redo')} 
                            className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-bold border border-red-500/20 hover:bg-red-500 hover:text-white flex items-center justify-center gap-1 transition-all"
                            title="إعادة للعمل (تعديل مطلوب)"
                          >
                              <RotateCcw size={12}/> إعادة تعديل
                          </button>
                          <button 
                            onClick={(e) => handleQuickAction(e, 'approve')} 
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-black flex items-center justify-center gap-1 transition-all"
                            title="اعتماد"
                          >
                              <ThumbsUp size={12}/> اعتماد
                          </button>
                      </>
                  )}

                  {/* Publishing Action: Publish */}
                  {isPublishing && req.status === RequestStatus.APPROVED && (
                      <button 
                        onClick={(e) => handleQuickAction(e, 'publish')} 
                        className="flex-1 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20 hover:bg-blue-500 hover:text-white flex items-center justify-center gap-1 transition-all"
                      >
                          <UploadCloud size={12}/> تم النشر
                      </button>
                  )}
              </div>
          )}

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-zinc-500 bg-black/20 px-2 py-1 rounded-lg">
                    <Timer size={12} className={isActive ? "text-primary" : "text-zinc-600"}/>
                    <span className="text-[10px] font-black">{totalLogHours}h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Clock size={12} className={timeInStatus > 24 && isActive ? 'text-orange-500' : 'text-zinc-600'} />
                    <span className="text-[10px] font-mono">{timeInStatus}h</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 flex-row-reverse">
                      <div className={`w-6 h-6 rounded-full border-2 border-charcoal-900 flex items-center justify-center text-[8px] font-black shadow-lg ${isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'}`}>AI</div>
                      <img src={`https://ui-avatars.com/api/?name=${req.assigneeId}&background=random`} className="w-6 h-6 rounded-full border-2 border-charcoal-900 shadow-lg grayscale-[0.5]" />
                  </div>
                  {(req.comments || []).length > 0 && (
                      <div className="flex items-center gap-1 text-zinc-600 text-[10px] font-bold">
                          <MessageSquare size={12}/> {(req.comments || []).length}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

const MyTasks: React.FC<MyTasksProps> = ({ requests, currentUser, onUpdateRequest, onOpenRequest, onCreateRequest, clients = [] }) => {
  const isCreator = currentUser.role === UserRole.CREATOR;
  const isViewer = currentUser.role === UserRole.VIEWER;
  
  const isTamir = currentUser.username === 'tamir';
  
  // Any role that is NOT Creator and NOT Viewer should see the full board (Admin, Supervisor, Accountant, Publishing).
  const hasSuperView = (!isCreator && !isViewer) || isTamir;

  // Filter out inactive tasks completely from the workflow view
  const displayRequests = requests.filter(r => r && r.isActive !== false); 

  const getClientLogo = (clientName: string) => {
      const client = clients.find(c => c && c.name === clientName);
      return client?.logo || `https://ui-avatars.com/api/?name=${clientName}&background=334155&color=fff`;
  };

  const boardColumns = useMemo(() => {
    // 1. First, filter tasks accessible to the user
    const accessibleRequests = displayRequests.filter(r => {
        if (!r) return false;
        // If user has Super View (Admin, Supervisor, etc.), show ALL tasks
        if (hasSuperView) return true;
        // Otherwise, Creator only sees tasks assigned to them
        return r.assigneeId === currentUser.id;
    });

    // 2. Define columns based on Role
    
    // === MANAGER VIEW (ADMIN / SUPERVISOR / PUBLISHING / ACCOUNTANT) ===
    if (hasSuperView) {
        return [
            {
                id: 'backlog',
                title: 'لم يبدأ / جديد (Backlog)',
                icon: <Hourglass size={18} className="text-slate-400" />,
                color: 'text-slate-400',
                bg: 'bg-slate-500/5',
                tasks: accessibleRequests.filter(r => r.status === RequestStatus.CREATED)
            },
            {
                id: 'active',
                title: 'قيد التنفيذ (Active)',
                icon: <Zap size={18} className="text-blue-400" />,
                color: 'text-blue-400',
                bg: 'bg-blue-500/5',
                // 'Needs Changes' is effectively Active, but the card now has quick actions to move it
                tasks: accessibleRequests.filter(r => [RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_CHANGES].includes(r.status))
            },
            {
                id: 'review',
                title: 'مراجعة (مشرف/عميل)',
                icon: <SearchCheck size={18} className="text-purple-400" />,
                color: 'text-purple-400',
                bg: 'bg-purple-500/5',
                tasks: accessibleRequests.filter(r => [
                    RequestStatus.WAITING_REVIEW, 
                    RequestStatus.IN_REVIEW, 
                    RequestStatus.WAITING_CLIENT_APPROVAL
                ].includes(r.status))
            },
            {
                id: 'approved',
                title: 'معتمد (بانتظار النشر)',
                icon: <Globe size={18} className="text-teal-400" />,
                color: 'text-teal-400',
                bg: 'bg-teal-500/5',
                tasks: accessibleRequests.filter(r => r.status === RequestStatus.APPROVED)
            },
            {
                id: 'published',
                title: 'تم النشر (منتهي)',
                icon: <CheckCircle2 size={18} className="text-emerald-400" />,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/5',
                tasks: accessibleRequests.filter(r => r.status === RequestStatus.PUBLISHED)
            }
        ];
    }

    // === CREATOR VIEW (NORMAL USER) ===
    return [
      {
        id: 'inbox',
        title: 'مهامي (To Do)',
        icon: <Zap size={18} className="text-blue-400" />,
        color: 'text-blue-400',
        bg: 'bg-blue-500/5',
        tasks: accessibleRequests.filter(r => [
            RequestStatus.CREATED, 
            RequestStatus.IN_PROGRESS, 
            RequestStatus.NEEDS_CHANGES
        ].includes(r.status))
      },
      {
        id: 'review',
        title: 'مراجعة (مشرف)',
        icon: <SearchCheck size={18} className="text-purple-400" />,
        color: 'text-purple-400',
        bg: 'bg-purple-500/5',
        tasks: accessibleRequests.filter(r => r.status === RequestStatus.WAITING_REVIEW)
      },
      {
        id: 'done',
        title: 'مكتمل (Approved/Published)',
        icon: <CheckCircle2 size={18} className="text-emerald-400" />,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        tasks: accessibleRequests.filter(r => [RequestStatus.APPROVED, RequestStatus.PUBLISHED].includes(r.status))
      }
    ];

  }, [displayRequests, currentUser, hasSuperView, isCreator, isTamir]);

  return (
    <div className="p-4 md:p-12 h-full flex flex-col animate-fade-in overflow-hidden bg-charcoal-950">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 shrink-0">
          <div className="text-right">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">سير العمل (CRM Flow)</h2>
            <p className="text-zinc-500 text-sm font-bold flex items-center gap-2 justify-end">
                <BarChart3 size={16} className="text-primary"/> 
                {hasSuperView ? 'عرض إداري شامل (Super View)' : 'إدارة مهامك المباشرة وتحليل الأداء'}
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <div className="flex-1 md:flex-none p-4 bg-charcoal-900 border border-white/5 rounded-[24px] flex items-center gap-4 shadow-xl">
                <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase">إجمالي ساعات الفريق</div>
                    <div className="text-xl font-black text-white">
                        {displayRequests.reduce((acc, r) => acc + (r.workLogs || []).reduce((a,l) => a+l.hours, 0), 0)}h
                    </div>
                </div>
                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Timer size={24}/></div>
             </div>
             <button onClick={() => onCreateRequest()} className="bg-primary text-black px-10 py-4 rounded-[24px] font-black text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-primary/20">
                <Plus size={20} /> إضافة مهمة
             </button>
          </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 no-scrollbar">
        <div className="flex h-full gap-8 min-w-full w-max px-2">
            {boardColumns.map(col => (
                <div key={col.id} className={`flex flex-col w-[350px] md:w-[400px] h-full rounded-[45px] border border-white/5 overflow-hidden transition-all bg-charcoal-900/20 backdrop-blur-xl`}>
                    <div className="p-8 border-b border-white/5 bg-charcoal-950/40 flex justify-between items-center">
                        <div className={`flex items-center gap-3 font-black text-sm uppercase tracking-tight ${col.color}`}>
                            {col.icon} {col.title}
                        </div>
                        <span className="bg-white/5 text-zinc-500 text-[10px] px-3 py-1 rounded-full font-mono border border-white/5">{col.tasks.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {col.tasks.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-zinc-800 border-4 border-dashed border-white/5 rounded-[40px] m-2">
                                <Search size={40} className="mb-4 opacity-10"/>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-20">No Tasks in this stage</p>
                            </div>
                        ) : (
                            col.tasks.map(req => (
                                <TaskCard 
                                    key={req.id} 
                                    req={req} 
                                    clientLogo={getClientLogo(req.client)} 
                                    onOpenRequest={onOpenRequest} 
                                    onUpdateRequest={onUpdateRequest} 
                                    currentUser={currentUser}
                                />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MyTasks;

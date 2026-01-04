
import React, { useState, useEffect } from 'react';
import { ProductionRequest, RequestStatus, User, UserRole, Permissions, Client } from '../types';
import { STATUS_COLORS } from '../constants';
import { Plus, LayoutGrid, List as ListIcon, Edit3, Lock, Clock, MoreHorizontal, Building2, X, Filter, AlertCircle, Archive, Trash2, ToggleRight, ToggleLeft, Power, RotateCcw, Check } from 'lucide-react';

interface RequestListProps {
  requests: ProductionRequest[];
  onOpenRequest: (req: ProductionRequest) => void;
  onCreateRequest: () => void;
  onEditRequest: (req: ProductionRequest) => void;
  onUpdateRequest?: (req: ProductionRequest) => void; // New prop for direct updates
  currentUser: User;
  users: User[];
  onDeleteRequest: (id: string) => void;
  initialFilter?: string;
  userPermissions?: Permissions; // Made optional to prevent crashes
  clients: Client[];
}

const RequestList: React.FC<RequestListProps> = ({ requests = [], onOpenRequest, onCreateRequest, onEditRequest, onUpdateRequest, currentUser, users, onDeleteRequest, initialFilter = 'All', userPermissions, clients = [] }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  // Updated Logic: Admin or Specific User 'tamir' can delete
  const isSuperUser = currentUser.username === 'tamir' || currentUser.role === UserRole.ADMIN;
  // Check Archive permissions: Admin or Creator
  const canManageArchive = currentUser.role === UserRole.ADMIN || isSuperUser;
  
  // Safe permissions fallback
  const canCreate = userPermissions?.canCreateRequest ?? false;
  const canEdit = userPermissions?.canEditRequest ?? false;

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  const handleToggleActive = (e: React.MouseEvent, req: ProductionRequest) => {
      e.stopPropagation();
      
      const canArchive = canManageArchive || (req.creatorId && req.creatorId === currentUser.id);
      
      if (!canArchive) {
          alert("عذراً، فقط منشئ المهمة أو الإدارة العليا يمكنهم أرشفتها.");
          return;
      }

      const newStatus = !(req.isActive !== false); // Toggle status
      const updatedReq = { 
          ...req, 
          isActive: newStatus, 
          status: newStatus ? req.status : RequestStatus.ARCHIVED, // Ensure status is set to ARCHIVED on removal
          lastActivity: new Date().toISOString() 
      };
      
      // Use direct updater if available (immediate save), otherwise fall back to edit modal logic
      if (onUpdateRequest) {
          onUpdateRequest(updatedReq);
      } else {
          onEditRequest(updatedReq);
      }
  };

  const filteredRequests = requests.filter(req => {
    if (!req) return false;
    if (currentUser.role === UserRole.CREATOR && req.assigneeId !== currentUser.id) return false;
    
    // Search Filtering
    const searchLower = search.toLowerCase();
    const title = req.title ? String(req.title).toLowerCase() : '';
    const client = req.client ? String(req.client).toLowerCase() : '';
    const matchesSearch = title.includes(searchLower) || client.includes(searchLower);
    
    if (!matchesSearch) return false;
    
    // --- STATUS & ARCHIVE LOGIC ---

    // 1. Explicit Archive View: Show ONLY inactive tasks OR explicitly ARCHIVED tasks
    if (activeFilter === 'Archived') {
        return req.isActive === false || req.status === RequestStatus.ARCHIVED;
    }

    // 2. Default Views: MUST be Active AND NOT Archived. 
    // This strict check ensures archived tasks vanish instantly.
    if (req.isActive === false || req.status === RequestStatus.ARCHIVED) return false;

    // 3. Published View: Show ONLY Published tasks (that are active)
    if (activeFilter === 'Published') {
        return req.status === RequestStatus.PUBLISHED;
    }

    // 4. Exclude Published from 'All' and other operational views (optional, but cleaner)
    //    If you want 'All' to show everything active (including published), remove the next line.
    //    Keeping it consistent with "Work in Progress" feel:
    if (activeFilter !== 'Published' && req.status === RequestStatus.PUBLISHED) return false;

    // 5. Specific Filters
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Review') return [RequestStatus.WAITING_REVIEW, RequestStatus.IN_REVIEW, RequestStatus.WAITING_CLIENT_APPROVAL].includes(req.status);
    if (activeFilter === 'Approved') return req.status === RequestStatus.APPROVED;
    if (activeFilter === 'Recurring') return req.isRecurring === true;
    if (activeFilter === 'Urgent') return req.priority === 'High';
    
    return true;
  });

  const columns = [
    { title: 'جديد / للإسناد', status: [RequestStatus.CREATED], color: 'border-slate-500' },
    { title: 'قيد التنفيذ', status: [RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_CHANGES], color: 'border-blue-500' },
    { title: 'مراجعة (QA/عميل)', status: [RequestStatus.WAITING_REVIEW, RequestStatus.IN_REVIEW, RequestStatus.WAITING_CLIENT_APPROVAL], color: 'border-purple-500' },
    { title: 'معتمد (بانتظار النشر)', status: [RequestStatus.APPROVED], color: 'border-teal-500' },
  ];

  const getClientLogo = (clientName: string) => {
      if (!clients) return `https://ui-avatars.com/api/?name=${clientName}&background=334155&color=fff`;
      const client = clients.find(c => c && c.name === clientName);
      return client?.logo || `https://ui-avatars.com/api/?name=${clientName}&background=334155&color=fff`;
  };

  const getFilterLabel = (f: string) => {
      switch(f) {
          case 'Review': return 'قيد المراجعة';
          case 'Approved': return 'تم الاعتماد';
          case 'Published': return 'تم النشر (مكتمل)';
          case 'Archived': return 'سلة الأرشيف (غير فعال)';
          case 'Recurring': return 'المهام الدورية';
          case 'Urgent': return 'عاجل جداً';
          default: return 'الكل (النشط)';
      }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl black-header text-white mb-0.5 md:mb-1">
                {activeFilter === 'Archived' ? 'أرشيف المهام المعطلة' : 'طلبات الإنتاج'}
            </h2>
            <p className="text-zinc-500 text-[10px] md:text-sm font-medium">
                {activeFilter === 'Archived' ? 'المهام التي تم إلغاء تفعيلها' : 'متابعة سير العمل وحالة المشاريع'}
            </p>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 w-full md:w-auto">
             <div className="flex-1 md:flex-none relative order-2 md:order-1">
                <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg md:rounded-xl px-4 py-2 md:py-2.5 text-white text-[11px] md:text-sm focus:border-primary outline-none" />
             </div>
             
             <div className="flex bg-charcoal-800 p-1 rounded-lg border border-charcoal-700 shrink-0 order-4 md:order-1">
                {/* Published Button */}
                <button onClick={() => setActiveFilter('Published')} className={`p-1.5 md:p-2 rounded-md transition-all flex items-center gap-1 text-[9px] md:text-[10px] font-bold ${activeFilter === 'Published' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`} title="المهام المنشورة">
                    <Check size={14}/>
                </button>
                <div className="w-px bg-white/10 mx-1"></div>
                {/* Archive Button */}
                <button onClick={() => setActiveFilter('Archived')} className={`p-1.5 md:p-2 rounded-md transition-all flex items-center gap-1 text-[9px] md:text-[10px] font-bold ${activeFilter === 'Archived' ? 'bg-red-500 text-white' : 'text-zinc-500 hover:text-red-400'}`} title="سلة المهملات / الأرشيف">
                    <Archive size={14}/>
                </button>
             </div>

             <div className="flex bg-charcoal-800 p-1 rounded-lg md:rounded-xl border border-charcoal-700 shrink-0 order-3 md:order-2">
                <button onClick={() => setViewMode('list')} className={`p-1.5 md:p-2 rounded-md md:rounded-lg transition-all ${viewMode === 'list' ? 'bg-charcoal-700 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><ListIcon size={16} className="md:w-[18px] md:h-[18px]" /></button>
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 md:p-2 rounded-md md:rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-charcoal-700 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" /></button>
             </div>
            {canCreate && activeFilter !== 'Archived' && (
                <button onClick={onCreateRequest} className="flex-1 md:flex-none bg-primary text-black px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-[10px] md:text-xs hover:scale-105 transition-transform order-1 md:order-3">
                    <Plus size={14} className="md:w-[16px] md:h-[16px]" /> <span>طلب جديد</span>
                </button>
            )}
        </div>
      </div>

      {(activeFilter !== 'All') && (
          <div className="mb-4 flex items-center gap-2 animate-slide-up">
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${activeFilter === 'Archived' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                  <Filter size={14} /> فلتر: {getFilterLabel(activeFilter)}
                  <button onClick={() => setActiveFilter('All')} className="hover:bg-black/20 rounded-full p-0.5"><X size={12} /></button>
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 pb-4 custom-scrollbar">
          {viewMode === 'list' && (
              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-20 opacity-50 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-zinc-500">لا توجد طلبات تطابق الفلتر الحالي.</p>
                        {search && <button onClick={() => setSearch('')} className="text-primary text-xs mt-2 underline">مسح البحث</button>}
                        {activeFilter !== 'All' && <button onClick={() => setActiveFilter('All')} className="text-primary text-xs mt-2 block mx-auto underline">العودة للرئيسية</button>}
                    </div>
                ) : (
                    filteredRequests.map(req => {
                        if (!req) return null;
                        const isActive = req.isActive !== false;
                        // Permission check per item
                        const canArchive = canManageArchive || (req.creatorId && req.creatorId === currentUser.id);

                        return (
                            <div key={req.id} onClick={() => onOpenRequest(req)} className={`group relative p-3 md:p-5 rounded-[20px] cursor-pointer border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 transition-all hover:translate-x-[-4px] overflow-hidden ${req.priority === 'High' && isActive ? 'bg-gradient-to-r from-red-900/10 to-charcoal-900 border-red-500/20' : 'bg-charcoal-900 border-white/5 hover:border-primary/30'} ${!isActive ? 'opacity-60 grayscale bg-zinc-900/80 border-zinc-800' : ''}`}>
                                {req.priority === 'High' && isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="w-12 h-12 rounded-xl bg-charcoal-800 border border-white/5 p-0.5 shrink-0 overflow-hidden">
                                        <img src={getClientLogo(req.client)} className={`w-full h-full object-contain bg-black/20 rounded-[10px] ${!isActive ? 'opacity-50' : ''}`} alt={req.client} />
                                    </div>
                                    <div className="min-w-0 text-right">
                                        <h3 className={`font-bold text-sm md:text-base mb-1 transition-colors truncate ${!isActive ? 'text-zinc-500 line-through' : 'text-white group-hover:text-primary'}`}>{req.title}</h3>
                                        <div className="flex items-center justify-end gap-3 text-[10px] font-bold text-zinc-500">
                                            {req.publishedAt && <span className="text-emerald-500">تم النشر: {new Date(req.publishedAt).toLocaleDateString('ar-EG')}</span>}
                                            <span className="flex items-center gap-1 uppercase tracking-wider"><Building2 size={10} /> {req.client}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                                    {!isActive && <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded"><Archive size={10}/> مؤرشف</span>}
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canArchive && (
                                            <button 
                                                onClick={(e) => handleToggleActive(e, req)} 
                                                className={`p-2 rounded-lg transition-all ${!isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-red-500 hover:bg-red-500/10'}`} 
                                                title={!isActive ? "استعادة من الأرشيف" : "نقل للأرشيف"}
                                            >
                                                {!isActive ? <RotateCcw size={18}/> : <Archive size={18}/>}
                                            </button>
                                        )}
                                        {canEdit && <button onClick={(e) => { e.stopPropagation(); onEditRequest(req); }} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"><Edit3 size={16} /></button>}
                                        {isSuperUser && <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(req.id); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
              </div>
          )}

          {viewMode === 'kanban' && (
              <div className="flex gap-4 md:gap-6 h-full overflow-x-auto pb-4 items-start custom-scrollbar">
                  {columns.map((col, idx) => {
                      const colRequests = filteredRequests.filter(r => r && col.status.includes(r.status));
                      return (
                          <div key={idx} className="flex-1 min-w-[280px] flex flex-col h-full max-h-full">
                              <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                                  <h3 className="font-black text-zinc-300 text-xs uppercase tracking-tighter">{col.title}</h3>
                                  <span className="bg-white/5 text-zinc-500 text-[10px] px-2 py-0.5 rounded-md font-mono">{colRequests.length}</span>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-2">
                                  {colRequests.map(req => {
                                      if (!req) return null;
                                      const isActive = req.isActive !== false;
                                      // Permission check per item
                                      const canArchive = canManageArchive || (req.creatorId && req.creatorId === currentUser.id);

                                      return (
                                          <div key={req.id} onClick={() => onOpenRequest(req)} className={`bg-charcoal-900 p-4 rounded-2xl border border-white/5 hover:border-primary/40 cursor-pointer shadow-lg transition-all group relative overflow-hidden ${!isActive ? 'opacity-60 grayscale bg-zinc-900/80 border-zinc-800' : ''}`}>
                                              <div className="flex justify-between items-start mb-3">
                                                  <div className="w-8 h-8 rounded-lg bg-charcoal-800 border border-white/5 p-0.5 shrink-0">
                                                      <img src={getClientLogo(req.client)} className={`w-full h-full object-contain bg-black/20 rounded-md ${!isActive ? 'opacity-50' : ''}`} />
                                                  </div>
                                                  <div className="flex gap-1">
                                                      {canArchive && (
                                                        <button onClick={(e) => handleToggleActive(e, req)} className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all ${!isActive ? 'text-emerald-500' : 'text-zinc-500 hover:text-red-500'}`}>
                                                            {!isActive ? <RotateCcw size={16}/> : <Archive size={16}/>}
                                                        </button>
                                                      )}
                                                      {req.priority === 'High' && isActive && <AlertCircle size={14} className="text-red-500" />}
                                                  </div>
                                              </div>
                                              <h4 className={`font-bold text-xs md:text-sm mb-3 leading-snug line-clamp-2 text-right ${!isActive ? 'text-zinc-500 line-through' : 'text-white'}`}>{req.title}</h4>
                                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                                  <span className="text-[9px] text-zinc-500 font-mono">{req.dueDate}</span>
                                                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter ${STATUS_COLORS[req.status].split(' ')[0]} ${STATUS_COLORS[req.status].split(' ')[1]} ${STATUS_COLORS[req.status].split(' ')[2]}`}>{req.status.split(' ')[0]}</span>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
};
export default RequestList;

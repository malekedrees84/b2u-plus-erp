
import React, { useState } from 'react';
import { Client, UserRole, User } from '../types';
import { Plus, Search, Building2, Phone, Mail, ExternalLink, User as UserIcon, Trash2, Archive, RefreshCw, Edit3 } from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onOpenClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  currentUser: User;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onAddClient, onEditClient, onOpenClient, onDeleteClient, currentUser }) => {
  const [search, setSearch] = useState('');
  const [viewArchived, setViewArchived] = useState(false);
  
  // Updated Logic: Admin or 'tamir' can delete
  const isSuperUser = currentUser.username === 'tamir' || currentUser.role === UserRole.ADMIN;

  const filteredClients = clients.filter(c => {
    // 0. Safety Check: Exclude deleted/null clients
    if (!c || c.isDeleted) return false;

    // 1. Search Filter
    const searchLower = search.toLowerCase();
    const name = c.name ? String(c.name).toLowerCase() : '';
    const industry = c.industry ? String(c.industry).toLowerCase() : '';
    const matchesSearch = name.includes(searchLower) || industry.includes(searchLower);

    // 2. Status Filter (Active vs Archived)
    // Default to 'Active' if status is missing to prevent items from disappearing entirely
    const status = c.status || 'Active';

    // Strict Filtering: Active View ONLY shows Active, Archive View ONLY shows Inactive
    const matchesStatus = viewArchived ? status === 'Inactive' : status === 'Active';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 h-full flex flex-col animate-fade-in overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
             {viewArchived ? 'أرشيف العملاء' : 'العملاء والشركاء'}
             <span className="text-sm font-normal text-zinc-500 bg-charcoal-800 px-2 py-0.5 rounded-full border border-charcoal-700">{filteredClients.length}</span>
           </h2>
           <p className="text-zinc-500 text-sm">{viewArchived ? 'العملاء المتوقفين عن العمل سابقاً' : 'إدارة قاعدة بيانات العملاء والعقود النشطة'}</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setViewArchived(!viewArchived)} 
                className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all border ${viewArchived ? 'bg-primary text-black border-primary' : 'bg-charcoal-800 text-zinc-400 border-charcoal-700 hover:text-white'}`}
            >
                {viewArchived ? <RefreshCw size={18}/> : <Archive size={18}/>}
                {viewArchived ? 'العودة للعملاء النشطين' : 'عرض الأرشيف'}
            </button>

            {currentUser.role === UserRole.ADMIN && !viewArchived && (
                <button onClick={onAddClient} className="bg-gold-600 hover:bg-gold-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-gold-600/20 transition-all hover:scale-105">
                    <Plus size={20} /> إضافة عميل
                </button>
            )}
        </div>
      </div>

      <div className="mb-6 max-w-md relative">
          <Search className="absolute top-3 right-3 text-zinc-500 w-5 h-5" />
          <input type="text" placeholder="بحث عن عميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-charcoal-800/50 backdrop-blur border border-charcoal-700 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-all shadow-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-8 pr-1 custom-scrollbar">
         {filteredClients.length === 0 ? (
             <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                 <Building2 size={48} className="mx-auto text-zinc-700 mb-4"/>
                 <p className="text-zinc-500 font-bold">{viewArchived ? 'الأرشيف فارغ' : 'لا يوجد عملاء مطابقين للبحث'}</p>
             </div>
         ) : (
             filteredClients.map(client => (
                 <div key={client.id} onClick={() => onOpenClient(client)} className={`group glass p-5 rounded-2xl hover:bg-charcoal-800/60 transition-all border border-charcoal-700 relative overflow-hidden cursor-pointer ${client.status === 'Inactive' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                     <div className="flex justify-between items-start mb-4">
                        <img src={client.logo} alt={client.name} className="w-16 h-16 rounded-xl object-contain bg-black/20 border border-charcoal-600 shadow-lg" />
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${client.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{client.status === 'Active' ? 'نشط' : 'مؤرشف'}</span>
                     </div>
                     <h3 className="text-white font-bold text-lg mb-1">{client.name}</h3>
                     <p className="text-zinc-500 text-xs mb-4 flex items-center gap-1"><Building2 size={12} /> {client.industry}</p>
                     <div className="space-y-2 mb-4 bg-charcoal-900/50 p-3 rounded-lg border border-charcoal-800/50">
                        <div className="flex items-center gap-2 text-xs text-zinc-400"><UserIcon size={12} className="text-gold-500" /><span className="text-zinc-300">{client.contactPerson}</span></div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400"><Phone size={12} className="text-gold-500" /><span className="truncate">{client.phone}</span></div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400"><Mail size={12} className="text-gold-500" /><span className="truncate">{client.email}</span></div>
                     </div>
                     <div className="flex justify-between items-center mt-2 border-t border-charcoal-700/50 pt-3">
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 group-hover:text-gold-400 transition-colors">لوحة التحكم <ExternalLink size={10} /></div>
                        {currentUser.role === UserRole.ADMIN && (
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onEditClient(client); }} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"><Edit3 size={14} /></button>
                                {/* Admin can delete */}
                                {isSuperUser && (
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('حذف العميل نهائياً؟ (لا يمكن التراجع)')) onDeleteClient(client.id); }} className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"><Trash2 size={14} /></button>
                                )}
                            </div>
                        )}
                     </div>
                 </div>
             ))
         )}
      </div>
    </div>
  );
};
export default ClientList;

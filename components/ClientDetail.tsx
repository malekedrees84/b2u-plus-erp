
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Client, ProductionRequest, UserRole, RequestStatus, Transaction, Permissions, User, ChatMessage } from '../types';
import { X, Building2, Edit3, Trash2, LayoutDashboard, Briefcase, BarChart3, ArrowUpRight, ArrowDownLeft, HardDrive, Power, ShieldAlert, Zap, Palette, Copy, Check, Plus, PieChart, Wallet, Settings, Activity, Folder, File as FileIcon, Image, ExternalLink, Cloud, UploadCloud, DownloadCloud, Loader2, FileText, FolderPlus, CornerDownLeft, ChevronRight, Home, ArrowRight, Calendar, User as UserIcon, Clock, Lock, Headphones, MessageSquare, Send, CheckCheck } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface ClientDetailProps {
  client: Client;
  requests: ProductionRequest[];
  transactions?: Transaction[];
  onClose: () => void;
  onEdit: (client: Client) => void;
  onEditClick: () => void;
  onDelete: (clientId: string) => void;
  currentUserRole: UserRole;
  currentUsername?: string;
  onOpenRequest: (req: ProductionRequest) => void; 
  userPermissions: Permissions;
  
  // New Props for Chat
  users?: User[];
  messages?: ChatMessage[];
  onSendMessage?: (msg: ChatMessage) => void;
}

// Mock initial files to show functionality with Folder support
const MOCK_FILES = [
    { id: '1', name: 'Brand_Guidelines_2024.pdf', type: 'file', date: '2024-01-15', size: '2.4 MB', folder: '/' },
    { id: '2', name: 'Logo_Pack_Final.zip', type: 'file', date: '2024-01-10', size: '15.6 MB', folder: '/Assets' },
    { id: '3', name: 'Social_Media_Strategy.docx', type: 'file', date: '2024-01-05', size: '1.1 MB', folder: '/Docs' },
    { id: '4', name: 'Banner_Design_v2.jpg', type: 'image', date: '2024-02-01', size: '4.2 MB', folder: '/Designs/Social' },
    { id: '5', name: 'Instagram_Story.jpg', type: 'image', date: '2024-02-02', size: '1.2 MB', folder: '/Designs/Social' },
    { id: '6', name: 'Contract.pdf', type: 'file', date: '2024-01-01', size: '0.5 MB', folder: '/Docs/Legal' }
];

const ClientDetail: React.FC<ClientDetailProps> = ({ client, requests, transactions = [], onClose, onEdit, onEditClick, onDelete, currentUserRole, onOpenRequest, userPermissions, users = [], messages = [], onSendMessage }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'files' | 'invoices' | 'settings' | 'support'>('overview');
  const [projectFilter, setProjectFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE'>('ALL');
  const [copiedColor, setCopiedColor] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // File System State
  const [files, setFiles] = useState(MOCK_FILES);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Advanced Navigation State
  const [currentPath, setCurrentPath] = useState('/'); // المسار الحالي للمتصفح
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]); // المجلدات الفارغة التي تم إنشاؤها حديثاً
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientRequests = requests.filter(r => r && r.client === client.name);
  const clientInvoices = transactions.filter(t => t.clientId === client.id && t.category === 'Invoice');
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidInvoices = clientInvoices.filter(inv => inv.status !== 'Paid');

  const isAdmin = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPERVISOR;
  const canViewFinancials = userPermissions.canViewFinancials || currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.ACCOUNTANT;
  
  const currentUser = JSON.parse(localStorage.getItem('b2u_user') || '{}');
  // Updated Logic: Super User is Tamir OR any Admin
  const isSuperUser = currentUser?.username === 'tamir' || currentUserRole === UserRole.ADMIN;

  // Find linked Client User for Chat
  const clientUser = useMemo(() => users.find(u => u.linkedClientId === client.id && !u.isDeleted), [users, client.id]);
  
  // Filter messages for this client
  const clientMessages = useMemo(() => {
      if (!clientUser) return [];
      return messages.filter(m => 
          m && (m.senderId === clientUser.id || m.receiverId === clientUser.id)
      );
  }, [messages, clientUser]);

  // Auto-scroll chat
  useEffect(() => {
      if (activeTab === 'support' && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [clientMessages.length, activeTab]);

  // Analytics
  const totalProjects = clientRequests.length;
  const completedProjects = clientRequests.filter(r => r.status === RequestStatus.PUBLISHED).length;
  const activeProjects = clientRequests.filter(r => ![RequestStatus.PUBLISHED, RequestStatus.CANCELLED, RequestStatus.ARCHIVED].includes(r.status)).length;
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const overdueTasks = clientRequests.filter(r => new Date(r.dueDate) < new Date() && r.status !== RequestStatus.PUBLISHED).length;
  const accountHealth = overdueTasks > 2 ? 'Risk' : 'Healthy';

  const handleToggleStatus = () => {
      const currentStatus = client.status || 'Active';
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      onEdit({ ...client, status: newStatus as 'Active' | 'Inactive' });
  };

  const copyColor = () => {
      if(client.brandColor) {
          navigator.clipboard.writeText(client.brandColor);
          setCopiedColor(true);
          setTimeout(() => setCopiedColor(false), 2000);
      }
  };

  const copyDriveLink = () => {
      if(client.driveFolderId) {
          const url = client.driveFolderId.startsWith('http') 
            ? client.driveFolderId 
            : `https://drive.google.com/drive/folders/${client.driveFolderId}`;
          navigator.clipboard.writeText(url);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
      }
  };

  // 1. Trigger File Selection
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          setPendingFile(file);
          setCurrentPath('/'); 
      }
  };

  // 2. Confirm Upload
  const confirmUpload = () => {
      if (!pendingFile) return;
      
      setIsUploading(true);
      
      // Simulate network delay
      setTimeout(() => {
          const newFile = {
              id: Date.now().toString(),
              name: pendingFile.name,
              type: pendingFile.type.includes('image') ? 'image' : 'file',
              date: new Date().toISOString().split('T')[0],
              size: `${(pendingFile.size / (1024*1024)).toFixed(1)} MB`,
              folder: currentPath // Save to CURRENT browsed path
          };
          setFiles([newFile, ...files]);
          setIsUploading(false);
          setPendingFile(null); // Close modal
          setNewFolderName('');
          setIsCreatingFolder(false);
      }, 1500);
  };

  const createFolder = () => {
      if(!newFolderName.trim()) return;
      
      // Construct full path for the new folder
      const newPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
      
      // Add to virtual folders list so it appears even if empty
      if (!virtualFolders.includes(newPath)) {
          setVirtualFolders([...virtualFolders, newPath]);
      }
      
      // Navigate into it
      setCurrentPath(newPath);
      setNewFolderName('');
      setIsCreatingFolder(false);
  };

  const handleDownload = (fileName: string) => {
      alert(`جاري تجهيز تنزيل الملف: ${fileName}`);
  };

  const handleDeleteFile = (id: string) => {
      if(confirm('هل أنت متأكد من حذف الملف؟')) {
          setFiles(files.filter(f => f && f.id !== id));
      }
  };

  // --- File System Navigation Logic ---
  const getCurrentFolderContents = () => {
      // 1. Get all unique folders that are direct children of currentPath
      const relevantFiles = files.filter(f => f && f.folder && f.folder.startsWith(currentPath) && f.folder !== currentPath);
      const relevantVirtuals = virtualFolders.filter(f => f.startsWith(currentPath) && f !== currentPath);
      
      const subFolders = new Set<string>();

      // Helper to extract next segment
      const getNextSegment = (fullPath: string, root: string) => {
          // Remove the root path
          const relative = root === '/' ? fullPath.substring(1) : fullPath.substring(root.length + 1);
          // Get the first part before the next slash
          return relative.split('/')[0];
      };

      relevantFiles.forEach(f => {
          const segment = getNextSegment(f.folder, currentPath);
          if(segment) subFolders.add(segment);
      });

      relevantVirtuals.forEach(f => {
          const segment = getNextSegment(f, currentPath);
          if(segment) subFolders.add(segment);
      });

      return Array.from(subFolders).sort();
  };

  const navigateTo = (folderName: string) => {
      const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
      setCurrentPath(newPath);
  };

  const navigateUp = () => {
      if (currentPath === '/') return;
      const parts = currentPath.split('/');
      parts.pop(); // Remove last segment
      const newPath = parts.join('/') || '/'; // Join back, default to root
      setCurrentPath(newPath);
  };

  const breadcrumbs = useMemo(() => {
      if (currentPath === '/') return [];
      return currentPath.split('/').filter(Boolean);
  }, [currentPath]);

  const filteredProjects = clientRequests.filter(r => {
      if (projectFilter === 'ALL') return true;
      if (projectFilter === 'COMPLETED') return r.status === RequestStatus.PUBLISHED;
      if (projectFilter === 'CANCELLED') return r.status === RequestStatus.CANCELLED || r.status === RequestStatus.ARCHIVED;
      if (projectFilter === 'ACTIVE') return ![RequestStatus.PUBLISHED, RequestStatus.CANCELLED, RequestStatus.ARCHIVED].includes(r.status);
      return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSendChat = () => {
      if (!chatInput.trim() || !clientUser || !onSendMessage) return;
      
      const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          receiverId: clientUser.id,
          text: chatInput,
          timestamp: new Date().toISOString(),
          read: false
      };
      
      onSendMessage(msg);
      setChatInput('');
  };

  const isActive = (client.status || 'Active') === 'Active';
  const currentFolderContents = getCurrentFolderContents();

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in font-sans">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[1200px] bg-charcoal-950 h-full shadow-2xl border-l border-white/5 flex flex-col animate-slide-in-right overflow-hidden rounded-l-[40px] ml-auto">
         
         {/* === Header Hero === */}
         <div className="relative h-64 shrink-0 overflow-hidden">
             <div 
                className="absolute inset-0 opacity-20"
                style={{ background: `linear-gradient(to right, ${client.brandColor || '#3b82f6'}, #0f172a)` }}
             ></div>
             <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-transparent"></div>
             
             <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                <div className="flex flex-col md:flex-row items-end gap-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[30px] bg-charcoal-900 border-4 border-charcoal-800 p-2 shadow-2xl flex items-center justify-center overflow-hidden relative z-10">
                            <img src={client.logo} className={`w-full h-full object-contain bg-black/20 rounded-xl ${!isActive ? 'grayscale opacity-50' : ''}`} alt="logo" />
                        </div>
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-charcoal-950 flex items-center justify-center z-20 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {isActive ? <Zap size={14} className="text-black fill-black"/> : <Power size={14} className="text-white"/>}
                        </div>
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{client.name}</h1>
                            <span className="bg-white/10 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/5">{client.industry}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-zinc-400 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-primary"/> 
                                <span>منذ {new Date(client.contractDate).getFullYear()}</span>
                            </div>
                            {client.driveFolderId && (
                                <button onClick={copyDriveLink} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                                    <Cloud size={16} className="text-blue-400"/> 
                                    <span>{copiedLink ? 'تم نسخ الرابط' : 'رابط الدرايف'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 mb-2">
                        {isAdmin && (
                            <>
                                <button onClick={onEditClick} title="تعديل البيانات" className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 border border-white/5 transition-all"><Edit3 size={20}/></button>
                                {isSuperUser && (
                                    <button onClick={handleToggleStatus} className={`p-3 rounded-xl transition-all border ${isActive ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-black'}`}>
                                        <Power size={20}/>
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className="p-3 bg-charcoal-800 text-zinc-400 rounded-xl hover:text-white hover:bg-charcoal-700 transition-all"><X size={20}/></button>
                    </div>
                </div>
             </div>
         </div>

         {/* === Navigation === */}
         <div className="px-8 md:px-12 border-b border-white/5 flex gap-8 bg-charcoal-900/50 backdrop-blur-sm sticky top-0 z-50">
             {[
                 { id: 'overview', label: 'لوحة التحكم', icon: LayoutDashboard },
                 { id: 'projects', label: 'إدارة المشاريع', icon: Briefcase },
                 { id: 'files', label: 'الأصول والملفات', icon: HardDrive },
                 { id: 'support', label: 'الدعم والمراسلات', icon: Headphones }, // NEW TAB
                 { id: 'invoices', label: 'الفواتير والمالية', icon: Wallet, restricted: !canViewFinancials },
                 ...(isSuperUser ? [{ id: 'settings', label: 'الإعدادات', icon: Settings }] : []),
             ].map(tab => {
                 if (tab.restricted) return null; // Hide if restricted
                 return (
                     <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-5 flex items-center gap-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-white'}`}
                     >
                         <tab.icon size={16} /> {tab.label}
                     </button>
                 )
             })}
         </div>

         {/* === Content Area === */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 bg-charcoal-950 relative">
             
             {/* DASHBOARD OVERVIEW */}
             {activeTab === 'overview' && (
                 <div className="animate-slide-up space-y-8 max-w-6xl mx-auto">
                     {/* Stats Row */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-charcoal-900 p-6 rounded-[24px] border border-white/5 flex flex-col justify-between h-40 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-primary/10 text-primary rounded-xl"><Briefcase size={20}/></div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Active</span>
                            </div>
                            <div>
                                <div className="text-4xl font-black text-white mb-1">{activeProjects}</div>
                                <div className="text-xs text-zinc-400">مشاريع قيد التنفيذ</div>
                            </div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-[24px] border border-white/5 flex flex-col justify-between h-40 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><PieChart size={20}/></div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Rate</span>
                            </div>
                            <div>
                                <div className="text-4xl font-black text-white mb-1">{completionRate}%</div>
                                <div className="text-xs text-zinc-400">نسبة الإنجاز</div>
                            </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-1 bg-charcoal-900 p-8 rounded-[32px] border border-white/5">
                             <h3 className="text-white font-black text-lg mb-6 flex items-center gap-2"><Palette size={20} className="text-primary"/> هوية العميل</h3>
                             <div className="space-y-6">
                                 <div>
                                     <div className="flex items-center gap-4 bg-charcoal-950 p-4 rounded-2xl border border-white/5">
                                         <div className="w-12 h-12 rounded-xl shadow-lg border border-white/10" style={{ backgroundColor: client.brandColor || '#333' }}></div>
                                         <div className="flex-1">
                                             <div className="text-white font-mono font-bold text-lg">{client.brandColor || 'Not Set'}</div>
                                             <div className="text-[10px] text-zinc-500">Primary Color</div>
                                         </div>
                                         <button onClick={copyColor} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors">
                                             {copiedColor ? <Check size={18} className="text-emerald-500"/> : <Copy size={18}/>}
                                         </button>
                                     </div>
                                 </div>
                                 <button onClick={onEditClick} className="w-full py-3 border border-dashed border-white/10 rounded-xl text-zinc-500 text-xs hover:text-white hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                                     <Image size={14}/> تغيير صورة العميل
                                 </button>
                             </div>
                         </div>

                         <div className="lg:col-span-2 bg-charcoal-900 p-8 rounded-[32px] border border-white/5 flex flex-col">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-black text-lg flex items-center gap-2"><FileText size={20} className="text-primary"/> الملاحظات الإدارية</h3>
                             </div>
                             <div className="flex-1 bg-charcoal-950 rounded-2xl p-6 border border-white/5 leading-loose text-zinc-300 text-sm whitespace-pre-wrap">
                                 {client.notes || 'لا توجد ملاحظات إدارية مسجلة.'}
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* PROJECTS MANAGEMENT */}
             {activeTab === 'projects' && (
                 <div className="animate-slide-up space-y-8 max-w-6xl mx-auto">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                         <div className="flex bg-charcoal-900 p-1 rounded-xl border border-white/5">
                             {[{ id: 'ALL', label: 'الكل' }, { id: 'ACTIVE', label: 'قيد التنفيذ' }].map(filter => (
                                 <button key={filter.id} onClick={() => setProjectFilter(filter.id as any)} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${projectFilter === filter.id ? 'bg-primary text-black' : 'text-zinc-500'}`}>{filter.label}</button>
                             ))}
                         </div>
                     </div>
                     <div className="space-y-3">
                        {filteredProjects.map(req => (
                             <div 
                                key={req.id} 
                                onClick={() => onOpenRequest(req)}
                                className="bg-charcoal-900 p-4 md:p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-white/5 hover:border-primary/30 transition-all group"
                             >
                                 <div className="flex items-center gap-4 mb-2 md:mb-0">
                                     <div className="w-12 h-12 rounded-xl border border-white/5 overflow-hidden shrink-0">
                                         <img src={client.logo} className="w-full h-full object-cover" alt={client.name} />
                                     </div>
                                     <div>
                                         <h4 className="text-white font-bold text-sm group-hover:text-primary transition-colors">{req.title}</h4>
                                         <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1">
                                             <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(req.dueDate).toLocaleDateString('ar-EG')}</span>
                                             {req.assigneeId && <span className="flex items-center gap-1"><UserIcon size={12}/> {req.assigneeId}</span>}
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                    <div className="flex -space-x-2 flex-row-reverse">
                                        <img src={`https://ui-avatars.com/api/?name=${req.assigneeId}&background=random`} className="w-6 h-6 rounded-full border border-charcoal-900" />
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-black ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                                 </div>
                             </div>
                        ))}
                        {filteredProjects.length === 0 && <div className="text-center opacity-50 py-10">لا توجد مشاريع</div>}
                     </div>
                 </div>
             )}

             {/* FILES & ASSETS */}
             {activeTab === 'files' && (
                 <div className="animate-slide-up max-w-5xl mx-auto space-y-6">
                     <div className="bg-charcoal-900 p-6 rounded-[24px] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <HardDrive size={28} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Google Drive Storage</h3>
                                <p className="text-zinc-500 text-xs">
                                    {client.driveFolderId 
                                        ? `متصل: ${client.driveFolderId.substring(0, 15)}...` 
                                        : 'لم يتم ربط مجلد سحابي بعد'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative">
                                <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" />
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={!client.driveFolderId || isUploading}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
                                    {isUploading ? 'جاري الرفع...' : 'رفع ملف جديد'}
                                </button>
                            </div>
                            {client.driveFolderId && (
                                <a href={client.driveFolderId.startsWith('http') ? client.driveFolderId : `https://drive.google.com/drive/folders/${client.driveFolderId}`} target="_blank" rel="noreferrer" className="bg-charcoal-800 text-white px-5 py-3 rounded-xl font-bold text-xs border border-white/10 hover:bg-white/5 flex items-center gap-2">
                                    <ExternalLink size={16}/> فتح الدرايف
                                </a>
                            )}
                        </div>
                     </div>

                     {/* Main File List in Tab */}
                     {client.driveFolderId ? (
                        <div className="bg-charcoal-900 rounded-[24px] border border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h4 className="text-white font-bold flex items-center gap-2"><Folder size={18} className="text-primary"/> كل الملفات</h4>
                                <span className="text-xs text-zinc-500">{files.length} items</span>
                            </div>
                            
                            {files.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {files.filter(f => f && f.id).map(file => (
                                        <div key={file.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-charcoal-800 flex items-center justify-center text-zinc-400 relative">
                                                    {file.type === 'image' ? <Image size={20}/> : <FileIcon size={20}/>}
                                                    {file.folder && file.folder !== '/' && (
                                                        <div className="absolute -bottom-1 -right-1 bg-charcoal-950 text-zinc-500 text-[8px] px-1 rounded border border-white/10">{file.folder.split('/').pop()}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-bold group-hover:text-primary transition-colors">{file.name}</div>
                                                    <div className="text-[10px] text-zinc-500 flex gap-2">
                                                        <span>{file.date}</span> • <span>{file.size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDownload(file.name)} title="تنزيل الملف" className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg">
                                                    <DownloadCloud size={18}/>
                                                </button>
                                                <button onClick={() => handleDeleteFile(file.id)} title="حذف الملف" className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-zinc-600">
                                    <Folder size={40} className="mx-auto mb-3 opacity-20"/>
                                    <p className="text-sm">المجلد فارغ</p>
                                </div>
                            )}
                        </div>
                     ) : (
                         <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                             <Cloud size={48} className="text-zinc-700 mb-4"/>
                             <p className="text-zinc-500 font-bold mb-4">يجب ربط حساب الدرايف أولاً لرفع الملفات</p>
                             <button onClick={onEditClick} className="text-primary text-xs hover:underline font-bold">إعداد الرابط الآن</button>
                         </div>
                     )}
                 </div>
             )}

             {/* SUPPORT CHAT TAB (NEW) */}
             {activeTab === 'support' && (
                 <div className="animate-slide-up flex flex-col h-full bg-charcoal-900 rounded-[32px] border border-white/5 overflow-hidden">
                     <div className="p-6 border-b border-white/5 bg-charcoal-950 flex justify-between items-center">
                         <div>
                             <h3 className="text-white font-bold text-lg flex items-center gap-2"><Headphones size={20} className="text-blue-500"/> الدعم الفني والإدارة</h3>
                             <p className="text-zinc-500 text-xs">سجل المراسلات المباشرة مع العميل.</p>
                         </div>
                         {clientUser ? (
                             <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${clientUser.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                 <span className="text-xs text-zinc-400">{clientUser.status === 'Active' ? 'بوابة العميل نشطة' : 'بوابة العميل معطلة'}</span>
                             </div>
                         ) : (
                             <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded">لم يتم تفعيل بوابة العميل بعد</span>
                         )}
                     </div>

                     {/* Messages List */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-charcoal-900/50">
                         {clientMessages.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                                 <MessageSquare size={48} className="mb-4" />
                                 <p className="text-sm font-bold">لا توجد رسائل سابقة مع العميل</p>
                             </div>
                         ) : (
                             clientMessages.map(m => {
                                 const isMe = m.senderId === currentUser.id;
                                 return (
                                     <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                         <div className={`max-w-[80%] p-4 rounded-2xl text-sm border ${isMe ? 'bg-blue-600 text-white rounded-tr-none border-blue-500' : 'bg-charcoal-800 text-zinc-300 rounded-tl-none border-white/5'}`}>
                                             {m.text}
                                             <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                                                 <span className="text-[9px] font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                                 {isMe && <CheckCheck size={12} className={m.read ? 'text-white' : 'text-white/50'} />}
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })
                         )}
                         <div ref={chatEndRef} />
                     </div>

                     {/* Input Area */}
                     {clientUser && (
                         <div className="p-4 bg-charcoal-950 border-t border-white/5">
                             <div className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={chatInput} 
                                     onChange={e => setChatInput(e.target.value)} 
                                     onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                     placeholder="اكتب رداً للعميل..." 
                                     className="flex-1 bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary" 
                                 />
                                 <button onClick={handleSendChat} disabled={!chatInput.trim()} className="bg-primary text-black p-3 rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50">
                                     <Send size={18}/>
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             )}

             {/* INVOICES & FINANCE (Protected Tab) */}
             {activeTab === 'invoices' && canViewFinancials && (
                 <div className="animate-slide-up max-w-5xl mx-auto space-y-8">
                     {/* Mini Financial Stats */}
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-charcoal-900 p-6 rounded-2xl border border-white/5">
                             <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">إجمالي الفواتير</div>
                             <div className="text-3xl font-black text-white">₪{totalInvoiced.toLocaleString()}</div>
                         </div>
                         <div className="bg-charcoal-900 p-6 rounded-2xl border border-white/5">
                             <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">مستحقات غير مدفوعة</div>
                             <div className="text-3xl font-black text-orange-500">
                                 ₪{unpaidInvoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                             </div>
                         </div>
                     </div>

                     <div className="bg-charcoal-900 rounded-[24px] border border-white/5 overflow-hidden">
                         <div className="p-6 border-b border-white/5">
                             <h4 className="text-white font-bold flex items-center gap-2"><Wallet size={18} className="text-emerald-500"/> سجل الفواتير</h4>
                         </div>
                         <div className="divide-y divide-white/5">
                             {clientInvoices.length === 0 ? (
                                 <div className="p-8 text-center text-zinc-600">لا توجد فواتير مسجلة لهذا العميل.</div>
                             ) : (
                                 clientInvoices.map(inv => (
                                     <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                         <div>
                                             <div className="text-white font-bold text-sm">{inv.description.split('-')[0]}</div>
                                             <div className="text-zinc-500 text-[10px]">{new Date(inv.date).toLocaleDateString('ar-EG')}</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="text-white font-black text-sm">₪{inv.amount.toLocaleString()}</div>
                                             <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'Paid' ? 'text-emerald-500 bg-emerald-500/10' : 'text-orange-500 bg-orange-500/10'}`}>
                                                 {inv.status}
                                             </span>
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 </div>
             )}

             {/* SETTINGS (DELETE/ARCHIVE) - RESTRICTED TO ADMIN */}
             {activeTab === 'settings' && isSuperUser && (
                 <div className="animate-slide-up max-w-2xl mx-auto space-y-6">
                     <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8">
                         <h3 className="text-red-500 font-black text-xl mb-6 flex items-center gap-2"><ShieldAlert size={24}/> منطقة الخطر (إدارة خاصة)</h3>
                         <div className="space-y-4">
                             <div className="flex items-center justify-between p-4 bg-charcoal-950 rounded-2xl border border-red-500/5">
                                 <div><h4 className="text-white font-bold text-sm">أرشفة العميل</h4></div>
                                 <button onClick={handleToggleStatus} className="px-4 py-2 bg-charcoal-900 text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-white/5">{isActive ? 'تجميد' : 'تنشيط'}</button>
                             </div>
                             <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/10">
                                 <div><h4 className="text-red-200 font-bold text-sm">حذف نهائي</h4></div>
                                 <button onClick={() => { if(confirm('حذف نهائي؟')) { onDelete(client.id); onClose(); } }} className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600"><Trash2 size={14}/></button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
         </div>

         {/* === Advanced Upload Modal (Browser) === */}
         {pendingFile && (
             <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                 <div className="bg-charcoal-900 w-full max-w-2xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
                     
                     {/* 1. Modal Header */}
                     <div className="p-6 border-b border-white/5 bg-charcoal-950 flex justify-between items-center shrink-0">
                         <div>
                             <h3 className="text-white font-bold flex items-center gap-2 text-lg"><Cloud size={20} className="text-primary"/> تصفح الدرايف</h3>
                             <p className="text-zinc-500 text-xs">اختر المسار المناسب لحفظ الملف أو أنشئ مجلد جديد.</p>
                         </div>
                         <button onClick={() => setPendingFile(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                     </div>

                     {/* 2. Breadcrumbs & File Info */}
                     <div className="p-4 bg-charcoal-800/50 border-b border-white/5 flex flex-col gap-4">
                         
                         {/* File Card */}
                         <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-white/5">
                             <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary"><FileIcon size={20}/></div>
                             <div className="overflow-hidden flex-1">
                                 <div className="text-white text-sm font-bold truncate">{pendingFile.name}</div>
                                 <div className="text-zinc-500 text-[10px] font-mono">{(pendingFile.size / (1024*1024)).toFixed(2)} MB</div>
                             </div>
                         </div>

                         {/* Navigation Bar */}
                         <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5 overflow-x-auto no-scrollbar">
                             <button onClick={() => setCurrentPath('/')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${currentPath === '/' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}>
                                 <Home size={14}/>
                             </button>
                             {breadcrumbs.map((crumb, idx) => {
                                 // Reconstruct path up to this crumb
                                 const path = '/' + breadcrumbs.slice(0, idx + 1).join('/');
                                 return (
                                     <div key={path} className="flex items-center gap-1 shrink-0">
                                         <ChevronRight size={12} className="text-zinc-600"/>
                                         <button 
                                            onClick={() => setCurrentPath(path)} 
                                            className={`text-xs font-bold px-2 py-1 rounded transition-all ${idx === breadcrumbs.length - 1 ? 'text-primary bg-primary/10' : 'text-zinc-400 hover:text-white'}`}
                                         >
                                             {crumb}
                                         </button>
                                     </div>
                                 )
                             })}
                         </div>
                     </div>

                     {/* 3. Folder Browser (Main Area) */}
                     <div className="flex-1 overflow-y-auto p-6 bg-charcoal-900 custom-scrollbar relative">
                         <div className="flex justify-between items-center mb-4">
                             <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">المحتويات</h4>
                             <button 
                                onClick={() => setIsCreatingFolder(!isCreatingFolder)} 
                                className="text-[10px] flex items-center gap-1 text-primary hover:underline font-bold"
                             >
                                 <FolderPlus size={14}/> مجلد جديد
                             </button>
                         </div>

                         {/* Create Folder Inline Input */}
                         {isCreatingFolder && (
                             <div className="mb-4 flex items-center gap-2 animate-fade-in bg-white/5 p-2 rounded-xl border border-primary/30">
                                 <Folder size={20} className="text-primary ml-2"/>
                                 <input 
                                    autoFocus
                                    type="text" 
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="اسم المجلد الجديد..." 
                                    className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                                    onKeyDown={e => e.key === 'Enter' && createFolder()}
                                 />
                                 <button onClick={createFolder} className="bg-primary text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90">إنشاء</button>
                                 <button onClick={() => setIsCreatingFolder(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400"><X size={14}/></button>
                             </div>
                         )}

                         {/* Folders Grid */}
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {currentPath !== '/' && (
                                 <button onClick={navigateUp} className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 text-zinc-500 transition-all group">
                                     <CornerDownLeft size={24} className="mb-2 group-hover:text-white"/>
                                     <span className="text-xs font-bold">رجوع</span>
                                 </button>
                             )}
                             
                             {currentFolderContents.length > 0 ? (
                                 currentFolderContents.map(folderName => (
                                     <button 
                                        key={folderName} 
                                        onClick={() => navigateTo(folderName)}
                                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-charcoal-800/50 hover:bg-charcoal-800 hover:border-primary/30 transition-all group text-center"
                                     >
                                         <Folder size={32} className="mb-3 text-amber-400/80 group-hover:text-amber-400 transition-colors drop-shadow-lg"/>
                                         <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate w-full">{folderName}</span>
                                     </button>
                                 ))
                             ) : (
                                 !isCreatingFolder && (
                                     <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 opacity-60">
                                         <Folder size={40} className="mb-2"/>
                                         <p className="text-xs font-bold">المجلد فارغ</p>
                                     </div>
                                 )
                             )}
                         </div>
                     </div>

                     {/* 4. Footer Action */}
                     <div className="p-6 border-t border-white/5 bg-charcoal-900 flex gap-4 shrink-0 items-center">
                         <div className="flex-1">
                             <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">المسار المختار:</p>
                             <div className="text-xs text-primary font-mono truncate dir-ltr text-left">{currentPath}</div>
                         </div>
                         <button onClick={() => setPendingFile(null)} className="px-6 py-3 text-zinc-500 font-bold hover:text-white transition-colors text-sm">إلغاء</button>
                         <button onClick={confirmUpload} disabled={isUploading} className="bg-primary text-black px-8 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-400 transition-colors shadow-lg shadow-primary/20">
                             {isUploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18}/>}
                             {isUploading ? 'جاري الرفع...' : 'رفع هنا'}
                         </button>
                     </div>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};
export default ClientDetail;

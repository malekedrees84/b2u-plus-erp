
import React, { useState, useEffect } from 'react';
import { ProductionRequest, RequestStatus, User, Announcement, ChatMessage, AppNotification } from '../types';
import { Crown, Zap, Target, Activity, Sparkles, ChevronRight, Users, ArrowUpRight, FileText, RefreshCcw, Megaphone, ExternalLink, Info, Bell, CheckCircle2, Clock, CalendarDays, MessageSquare, Briefcase, Archive } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface DashboardProps {
  requests: ProductionRequest[];
  currentUser: User;
  announcements: Announcement[];
  onNavigate: (page: string, filter?: string) => void;
  appLogo: string;
}

const BannerSlide: React.FC<{ announcement: Announcement }> = ({ announcement }) => {
    // Safety check: Ensure announcement exists
    if (!announcement) return null;

    // Determine slides source: New 'slides' array OR legacy 'images' array OR single 'imageUrl'
    // Normalize everything to a consistent structure for the slideshow
    const slides = React.useMemo(() => {
        if (announcement.slides && announcement.slides.length > 0) {
            return announcement.slides;
        } else if (announcement.images && announcement.images.length > 0) {
            // Legacy: Multiple images, same text
            return announcement.images.map((img, i) => ({
                id: i.toString(),
                image: img,
                title: announcement.title,
                content: announcement.content
            }));
        } else if (announcement.imageUrl) {
            // Legacy: Single image
            return [{
                id: '1',
                image: announcement.imageUrl,
                title: announcement.title,
                content: announcement.content
            }];
        }
        return [];
    }, [announcement]);
    
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (slides.length <= 1) return;
        
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % slides.length);
        }, 5000); // Change every 5 seconds

        return () => clearInterval(interval);
    }, [slides.length]);

    if (slides.length === 0) return null;

    // Safety check for current slide
    const currentSlide = slides[currentIndex];
    if (!currentSlide) return null;

    return (
        <div 
            className="relative h-48 md:h-64 rounded-[40px] overflow-hidden border border-white/5 shadow-2xl group cursor-pointer transition-all hover:scale-[1.01]"
            style={{ backgroundColor: announcement.backgroundColor || '#1e293b' }}
        >
            {slides.map((slide, idx) => (
                <div key={slide.id || idx} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <img 
                        src={slide.image} 
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ${idx === currentIndex ? 'scale-105' : 'scale-100'}`} 
                        alt={slide.title || 'Banner'} 
                        loading="lazy"
                    />
                    {/* Gradient Overlay & Text per slide */}
                    <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/50 to-transparent flex flex-col justify-center px-8 md:px-12">
                        <h2 className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tighter drop-shadow-lg leading-tight" style={{ color: announcement.textColor || '#fff' }}>
                            {slide.title}
                        </h2>
                        <p className="text-zinc-300 text-sm md:text-lg font-bold max-w-xl line-clamp-2 leading-relaxed drop-shadow-md" style={{ color: announcement.textColor ? `${announcement.textColor}cc` : '#d1d5db' }}>
                            {slide.content}
                        </p>
                    </div>
                </div>
            ))}
            
            {/* Dots indicator for slideshow */}
            {slides.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {slides.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                        ></div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ requests = [], currentUser, announcements = [], onNavigate, appLogo }) => {
  // Safe filtering for announcements
  const activeAnnouncements = announcements.filter(a => a && a.isActive);
  
  // Update Logic: Show anything that is explicitly 'hero' OR ('info' which is the default for cards)
  const scrollingAnnouncements = activeAnnouncements.filter(a => a.type === 'scrolling' || a.isScrolling);
  const heroAnnouncements = activeAnnouncements.filter(a => a.type === 'hero' || (a.type !== 'scrolling' && !a.isScrolling));

  // Filter ONLY Active requests for operational stats
  const activeRequests = requests.filter(r => r && r.isActive !== false && r.status !== RequestStatus.ARCHIVED);
  
  // Explicitly calculate Archived requests
  const archivedRequests = requests.filter(r => r && (r.isActive === false || r.status === RequestStatus.ARCHIVED));

  // Time-based greeting logic
  const [greeting, setGreeting] = useState('أهلاً بك');
  
  useEffect(() => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('صباح الخير');
      else if (hour >= 12 && hour < 17) setGreeting('طاب مساؤك');
      else setGreeting('مساء الخير');
  }, []);

  const stats = {
    total: activeRequests.filter(r => r.status !== RequestStatus.PUBLISHED).length, 
    review: activeRequests.filter(r => [RequestStatus.WAITING_REVIEW, RequestStatus.IN_REVIEW].includes(r.status)).length,
    approved: activeRequests.filter(r => [RequestStatus.APPROVED].includes(r.status)).length,
    urgent: activeRequests.filter(r => r.priority === 'High' && r.status !== RequestStatus.PUBLISHED).length,
    recurring: activeRequests.filter(r => r.isRecurring).length,
    archived: archivedRequests.length 
  };

  const recentActivity = activeRequests.slice(0, 5).map(r => ({
      id: r.id,
      text: `تم تحديث حالة "${r.title}" إلى ${r.status}`,
      time: new Date(r.createdAt).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
      icon: Activity
  }));

  const handleCardClick = (filterType: string) => {
      onNavigate('requests', filterType);
  };

  // --- Daily Briefing Logic ---
  const today = new Date().toISOString().split('T')[0];
  
  const myDueToday = activeRequests.filter(r => 
      r.assigneeId === currentUser.id && 
      r.dueDate === today && 
      ![RequestStatus.PUBLISHED, RequestStatus.ARCHIVED].includes(r.status)
  );

  const myLateTasks = activeRequests.filter(r => 
      r.assigneeId === currentUser.id && 
      new Date(r.dueDate) < new Date() && 
      ![RequestStatus.PUBLISHED, RequestStatus.ARCHIVED].includes(r.status)
  );

  const myNewAssignments = activeRequests.filter(r =>
      r.assigneeId === currentUser.id && 
      r.status === RequestStatus.CREATED
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in min-h-full bg-charcoal-950 pb-24 text-right custom-scrollbar">
      
      {/* 1. Daily Briefing Panel */}
      <div className="mb-10 bg-gradient-to-r from-charcoal-900 to-charcoal-950 border border-white/5 rounded-[40px] p-8 md:p-10 relative overflow-hidden group z-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-10">
              <div className="md:w-1/3 border-l border-white/5 pl-8">
                  <h2 className="text-3xl font-black text-white mb-2">{greeting}، {currentUser.name.split(' ')[0]} 👋</h2>
                  <p className="text-zinc-500 text-sm font-medium mb-6">إليك ملخص سريع لأهم مستجدات يومك.</p>
                  
                  <div className="space-y-4">
                      <div className="flex items-center gap-4 bg-charcoal-800/50 p-4 rounded-2xl border border-white/5">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><Clock size={20}/></div>
                          <div>
                              <div className="text-2xl font-black text-white">{myDueToday.length}</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">مهام تستحق اليوم</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-4 bg-charcoal-800/50 p-4 rounded-2xl border border-white/5">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Zap size={20}/></div>
                          <div>
                              <div className="text-2xl font-black text-white">{myLateTasks.length}</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">مهام متأخرة</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-charcoal-900/50 rounded-3xl p-6 border border-white/5">
                      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><CalendarDays size={16} className="text-primary"/> جدول اليوم</h3>
                      <div className="space-y-3">
                          {myDueToday.length > 0 ? myDueToday.slice(0, 3).map(task => (
                              <div key={task.id} onClick={() => onNavigate('mytasks')} className="p-3 bg-charcoal-950 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
                                  <span className="text-xs text-zinc-300 font-bold truncate flex-1">{task.title}</span>
                                  <span className={`text-[8px] px-2 py-0.5 rounded ${STATUS_COLORS[task.status]}`}>{task.status}</span>
                              </div>
                          )) : (
                              <div className="text-center py-6 text-zinc-600 text-xs">لا توجد مهام مستحقة اليوم 🎉</div>
                          )}
                      </div>
                  </div>
                  
                  <div className="bg-charcoal-900/50 rounded-3xl p-6 border border-white/5">
                      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Briefcase size={16} className="text-emerald-500"/> مهام جديدة للإسناد</h3>
                      <div className="space-y-3">
                          {myNewAssignments.length > 0 ? myNewAssignments.slice(0, 3).map(task => (
                              <div key={task.id} onClick={() => onNavigate('mytasks')} className="p-3 bg-charcoal-950 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-emerald-500/30 transition-colors">
                                  <span className="text-xs text-zinc-300 font-bold truncate flex-1">{task.title}</span>
                                  <span className="text-[9px] text-emerald-500 font-bold">جديد</span>
                              </div>
                          )) : (
                              <div className="text-center py-6 text-zinc-600 text-xs">لا توجد تكليفات جديدة</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. Scrolling News Ticker */}
      {scrollingAnnouncements.length > 0 && (
        <div className="mb-6 overflow-hidden bg-primary/10 border-y border-primary/20 py-2 relative flex items-center z-10">
            <div className="bg-primary text-black px-4 py-1 text-[10px] font-black uppercase tracking-widest z-10 flex items-center gap-2 shrink-0 shadow-lg">
                <Megaphone size={14} /> عاجل
            </div>
            <div className="whitespace-nowrap flex animate-[marquee_30s_linear_infinite] hover:pause">
                {scrollingAnnouncements.map(a => (
                    <span key={a.id} className="text-white font-bold text-sm mx-12 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary-color)]"></span>
                        {a.content}
                        {a.link && <ExternalLink size={12} className="text-primary opacity-50"/>}
                    </span>
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .pause:hover { animation-play-state: paused; }
            `}</style>
        </div>
      )}

      {/* 3. Hero Banners (Slideshow) */}
      {heroAnnouncements.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-4 z-0 relative">
              {heroAnnouncements.map(a => (
                  <BannerSlide key={a.id} announcement={a} />
              ))}
          </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 mb-8 relative z-20">
        {[
            { label: 'إجمالي الطلبات (النشطة)', value: stats.total, color: 'text-white', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: FileText, filter: 'All' },
            { label: 'قيد المراجعة', value: stats.review, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Target, filter: 'Review' },
            { label: 'تم الاعتماد', value: stats.approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Crown, filter: 'Approved' },
            { label: 'دورية', value: stats.recurring, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: RefreshCcw, filter: 'Recurring' },
            { label: 'عاجل جداً', value: stats.urgent, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Zap, filter: 'Urgent' },
            { label: 'الأرشيف', value: stats.archived, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Archive, filter: 'Archived' },
        ].map((stat, i) => (
            <button 
                key={i} 
                onClick={() => handleCardClick(stat.filter)}
                className={`premium-card p-4 md:p-6 rounded-[20px] md:rounded-[28px] border ${stat.border} cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden text-right w-full flex flex-col items-start`}
            >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none"></div>
                <div className="relative z-10 w-full">
                    <div className="flex justify-between items-start mb-4 md:mb-6 w-full">
                        <div className={`p-2 md:p-3 rounded-lg md:rounded-2xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={18} className="md:w-[22px] md:h-[22px]" />
                        </div>
                        <ArrowUpRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 ${stat.color}`} />
                    </div>
                    <p className={`text-2xl md:text-5xl black-header mb-0.5 md:mb-1 ${stat.color}`}>{stat.value}</p>
                    <h3 className="text-zinc-500 text-[9px] md:text-xs font-bold uppercase tracking-wider">{stat.label}</h3>
                </div>
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <div className="lg:col-span-2 premium-card p-6 md:p-8 rounded-[24px] md:rounded-[32px] border-white/5">
              <h3 className="text-white font-bold text-lg md:text-xl mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> نشاطات التتبع الحديثة
              </h3>
              <div className="space-y-4 md:space-y-6 relative">
                  <div className="absolute top-2 right-4 bottom-2 w-px bg-charcoal-800 hidden sm:block"></div>
                  {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                      <div key={idx} className="relative pr-0 sm:pr-10 group">
                          <div className="absolute right-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-charcoal-950 border-2 border-primary z-10 group-hover:scale-125 transition-transform hidden sm:block"></div>
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-4">
                              <p className="text-zinc-300 text-xs md:text-sm font-medium leading-relaxed group-hover:text-white transition-colors">{act.text}</p>
                              <span className="text-[9px] font-mono text-zinc-600 bg-charcoal-900 px-2 py-0.5 rounded">{act.time}</span>
                          </div>
                      </div>
                  )) : <p className="text-zinc-500 text-xs text-center">لا توجد نشاطات تتبع حديثة</p>}
              </div>
          </div>

          <div className="premium-card p-6 md:p-8 rounded-[24px] md:rounded-[32px] border-white/5 flex flex-col bg-gradient-to-b from-charcoal-900 to-black">
               <h3 className="text-white font-bold text-lg md:text-xl mb-6 flex items-center gap-2"><Sparkles size={18} className="text-primary"/> نظام المهمات الذكي</h3>
               <div className="space-y-6">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                       <h4 className="text-zinc-400 text-[10px] font-black uppercase mb-3 tracking-widest">تنبيهات التتبع</h4>
                       <ul className="space-y-4">
                           <li className="flex items-start gap-3">
                               <RefreshCcw size={16} className="text-blue-500 mt-0.5" />
                               <div>
                                   <p className="text-white text-xs font-bold">توليد تلقائي</p>
                                   <p className="text-zinc-500 text-[10px]">يتم إنشاء المهمات الدورية عند منتصف الليل.</p>
                               </div>
                           </li>
                           <li className="flex items-start gap-3">
                               <Target size={16} className="text-emerald-500 mt-0.5" />
                               <div>
                                   <p className="text-white text-xs font-bold">تتبع الأداء</p>
                                   <p className="text-zinc-500 text-[10px]">تأخير المهام الدورية يؤثر على تقييم القسم.</p>
                               </div>
                           </li>
                       </ul>
                   </div>
                   <button onClick={() => onNavigate('requests', 'All')} className="w-full py-4 rounded-2xl bg-primary text-black font-black text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                       إدارة المهمات
                   </button>
               </div>
          </div>
      </div>
    </div>
  );
};
export default Dashboard;

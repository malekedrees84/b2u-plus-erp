
import React from "react";
import { User, UserRole, Permissions } from "../types";
import { LayoutDashboard, CheckSquare, Layers, Building2, Users, Settings, MessageSquare, Camera, Bell, CalendarDays, RefreshCw, Wallet, Zap, Megaphone } from "lucide-react";

type SidebarProps = {
  currentUser: User;
  onNavigate: (page: string) => void;
  currentPage: string;
  appSettings: { appName: string; appLogo: string; primaryColor: string; };
  onLogout: () => void;
  onProfileClick: () => void;
  onToggleNotifications: () => void;
  onToggleChat: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount?: number; 
  myTasksCount?: number; 
  allRequestsCount?: number;
  onRefresh?: () => Promise<void> | void;
  isSyncing?: boolean;
  userPermissions?: Permissions;
};

interface NavItem {
    key: string;
    label: string;
    icon: any;
    roles?: UserRole[];
    permission?: keyof Permissions;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { key: "mytasks", label: "مهامي", icon: CheckSquare },
  { key: "calendar", label: "التقويم", icon: CalendarDays }, 
  { key: "requests", label: "طلبات الإنتاج", icon: Layers },
  { key: "clients", label: "العملاء", icon: Building2 },
  { key: "announcements", label: "لوحة الإعلانات", icon: Megaphone, permission: 'canPostAnnouncements' }, 
  { key: "finance", label: "الإدارة المالية", icon: Wallet, permission: 'canManageFinance' }, 
  { key: "team", label: "الفريق", icon: Users }, 
  { key: "settings", label: "الإعدادات", icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onNavigate, currentPage, appSettings, onLogout, onProfileClick, onToggleNotifications, onToggleChat, unreadNotificationsCount, unreadMessagesCount = 0, myTasksCount = 0, allRequestsCount = 0, onRefresh, isSyncing = false, userPermissions }) => {
  
  const getBadgeCount = (key: string) => {
      if (key === 'mytasks') return myTasksCount;
      if (key === 'requests') return allRequestsCount;
      return 0;
  };

  const handleSystemUpdate = async () => {
      if (onRefresh && !isSyncing) {
          await onRefresh();
          // NO RELOAD NEEDED - React state updates automatically
      }
  };

  const userRoles = currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role];

  return (
    <aside className="h-full w-full bg-charcoal-950 border-l border-white/5 flex flex-col pt-8">
      <div className="px-6 pb-8 border-b border-white/5 flex flex-col items-center justify-center gap-6 text-center relative">
        <button onClick={onToggleNotifications} className="absolute top-0 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all group" title="الإشعارات">
            <Bell size={18} />
            {unreadNotificationsCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-charcoal-950 animate-pulse"></span>}
        </button>
        <div className="relative group perspective-1000">
           <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-700"></div>
           <img src={appSettings.appLogo} alt="logo" className="w-32 h-32 rounded-2xl object-contain relative z-10 drop-shadow-2xl animate-spin-slow-3d" />
        </div>
        <div className="space-y-1">
          <div className="text-xl font-black tracking-tight truncate text-white">{appSettings.appName}</div>
          <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 py-1.5 px-4 rounded-full inline-block border border-primary/20">Premium OS</div>
        </div>
      </div>

      <div onClick={onProfileClick} className="px-6 py-6 border-b border-white/5 text-right bg-gradient-to-b from-white/[0.02] to-transparent cursor-pointer hover:bg-white/5 transition-colors group relative">
        <div className="flex items-center gap-3">
             <div className="relative">
                <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-charcoal-800 group-hover:border-primary transition-colors object-cover" />
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <Camera size={14} className="text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-charcoal-950 rounded-full"></div>
             </div>
             <div>
                <div className="text-sm font-bold truncate text-white group-hover:text-primary transition-colors">{currentUser.name}</div>
                <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider flex gap-1 flex-wrap">
                    {userRoles.slice(0, 1).map(r => <span key={r}>{r}</span>)}
                    {userRoles.length > 1 && <span>+{userRoles.length - 1}</span>}
                </div>
             </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar">
        {navItems.map((item) => {
          let hasAccess = true;
          if (item.permission && userPermissions && !userPermissions[item.permission]) hasAccess = false;
          else if (item.roles && !item.permission) {
              const hasRoleAccess = item.roles.some(r => userRoles.includes(r));
              if (!hasRoleAccess) hasAccess = false;
          }
          if (!hasAccess) return null;

          const active = currentPage === item.key;
          const badgeCount = getBadgeCount(item.key);

          return (
            <button key={item.key} onClick={() => onNavigate(item.key)} className={`w-full flex items-center gap-4 text-right px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${active ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}>
              {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
              <div className="relative">
                  <item.icon size={20} className={active ? "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "group-hover:text-primary transition-colors"} />
                  {badgeCount > 0 && <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-charcoal-950 animate-bounce`}>{badgeCount}</span>}
              </div>
              <span className="text-sm font-medium flex-1">{item.label}</span>
            </button>
          );
        })}

        <button onClick={onToggleChat} className={`w-full flex items-center gap-4 text-right px-4 py-3 rounded-xl transition-all group relative overflow-hidden text-zinc-500 hover:text-white hover:bg-white/5`}>
            <div className="relative">
                <MessageSquare size={20} className="group-hover:text-primary transition-colors" />
                {unreadMessagesCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-charcoal-950 animate-bounce">{unreadMessagesCount}</span>}
            </div>
            <span className="text-sm font-medium flex-1">محادثات الفريق</span>
        </button>
      </nav>

      <div className="px-4 pb-4 space-y-2">
        {onRefresh && (
            <button onClick={handleSystemUpdate} disabled={isSyncing} className={`w-full px-4 py-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${isSyncing ? 'bg-primary/10 border-primary/20 text-primary cursor-wait' : 'bg-charcoal-900 border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white'}`} title="تحديث البيانات">
                {isSyncing ? (
                    <><RefreshCw size={16} className="animate-spin" /><span>جاري المزامنة...</span></>
                ) : (
                    <><div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span className="flex items-center gap-1">Live Sync <Zap size={12} className="text-emerald-500 fill-emerald-500"/></span></div></>
                )}
            </button>
        )}
        <button onClick={onLogout} className="w-full px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-sm font-bold text-red-400/80 hover:text-red-400">تسجيل خروج</button>
      </div>
    </aside>
  );
};

export default Sidebar;

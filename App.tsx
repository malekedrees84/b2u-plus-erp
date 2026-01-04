import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RequestList from './components/RequestList';
import RequestDrawer from './components/RequestDrawer';
import RequestDetail from './components/RequestDetail';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import MyTasks from './components/MyTasks';
import TeamView from './components/TeamView';
import ClientList from './components/ClientList';
import ClientDetail from './components/ClientDetail';
import ClientDrawer from './components/ClientDrawer';
import UserDetail from './components/UserDetail';
import UserDrawer from './components/UserDrawer';
import UserProfileModal from './components/UserProfileModal';
import FinanceDashboard from './components/FinanceDashboard';
import CalendarView from './components/CalendarView';
import AnnouncementsPage from './components/AnnouncementsPage';
import Settings from './components/Settings';
import NotificationPanel from './components/NotificationPanel';
import NotificationPopup from './components/NotificationPopup';
import TeamChatPanel from './components/TeamChatPanel';
import Toast from './components/Toast';
import { api } from './services/api';
import { getSocket } from './services/realtime';
import { 
  ProductionRequest, User, Client, AppNotification, 
  ToastType, RequestStatus, Transaction, Announcement, 
  UserRole, RolePermissions, AppSettings, ChatMessage 
} from './types';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const MESSAGE_SOUND = "https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3";

const INITIAL_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: { canCreateRequest: true, canEditRequest: true, canDeleteRequest: true, canManageUsers: true, canPostAnnouncements: true, canViewReports: true, canViewAllRequests: true, canViewInternalNotes: true, canApproveTasks: true, canPublishTasks: true, canSeeActivityLog: true, canManageFinance: true, canViewFinancials: true },
  [UserRole.SUPERVISOR]: { canCreateRequest: true, canEditRequest: true, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: true, canViewReports: true, canViewAllRequests: true, canViewInternalNotes: true, canApproveTasks: true, canPublishTasks: false, canSeeActivityLog: true, canManageFinance: false, canViewFinancials: true },
  [UserRole.ACCOUNTANT]: { canCreateRequest: false, canEditRequest: false, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: false, canViewReports: true, canViewAllRequests: true, canViewInternalNotes: false, canApproveTasks: false, canPublishTasks: false, canSeeActivityLog: false, canManageFinance: true, canViewFinancials: true },
  [UserRole.CREATOR]: { canCreateRequest: true, canEditRequest: true, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: false, canViewReports: false, canViewAllRequests: false, canViewInternalNotes: false, canApproveTasks: false, canPublishTasks: false, canSeeActivityLog: false, canManageFinance: false, canViewFinancials: false },
  [UserRole.PUBLISHING]: { canCreateRequest: false, canEditRequest: false, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: false, canViewReports: false, canViewAllRequests: true, canViewInternalNotes: false, canApproveTasks: false, canPublishTasks: true, canSeeActivityLog: false, canManageFinance: false, canViewFinancials: false },
  [UserRole.VIEWER]: { canCreateRequest: false, canEditRequest: false, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: false, canViewReports: true, canViewAllRequests: true, canViewInternalNotes: false, canApproveTasks: false, canPublishTasks: false, canSeeActivityLog: false, canManageFinance: false, canViewFinancials: false },
  [UserRole.CLIENT]: { canCreateRequest: true, canEditRequest: false, canDeleteRequest: false, canManageUsers: false, canPostAnnouncements: false, canViewReports: false, canViewAllRequests: false, canViewInternalNotes: false, canApproveTasks: false, canPublishTasks: false, canSeeActivityLog: false, canManageFinance: false, canViewFinancials: false },
};

/** ✅ تمييز إذا احنا داخل Tauri Desktop */
const isTauri = () => typeof window !== "undefined" && ("__TAURI_IPC__" in window);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('b2u_auth') === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('b2u_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem('b2u_chat_history') || '[]'); } catch { return []; }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try { return JSON.parse(localStorage.getItem('b2u_notifications') || '[]'); } catch { return []; }
  });
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activePopupNotification, setActivePopupNotification] = useState<AppNotification | null>(null);
  const [activeToast, setActiveToast] = useState<{message: string, type: ToastType} | null>(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<ProductionRequest | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [showRequestDrawer, setShowRequestDrawer] = useState(false);
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(INITIAL_PERMISSIONS);
  const [appSettings, setAppSettings] = useState<AppSettings>({
      appName: 'B2U Plus Flow',
      appLogo: 'https://i.ibb.co/fffjdK1/IMG-0106-Background-Removed.png',
      primaryColor: '#3b82f6'
  });

  const audioUnlocked = useRef(false);

  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current) return;
    const a = new Audio(NOTIFICATION_SOUND);
    a.volume = 0.01;
    a.play().then(() => { audioUnlocked.current = true; }).catch(() => {});
  }, []);

  const playSound = useCallback((type: 'notif' | 'msg' = 'notif') => {
    if (!audioUnlocked.current) return;
    new Audio(type === 'msg' ? MESSAGE_SOUND : NOTIFICATION_SOUND).play().catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [u, c, t, tx, an, settings] = await Promise.all([
        api.listUsers(), 
        api.listClients(), 
        api.listTasks(),
        api.listTransactions(),
        api.listAnnouncements(),
        api.getSettings()
      ]);
      setUsers(u || []); 
      setClients(c || []); 
      setRequests(t || []);
      setTransactions(tx || []);
      setAnnouncements(an || []);
      if (settings?.appName) setAppSettings(settings);
      if (settings?.rolePermissions) setRolePermissions(settings.rolePermissions);
    } catch (e) { 
      console.error("Fetch error:", e); 
    }
    setIsSyncing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ✅ زر فحص تحديثات (Tauri Updater)
  const handleCheckUpdates = useCallback(async () => {
    try {
      if (!isTauri()) {
        alert("❌ فحص التحديثات يعمل فقط داخل تطبيق الماك (Tauri)، مش من المتصفح.");
        return;
      }

      // lazy imports حتى ما يخرب بالويب
      const { check } = await import("@tauri-apps/plugin-updater");
      const { message, confirm } = await import("@tauri-apps/plugin-dialog");

      await message("🔍 جاري فحص التحديثات...");

      const update = await check();

      if (!update) {
        await message("✅ لا يوجد تحديثات حالياً.");
        return;
      }

      const ok = await confirm(
        `🚀 يوجد تحديث جديد!\n\nVersion: ${update.version}\n\nبدك تثبته الآن؟`,
        { title: "Update Available", kind: "info" }
      );

      if (!ok) return;

      await message("⬇️ جاري تنزيل التحديث...");
      await update.downloadAndInstall();

      await message("✅ تم تثبيت التحديث! رح يعيد تشغيل التطبيق الآن.");
      // عادة Tauri بيعمل restart تلقائي بعد install
    } catch (e: any) {
      console.error(e);
      alert("❌ خطأ في التحديث: " + (e?.message || e));
    }
  }, []);

  // Socket Lifecycle
  useEffect(() => {
    const socket = getSocket();
    if (currentUser?.id) socket.emit("client:hello", { userId: currentUser.id });

    socket.on("settings:sync", (data: { settings: AppSettings, rolePermissions: RolePermissions }) => {
        if (data.settings) setAppSettings(data.settings);
        if (data.rolePermissions) setRolePermissions(data.rolePermissions);
    });

    socket.on("notification:new", (n: AppNotification) => {
      const myId = currentUser?.id;
      const target = n.targetUserId;
      const isForMe = target === "all" || target === myId || (Array.isArray(target) && myId && target.includes(myId));
      if (!isForMe) return;

      setNotifications(prev => [n, ...prev].slice(0, 50));
      if (!n.isPassive) {
        setActivePopupNotification(n);
        playSound('notif');
      }
    });

    socket.on("chat:message", (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg].slice(-100));
        if (!showTeamChat && msg.senderId !== currentUser?.id) {
            playSound('msg');
        }
    });

    socket.on("task:sync", (updatedTask: ProductionRequest) => {
        setRequests(prev => prev.map(r => r.id === updatedTask.id ? updatedTask : r));
        if (viewingRequest?.id === updatedTask.id) setViewingRequest(updatedTask);
    });

    return () => { 
        socket.off("settings:sync");
        socket.off("notification:new"); 
        socket.off("chat:message");
        socket.off("task:sync"); 
    };
  }, [currentUser, showTeamChat, playSound, viewingRequest]);

  const handleUpdateTask = async (task: ProductionRequest) => {
      const saved = await api.saveTask(task);
      setRequests(prev => prev.find(r => r.id === saved.id) ? prev.map(r => r.id === saved.id ? saved : r) : [saved, ...prev]);
      getSocket().emit("task:update", saved);
      setActiveToast({ message: "تم تحديث المهمة بنجاح", type: "success" });
  };

  const handleSendMessage = (msg: ChatMessage) => {
      getSocket().emit("chat:message", msg);
      setMessages(prev => [...prev, msg].slice(-100));
  };

  const handleUpdateUser = async (u: User) => {
      const saved = await api.saveUser(u);
      setUsers(prev => prev.map(x => x.id === saved.id ? saved : x).concat(prev.find(x => x.id === saved.id) ? [] : [saved]));
      if (u.id === currentUser?.id) {
          setCurrentUser(saved);
          localStorage.setItem('b2u_user', JSON.stringify(saved));
      }
  };

  const handleUpdateClient = async (c: Client) => {
      const saved = await api.saveClient(c);
      setClients(prev => prev.map(x => x.id === saved.id ? saved : x).concat(prev.find(x => x.id === saved.id) ? [] : [saved]));
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/register" element={<RegisterPage appName={appSettings.appName} appLogo={appSettings.appLogo} />} />
          <Route path="*" element={<LoginPage users={users} appLogo={appSettings.appLogo} appName={appSettings.appName} appSettings={appSettings} onLogin={(u) => { setCurrentUser(u); setIsAuthenticated(true); localStorage.setItem('b2u_auth', 'true'); localStorage.setItem('b2u_user', JSON.stringify(u)); }} onForceSync={fetchData} loginConfig={{} as any} />} />
        </Routes>
      </HashRouter>
    );
  }

  const userPermissions = rolePermissions[currentUser.role] || INITIAL_PERMISSIONS[UserRole.CREATOR];

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-charcoal-950 text-white overflow-hidden font-sans" dir="rtl" onClick={unlockAudio}>
        <div className="hidden md:flex w-64 border-l border-white/5 bg-charcoal-950">
          <Sidebar 
            currentUser={currentUser} 
            onNavigate={setCurrentPage} 
            currentPage={currentPage} 
            appSettings={appSettings} 
            onLogout={() => { setIsAuthenticated(false); localStorage.clear(); window.location.reload(); }} 
            onProfileClick={() => setShowProfileModal(true)} 
            onToggleNotifications={() => setShowNotificationPanel(true)} 
            onToggleChat={() => setShowTeamChat(true)} 
            unreadNotificationsCount={notifications.filter(n => !n.isRead).length} 
            unreadMessagesCount={messages.filter(m => !m.read && m.senderId !== currentUser.id).length}
            onRefresh={fetchData} 
            isSyncing={isSyncing}
            userPermissions={userPermissions}
          />
        </div>

        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* ✅ زر فحص تحديثات - ثابت أعلى الصفحة */}
          <div className="sticky top-0 z-[5000] bg-charcoal-950/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-white/70">
              {appSettings.appName}
            </div>

            <button
              onClick={handleCheckUpdates}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
              title="Check for updates"
            >
              🔄 فحص تحديثات
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {currentPage === 'dashboard' && <Dashboard requests={requests} currentUser={currentUser} announcements={announcements} onNavigate={setCurrentPage} appLogo={appSettings.appLogo} />}
            {currentPage === 'mytasks' && <MyTasks requests={requests} currentUser={currentUser} onUpdateRequest={handleUpdateTask} onOpenRequest={setViewingRequest} onCreateRequest={() => setShowRequestDrawer(true)} clients={clients} />}
            {currentPage === 'calendar' && <CalendarView requests={requests} onOpenRequest={setViewingRequest} onCreateRequest={() => setShowRequestDrawer(true)} clients={clients} />}
            {currentPage === 'requests' && <RequestList requests={requests} clients={clients} users={users} currentUser={currentUser} onOpenRequest={setViewingRequest} onCreateRequest={() => setShowRequestDrawer(true)} onEditRequest={(req) => { setViewingRequest(req); }} onDeleteRequest={() => {}} onUpdateRequest={handleUpdateTask} userPermissions={userPermissions} />}
            {currentPage === 'clients' && <ClientList clients={clients} onAddClient={() => setShowClientDrawer(true)} onEditClient={(c) => { setViewingClient(c); setShowClientDrawer(true); }} onOpenClient={setViewingClient} onDeleteClient={() => {}} currentUser={currentUser} />}
            {currentPage === 'announcements' && <AnnouncementsPage currentUser={currentUser} announcements={announcements} onUpdateAnnouncements={(list) => { setAnnouncements(list); list[0] && api.saveAnnouncement(list[0]); }} />}
            {currentPage === 'finance' && <FinanceDashboard transactions={transactions} onAddTransaction={(t) => { api.saveTransaction(t); setTransactions([t, ...transactions]); }} onUpdateTransaction={(t) => { api.saveTransaction(t); setTransactions(transactions.map(x => x.id === t.id ? t : x)); }} onDeleteTransaction={(id) => { api.deleteTransaction(id); setTransactions(transactions.filter(x => x.id !== id)); }} clients={clients} users={users} requests={requests} />}
            {currentPage === 'team' && <TeamView users={users} currentUser={currentUser} onAddUser={() => setShowUserDrawer(true)} onUserClick={setViewingUser} onDeleteUser={() => {}} onUpdateUser={handleUpdateUser} />}
            {currentPage === 'settings' && <Settings settings={appSettings} onUpdate={setAppSettings} currentUser={currentUser} announcements={announcements} onUpdateAnnouncements={(list) => setAnnouncements(list)} rolePermissions={rolePermissions} onUpdatePermissions={setRolePermissions} clients={clients} users={users} requests={requests} />}
          </div>

          {activeToast && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[6000]">
                <Toast message={activeToast.message} type={activeToast.type} onClose={() => setActiveToast(null)} />
            </div>
          )}
        </main>

        <NotificationPanel 
          isOpen={showNotificationPanel} 
          onClose={() => setShowNotificationPanel(false)} 
          notifications={notifications} 
          onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))} 
          onClearAll={() => setNotifications([])} 
          onDeleteNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
          onNotificationClick={(n) => { setViewingRequest(requests.find(r => r.id === n.entityId) || null); setShowNotificationPanel(false); }} 
          clients={clients} requests={requests} users={users} 
        />

        <TeamChatPanel 
            isOpen={showTeamChat} 
            onClose={() => setShowTeamChat(false)} 
            currentUser={currentUser} 
            users={users} 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            onMarkRead={(ids) => setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, read: true } : m))} 
            requests={requests} 
            onOpenRequest={setViewingRequest} 
        />

        <NotificationPopup 
            notification={activePopupNotification} 
            onClose={() => setActivePopupNotification(null)} 
        />

        {viewingRequest && <RequestDetail request={viewingRequest} onClose={() => setViewingRequest(null)} currentUser={currentUser} onUpdate={handleUpdateTask} users={users} clients={clients} userPermissions={userPermissions} />}
        {viewingUser && <UserDetail user={viewingUser} currentUser={currentUser} onClose={() => setViewingUser(null)} onUpdate={handleUpdateUser} requests={requests} />}
        {viewingClient && !showClientDrawer && <ClientDetail client={viewingClient} requests={requests} onClose={() => setViewingClient(null)} onEdit={handleUpdateClient} onEditClick={() => setShowClientDrawer(true)} onDelete={() => {}} currentUserRole={currentUser.role} onOpenRequest={setViewingRequest} userPermissions={userPermissions} users={users} messages={messages} onSendMessage={handleSendMessage} />}
        
        {showRequestDrawer && <RequestDrawer isOpen={showRequestDrawer} onClose={() => setShowRequestDrawer(false)} onSave={handleUpdateTask} users={users} currentUser={currentUser} clients={clients} />}
        {showUserDrawer && <UserDrawer isOpen={showUserDrawer} onClose={() => setShowUserDrawer(false)} onSave={handleUpdateUser} currentUser={currentUser} />}
        {showClientDrawer && <ClientDrawer isOpen={showClientDrawer} onClose={() => setShowClientDrawer(false)} onSave={handleUpdateClient} client={viewingClient} existingUsers={users} />}
        {showProfileModal && <UserProfileModal user={currentUser} onClose={() => setShowProfileModal(false)} onSave={handleUpdateUser} />}
      </div>
    </HashRouter>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { User as UserType, UserRole, LoginConfig, AppSettings } from '../types';
import { Loader2, ShieldCheck, Lock, User as UserIcon, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { MOCK_USERS } from '../constants';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
  onForceSync: () => Promise<any>;
  users: UserType[];
  appLogo: string;
  appName: string;
  loginConfig: LoginConfig;
  appSettings?: AppSettings;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, appLogo, appName, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // استخلاص الإعدادات المخصصة من المدير العام
  const customHeadline = appSettings?.loginHeadline || appName;
  const customSubtext = appSettings?.loginSubtext || 'Professional Enterprise Flow';
  const customBg = appSettings?.loginBgColor || '#020617';
  const primaryColor = appSettings?.primaryColor || '#3b82f6';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const normalizedInputUser = username.trim().toLowerCase();
      const inputPassword = password.trim();

      let user = users.find(u => 
        u && u.username &&
        String(u.username).toLowerCase().trim() === normalizedInputUser && 
        String(u.password).trim() === inputPassword
      );

      if (!user) {
        user = MOCK_USERS.find(u => 
          u && u.username &&
          String(u.username).toLowerCase().trim() === normalizedInputUser && 
          String(u.password).trim() === inputPassword
        );
      }
      
      if (user) {
        if (user.isDeleted || user.status === 'Inactive') {
          setError('عذراً، هذا الحساب موقوف حالياً. يرجى مراجعة الإدارة.');
        } else {
          onLogin(user);
        }
      } else {
        setError('خطأ في اسم المستخدم أو كلمة المرور.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 text-right relative overflow-hidden pt-safe pb-safe transition-colors duration-1000"
      style={{ backgroundColor: customBg }}
    >
        {/* Ambient Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div 
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full opacity-20"
                style={{ backgroundColor: primaryColor }}
            ></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-fade-in flex-1 justify-center">
            <div className="w-24 h-24 md:w-28 md:h-28 mb-10 relative group">
                <div 
                  className="absolute inset-0 blur-2xl rounded-2xl transition-all duration-1000 animate-pulse"
                  style={{ backgroundColor: `${primaryColor}40` }}
                ></div>
                <img src={appLogo} className="w-full h-full object-contain relative z-10 drop-shadow-2xl" alt="Logo" />
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter text-center">{customHeadline}</h1>
            <p className="text-zinc-500 text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mb-12 opacity-60 text-center leading-relaxed">{customSubtext}</p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="relative group">
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 pointer-events-none group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      placeholder="اسم المستخدم" 
                      dir="ltr"
                      autoCapitalize="none"
                      autoComplete="username"
                      className="w-full p-4 pr-12 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:bg-white/[0.05] transition-all outline-none text-base placeholder:text-zinc-700 h-15 focus:border-primary/50" 
                    />
                </div>
                
                <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 pointer-events-none group-focus-within:text-primary transition-colors" />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="كلمة المرور" 
                      dir="ltr"
                      autoComplete="current-password"
                      className="w-full p-4 pr-12 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:bg-white/[0.05] transition-all outline-none text-base placeholder:text-zinc-700 h-15 focus:border-primary/50" 
                    />
                </div>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl animate-slide-up flex items-center gap-3">
                    <XCircle size={18} className="text-red-500" />
                    <p className="text-red-400 text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={loading} 
                  className="w-full p-4 rounded-2xl text-black font-black text-sm flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 h-15 mt-6"
                  style={{ backgroundColor: primaryColor }}
                >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin w-5 h-5" />
                        <span>جاري التحقق...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>دخول آمن للنظام</span>
                      </>
                    )}
                </button>
            </form>

            <div className="mt-16 flex items-center gap-2 opacity-20">
                <Sparkles size={12} className="text-white"/>
                <p className="text-[9px] font-black text-white uppercase tracking-[0.4em]">B2U PLUS SECURE OS V3.1</p>
            </div>
        </div>
    </div>
  );
};
export default LoginPage;
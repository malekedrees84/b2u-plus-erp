
import React, { useState, useEffect } from 'react';
import { User as UserType, UserRole, LoginConfig } from '../types';
import { Loader2, ShieldCheck, Lock, User as UserIcon, RefreshCw } from 'lucide-react';
import { MOCK_USERS } from '../constants'; // Import MOCK_USERS for fallback

interface LoginPageProps {
  onLogin: (user: UserType) => void;
  onForceSync: () => Promise<any>;
  users: UserType[];
  appLogo: string;
  appName: string;
  loginConfig: LoginConfig;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onForceSync, users, appLogo, appName }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 1. Local Data Check (Sync is disabled)
      const normalizedInputUser = username.trim().toLowerCase();
      const inputPassword = password.trim();

      // 2. Find user in props (Local State)
      let user = users.find(u => 
        u && u.username &&
        String(u.username).toLowerCase().trim() === normalizedInputUser && 
        String(u.password).trim() === inputPassword
      );

      // 3. Fallback to Constants if empty
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
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-charcoal-950 flex flex-col items-center justify-center p-6 text-right relative overflow-hidden pt-safe pb-safe">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-fade-in flex-1 justify-center">
            <div className="w-24 h-24 md:w-28 md:h-28 mb-8 relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur group-hover:bg-primary/30 transition-all duration-1000 animate-pulse"></div>
                <img src={appLogo} className="w-full h-full object-contain relative z-10 drop-shadow-2xl" alt="Logo" />
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{appName}</h1>
            <p className="text-zinc-500 text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mb-10 opacity-60">Professional Enterprise Flow</p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="relative">
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 pointer-events-none" />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      placeholder="اسم المستخدم" 
                      dir="ltr"
                      autoCapitalize="none"
                      autoComplete="username"
                      className="w-full p-4 pr-12 rounded-xl bg-charcoal-900 border border-white/5 text-white focus:border-primary/50 transition-all outline-none text-base placeholder:text-zinc-700 h-14" 
                    />
                </div>
                
                <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 pointer-events-none" />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="كلمة المرور" 
                      dir="ltr"
                      autoComplete="current-password"
                      className="w-full p-4 pr-12 rounded-xl bg-charcoal-900 border border-white/5 text-white focus:border-primary/50 transition-all outline-none text-base placeholder:text-zinc-700 h-14" 
                    />
                </div>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg animate-slide-up">
                    <p className="text-red-400 text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={loading} 
                  className="w-full p-4 rounded-xl bg-white text-black font-black text-sm flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-wait h-14 mt-4"
                >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin w-5 h-5" />
                        <span>جاري التحقق...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>تسجيل الدخول الآمن</span>
                      </>
                    )}
                </button>
            </form>

            <div className="mt-12 opacity-30 pb-4">
               <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">B2U PLUS SECURE ACCESS V2.5</p>
            </div>
        </div>
    </div>
  );
};
export default LoginPage;

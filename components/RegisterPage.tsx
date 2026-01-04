
import React, { useState } from 'react';
import { User as UserIcon, Lock, Mail, Phone, ShieldCheck, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface RegisterPageProps {
  appName: string;
  appLogo: string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ appName, appLogo }) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // التحقق من وجود مستخدم بنفس الاسم (بسيط)
      const existing = await api.listUsers();
      if (existing.find((u: any) => u.username === formData.username)) {
          throw new Error('اسم المستخدم محجوز مسبقاً، اختر اسماً آخر.');
      }

      const newUser: User = {
        id: `pending-${Date.now()}`,
        name: formData.name,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
        role: UserRole.CREATOR, // دور افتراضي سيعدله المدير عند القبول
        status: 'Pending',
        avatar: `https://ui-avatars.com/api/?name=${formData.name.replace(' ', '+')}&background=3b82f6&color=fff`,
        departments: [],
        isDeleted: false,
        lastUpdated: new Date().toISOString()
      };

      await api.saveUser(newUser);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الطلب، حاول لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-8 animate-bounce">
            <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">تم إرسال طلبك بنجاح!</h1>
        <p className="text-zinc-400 max-w-md leading-loose mb-10">
            شكراً لاهتمامك بالانضمام إلى <span className="text-primary font-bold">{appName}</span>. تم تسجيل بياناتك وهي الآن قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك فور الموافقة.
        </p>
        <button onClick={() => window.location.hash = '/'} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft size={18} /> العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-6 text-right">
        {/* Background Ambient */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg bg-charcoal-900/50 backdrop-blur-xl border border-white/5 p-8 md:p-12 rounded-[40px] shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center mb-10">
                <img src={appLogo} className="w-20 h-20 object-contain mb-6 drop-shadow-2xl" alt="logo" />
                <h1 className="text-2xl font-black text-white">طلب انضمام للفريق</h1>
                <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">New Member Registration</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase pr-2">الاسم بالكامل</label>
                        <div className="relative">
                            <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-white outline-none focus:border-primary transition-all text-sm" placeholder="أحمد محمد" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase pr-2">اسم المستخدم (Login ID)</label>
                        <div className="relative">
                            <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-charcoal-800 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-white outline-none focus:border-primary transition-all text-sm font-mono" placeholder="username" dir="ltr" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase pr-2">كلمة المرور</label>
                    <div className="relative">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-white outline-none focus:border-primary transition-all text-sm" placeholder="••••••••" dir="ltr" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase pr-2">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-white outline-none focus:border-primary transition-all text-sm" placeholder="mail@domain.com" dir="ltr" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase pr-2">رقم الهاتف (واتساب)</label>
                        <div className="relative">
                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-white outline-none focus:border-primary transition-all text-sm font-mono" placeholder="972..." dir="ltr" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs font-bold text-center animate-slide-up">
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'إرسال طلب الانضمام'}
                </button>
            </form>

            <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-[0.2em]">Secure Registration Panel</p>
        </div>
    </div>
  );
};

export default RegisterPage;

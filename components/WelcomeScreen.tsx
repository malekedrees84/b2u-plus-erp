
import React, { useEffect, useState } from 'react';
import { WelcomeConfig } from '../types';
import { aiService } from '../services/aiService';
import { Sparkles, Loader2, Quote } from 'lucide-react';

interface WelcomeScreenProps {
  userName: string;
  userRole?: string;
  onComplete: () => void;
  appLogo: string;
  appName: string;
  welcomeConfig: WelcomeConfig;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName, userRole, onComplete, appLogo, appName }) => {
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate AI greeting
    const fetchGreeting = async () => {
        const greeting = await aiService.getPersonalizedWelcome(userName, userRole || 'عضو');
        setAiGreeting(greeting);
        setLoading(false);
    };
    fetchGreeting();

    // مدة الانتظار قبل الدخول للنظام
    const timer = setTimeout(onComplete, 5000); 
    return () => clearTimeout(timer);
  }, [userName, userRole, onComplete]);

  return (
    <div className="fixed inset-0 bg-charcoal-950 flex flex-col items-center justify-center animate-fade-in z-[9999] overflow-hidden">
        {/* خلفية جمالية زرقاء */}
        <div className="absolute inset-0 w-full h-full">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-2xl px-6 text-center">
            
            {/* الشعار */}
            <div className="w-24 h-24 mb-8 p-4 glass rounded-3xl border border-white/10 shadow-2xl shadow-primary/20 animate-slide-up">
                <img src={appLogo} className="w-full h-full object-contain" alt="Logo" />
            </div>
            
            {/* الترحيب بالاسم */}
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 animate-slide-up" style={{animationDelay: '0.1s'}}>
                مرحباً، <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-primary">{userName}</span>
            </h1>

            {/* الدور الوظيفي */}
            <div className="mb-10 animate-slide-up" style={{animationDelay: '0.2s'}}>
                <span className="px-4 py-1.5 rounded-full bg-charcoal-800/80 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    {userRole}
                </span>
            </div>
            
            {/* جملة الذكاء الاصطناعي */}
            <div className="min-h-[100px] flex items-center justify-center animate-slide-up" style={{animationDelay: '0.3s'}}>
                {loading ? (
                    <div className="flex items-center gap-2 text-primary/50 text-sm">
                        <Loader2 className="animate-spin w-4 h-4" />
                        <span>جاري صياغة رسالتك اليومية...</span>
                    </div>
                ) : (
                    <div className="relative bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm max-w-lg mx-auto transform transition-all hover:scale-105 duration-500">
                        <Quote className="absolute -top-3 -right-3 text-primary w-6 h-6 fill-primary/20 rotate-180" />
                        <p className="text-lg md:text-xl font-medium text-blue-100 leading-relaxed font-sans">
                            {aiGreeting}
                        </p>
                        <div className="mt-4 flex justify-center items-center gap-2 text-[10px] text-primary/60 uppercase tracking-widest">
                            <Sparkles size={12} /> Powered by Gemini AI
                        </div>
                    </div>
                )}
            </div>

            {/* شريط التقدم */}
            <div className="mt-12 w-64 h-1 bg-charcoal-800 rounded-full overflow-hidden animate-fade-in" style={{animationDelay: '0.5s'}}>
                <div className="h-full bg-primary animate-[slideInRight_5s_ease-in-out_forwards] w-full origin-left"></div>
            </div>
            
            <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mt-4 opacity-50 font-bold">{appName} OS</p>
        </div>
    </div>
  );
};
export default WelcomeScreen;

import React, { useEffect, useState, useRef } from 'react';
import { AppNotification } from '../types';
import { X, Bell, ExternalLink, Sparkles, MessageSquare, Briefcase } from 'lucide-react';

interface NotificationPopupProps {
  notification: AppNotification | null;
  onClose: () => void;
  onAction?: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 500);
      }, 7000);
    } else {
      setIsVisible(false);
    }
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [notification, onClose]);

  if (!notification) return null;

  const isChat = notification.context === 'chat';
  const isRequest = notification.context === 'request';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100000] w-[340px] transition-all duration-500 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-charcoal-900/90 border border-primary/30 rounded-[28px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-start gap-4 relative overflow-hidden group">
        {/* Animated Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -translate-y-16 translate-x-16 group-hover:bg-primary/20 transition-all duration-700"></div>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border relative ${
            isChat ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 
            isRequest ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 
            'bg-primary/20 text-primary border-primary/20'
        }`}>
          {isChat ? <MessageSquare size={24} /> : isRequest ? <Briefcase size={24} /> : <Bell size={24} className="animate-bounce-slow" />}
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-charcoal-900 shadow-sm"></div>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-primary animate-pulse" />
            <h3 className="text-white font-black text-xs truncate uppercase tracking-tighter">
              {notification.title}
            </h3>
          </div>

          <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 font-medium">
            {notification.message}
          </p>

          <div className="mt-4 flex gap-3 justify-end">
            <button
              onClick={() => { setIsVisible(false); setTimeout(onClose, 500); }}
              className="text-zinc-500 hover:text-white text-[10px] font-bold transition-colors"
            >
              تجاهل
            </button>

            <button
              onClick={() => {
                onAction?.();
                setIsVisible(false);
                setTimeout(onClose, 500);
              }}
              className="bg-primary text-black text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              فتح التفاصيل <ExternalLink size={10} />
            </button>
          </div>
        </div>

        <button
          onClick={() => { setIsVisible(false); setTimeout(onClose, 500); }}
          className="text-zinc-700 hover:text-white transition-colors p-1.5 absolute top-3 left-3"
        >
          <X size={16} />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 right-0 left-0 h-1 bg-charcoal-800">
          <div className="h-full bg-primary animate-[progress_7s_linear_forwards] origin-right"></div>
        </div>
      </div>

      <style>{`
        @keyframes progress { from { width: 100%; } to { width: 0%; } }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>
    </div>
  );
};

export default NotificationPopup;
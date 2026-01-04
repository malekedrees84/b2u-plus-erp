import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { ToastType } from '../types';

interface ToastProps { message: any; type: ToastType; onClose: () => void; }

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: 'border-emerald-500/50 bg-emerald-950/90 text-emerald-200 shadow-emerald-500/20',
    error: 'border-red-500/50 bg-red-950/90 text-red-200 shadow-red-500/20',
    info: 'border-blue-500/50 bg-charcoal-800/90 text-blue-200 shadow-blue-500/20'
  };

  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl min-w-[320px] animate-slide-up pointer-events-auto group ${styles[type]}`}>
      <div className="shrink-0 p-1.5 bg-white/10 rounded-lg">
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold flex-1 leading-relaxed">
        {typeof message === 'string' ? message : String(message || "")}
      </p>
      <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white">
        <X size={16}/>
      </button>
    </div>
  );
};

export default Toast;
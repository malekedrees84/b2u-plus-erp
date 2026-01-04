
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, Save, Camera, Lock, Mail, Phone, User as UserIcon, Loader2, Upload } from 'lucide-react';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
      avatar: user.avatar
  });
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 300;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            setFormData({ ...formData, avatar: compressedDataUrl });
            setIsProcessingImage(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ ...user, ...formData });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-charcoal-900 w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-white font-black text-lg">تعديل ملفي الشخصي</h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-24 h-24 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {isProcessingImage ? (
                            <div className="w-full h-full rounded-full bg-charcoal-800 flex items-center justify-center border-4 border-charcoal-950"><Loader2 className="animate-spin text-primary"/></div>
                        ) : (
                            <img src={formData.avatar} className="w-full h-full rounded-full object-contain bg-black border-4 border-charcoal-950 shadow-xl group-hover:opacity-50 transition-opacity" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white drop-shadow-md" size={24}/>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary font-bold hover:underline">تغيير الصورة</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">الاسم</label>
                        <div className="relative">
                            <UserIcon className="absolute right-3 top-3 text-zinc-600" size={16}/>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-primary outline-none" required/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-3 text-zinc-600" size={16}/>
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-primary outline-none" required dir="ltr"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">رقم الهاتف</label>
                        <div className="relative">
                            <Phone className="absolute right-3 top-3 text-zinc-600" size={16}/>
                            <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-primary outline-none" dir="ltr" placeholder="05xxxxxxxx"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">كلمة المرور الجديدة</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-3 text-zinc-600" size={16}/>
                            <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-primary outline-none" placeholder="اتركه فارغاً للاحتفاظ بالحالية" dir="ltr"/>
                        </div>
                    </div>
                </div>
            </form>

            <div className="p-6 border-t border-white/5 bg-charcoal-950 flex gap-4">
                <button onClick={onClose} className="flex-1 py-3 text-zinc-500 font-bold hover:text-white transition-colors">إلغاء</button>
                <button onClick={handleSubmit} className="flex-1 bg-primary text-black py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-blue-400 transition-colors flex items-center justify-center gap-2">
                    <Save size={18}/> حفظ
                </button>
            </div>
        </div>
    </div>
  );
};

export default UserProfileModal;

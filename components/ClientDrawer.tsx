import React, { useState, useEffect, useRef } from 'react';
import {
  X, Save, Upload, HardDrive, RefreshCw, Loader2, CheckCircle2, Key, ShieldCheck,
  Copy, Link as LinkIcon, Image as ImageIcon, User, FileText
} from 'lucide-react';
import { Client, User as AppUser, UserRole } from '../types';

interface ClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  client?: Client | null;
  onCreateClientUser?: (user: AppUser) => void;
  existingUsers?: AppUser[];
}

const ClientDrawer: React.FC<ClientDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  client,
  onCreateClientUser,
  existingUsers = []
}) => {
  // Identity & Branding
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [logo, setLogo] = useState('');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contact Info
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Operational
  const [driveInputValue, setDriveInputValue] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [contractDate, setContractDate] = useState('');
  const [notes, setNotes] = useState('');

  // Access (Client Portal)
  const [createAccess, setCreateAccess] = useState(false);
  const [accessUsername, setAccessUsername] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [existingUser, setExistingUser] = useState<AppUser | null>(null);

  // ✅ API Base (Frontend -> Backend)
  const API_BASE =
    (import.meta as any)?.env?.VITE_API_URL || 'https://b2uprog.onrender.com';

  // ✅ Create user in DB (PostgreSQL) using Backend endpoint
  const apiCreateUser = async (userName: string) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to create user (${res.status})`);
    }
    return data;
  };

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setName(client.name);
        setIndustry(client.industry || '');
        setLogo(client.logo || '');
        setBrandColor(client.brandColor || '#3b82f6');
        setContactPerson(client.contactPerson || '');
        setEmail(client.email || '');
        setPhone(client.phone || '');
        setDriveInputValue(client.driveFolderId || '');
        setStatus(client.status || 'Active');
        setContractDate(
          client.contractDate ? client.contractDate.split('T')[0] : new Date().toISOString().split('T')[0]
        );
        setNotes(client.notes || '');

        // Check for existing user
        const foundUser = existingUsers.find(u => u.linkedClientId === client.id && !u.isDeleted);
        if (foundUser) {
          setExistingUser(foundUser);
          setAccessUsername(foundUser.username || '');
          setAccessPassword(''); // Don't show existing password
          setCreateAccess(true);
        } else {
          setExistingUser(null);
          setAccessUsername('');
          setAccessPassword('');
          setCreateAccess(false);
        }
      } else {
        // New Client Defaults
        setName('');
        setIndustry('');
        setLogo('');
        setBrandColor('#3b82f6');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setDriveInputValue('');
        setStatus('Active');
        setContractDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setCreateAccess(false);
        setAccessUsername('');
        setAccessPassword('');
        setExistingUser(null);
      }
    }
  }, [isOpen, client, existingUsers]);

  const generateRandomLogo = () => {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    setLogo(`https://ui-avatars.com/api/?name=${name || 'Client'}&background=${randomColor}&color=fff&size=200`);
  };

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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setLogo(compressedDataUrl);
          setIsProcessingImage(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const copyCredentials = () => {
    const text = `
بيانات الدخول لنظام إدارة المشاريع:
رابط النظام: ${window.location.href}
اسم المستخدم: ${accessUsername}
كلمة المرور: ${accessPassword || '(نفس كلمة المرور السابقة)'}
    `;
    navigator.clipboard.writeText(text);
    alert('تم نسخ بيانات الدخول! يمكنك إرسالها للعميل الآن.');
  };

  const extractDriveId = (input: string) => {
    if (input.includes('drive.google.com')) {
      const parts = input.split('/');
      const folderIndex = parts.indexOf('folders');
      if (folderIndex !== -1 && parts[folderIndex + 1]) {
        return parts[folderIndex + 1].split('?')[0];
      }
    }
    return input;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-charcoal-900 h-full shadow-2xl border-r border-charcoal-800 flex flex-col animate-slide-in-right overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-charcoal-800 bg-charcoal-950 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-white font-black text-xl">{client ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">التحكم الكامل في الهوية والملفات</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-charcoal-900">

          {/* 1. Branding Section */}
          <section className="space-y-4">
            <h3 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <ImageIcon size={14} /> الهوية البصرية (Branding)
            </h3>

            <div className="flex items-start gap-6">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-charcoal-600 bg-charcoal-800 flex items-center justify-center overflow-hidden relative">
                  {isProcessingImage ? (
                    <Loader2 className="animate-spin text-primary" />
                  ) : logo ? (
                    <img src={logo} alt="Logo Preview" className="w-full h-full object-contain bg-black/20" />
                  ) : (
                    <ImageIcon className="text-zinc-600" size={32} />
                  )}

                  <div
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} className="text-white mb-1" />
                    <span className="text-[8px] text-zinc-300 font-bold uppercase">تغيير الصورة</span>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>

                <button
                  onClick={generateRandomLogo}
                  title="توليد شعار تلقائي"
                  className="absolute -bottom-2 -right-2 p-1.5 bg-primary text-black rounded-lg shadow-lg hover:scale-110 transition-transform z-10"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">صورة العميل / الشعار</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload size={14} /> رفع صورة من الجهاز
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">لون الهوية (Brand Color)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="w-10 h-9 rounded bg-transparent border border-charcoal-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="flex-1 bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-primary uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2">اسم العميل / الشركة</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2">مجال العمل</label>
                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="تسويق، عقارات..."
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none"
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-white/5 w-full"></div>

          {/* 3. Client Portal Access */}
          <section className={`space-y-4 rounded-3xl border transition-all duration-300 ${createAccess ? 'bg-primary/5 border-primary/20 p-6' : 'bg-charcoal-950 border-white/5 p-5'}`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-[12px] font-black uppercase tracking-widest flex items-center gap-2 ${createAccess ? 'text-primary' : 'text-zinc-400'}`}>
                  <ShieldCheck size={16} /> تفعيل بوابة العميل (Client Portal)
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">إنشاء حساب خاص للعميل لمتابعة المشاريع.</p>
              </div>

              <div
                className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${createAccess ? 'bg-primary' : 'bg-charcoal-700'}`}
                onClick={() => setCreateAccess(!createAccess)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${createAccess ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>

            {createAccess && (
              <div className="animate-fade-in space-y-5 pt-2">
                {existingUser && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <div>
                      <p className="text-emerald-500 text-xs font-bold">هذا العميل لديه حساب مفعل بالفعل.</p>
                      <p className="text-emerald-500/70 text-[10px]">تعديل الحقول أدناه سيحدث بيانات الدخول.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2">اسم المستخدم (User)</label>
                    <input
                      type="text"
                      value={accessUsername}
                      onChange={e => setAccessUsername(e.target.value)}
                      className="w-full bg-charcoal-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                      dir="ltr"
                      placeholder="company_user"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2">كلمة المرور {existingUser ? '(للتغيير فقط)' : ''}</label>
                    <div className="relative">
                      <Key className="absolute right-3 top-3 text-zinc-600" size={16} />
                      <input
                        type="text"
                        value={accessPassword}
                        onChange={e => setAccessPassword(e.target.value)}
                        className="w-full bg-charcoal-800 border border-white/5 rounded-xl pr-10 pl-4 py-3 text-white focus:border-primary outline-none"
                        dir="ltr"
                        placeholder={existingUser ? '••••••••' : 'كلمة مرور قوية'}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="text-[10px] text-zinc-400">
                    <span className="block font-bold text-white mb-1">رابط النظام للعميل:</span>
                    <span className="font-mono bg-white/5 px-2 py-1 rounded select-all">
                      {window.location.origin + window.location.pathname}
                    </span>
                  </div>
                  <button
                    onClick={copyCredentials}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-black rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <Copy size={14} /> نسخ البيانات
                  </button>
                </div>

                {/* ✅ Show API base for debugging (optional) */}
                <div className="text-[10px] text-zinc-500">
                  API: <span className="font-mono text-zinc-300">{API_BASE}</span>
                </div>
              </div>
            )}
          </section>

          <div className="h-px bg-white/5 w-full"></div>

          {/* 4. Contact & Info */}
          <section className="space-y-4">
            <h3 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <User size={14} /> تفاصيل إضافية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-zinc-500 mb-2">الشخص المسؤول</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white text-xs focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white text-xs focus:border-primary outline-none"
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-white/5 w-full"></div>

          {/* 5. System & Drive */}
          <section className="space-y-4">
            <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <HardDrive size={14} /> ربط الملفات
            </h3>

            <div className="bg-charcoal-950 p-5 rounded-xl border border-white/5 space-y-4">
              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 flex items-center gap-2">
                  <LinkIcon size={14} /> رابط مجلد جوجل درايف (Drive Link)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={driveInputValue}
                    onChange={e => setDriveInputValue(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white text-xs font-mono focus:border-primary outline-none"
                  />

                  {driveInputValue.includes('drive.google.com') && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1 text-[10px] font-bold">
                      <CheckCircle2 size={12} /> تم التعرف
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2">حالة الحساب</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className={`w-full appearance-none border rounded-lg px-4 py-3 text-xs font-bold focus:outline-none transition-all ${status === 'Active'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                      : 'bg-red-500/10 border-red-500/50 text-red-500'
                      }`}
                  >
                    <option value="Active" className="bg-charcoal-800 text-white">نشط (Active)</option>
                    <option value="Inactive" className="bg-charcoal-800 text-white">غير نشط (Archived)</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2">تاريخ التعاقد</label>
                  <input
                    type="date"
                    value={contractDate}
                    onChange={e => setContractDate(e.target.value)}
                    className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-xs focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 6. Notes */}
          <section className="space-y-4">
            <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <FileText size={14} /> ملاحظات إدارية
            </h3>
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات خاصة بالعميل هنا..."
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none resize-none"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-charcoal-800 bg-charcoal-950 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-zinc-500 font-bold text-sm hover:text-white transition-colors">
            إلغاء
          </button>

          <button
            onClick={async () => {
              const finalDriveId = extractDriveId(driveInputValue);
              const clientId = client?.id || `c-${Date.now()}`;

              // ✅ save client in app state
              onSave({
                id: clientId,
                name,
                industry,
                status,
                logo: logo || `https://ui-avatars.com/api/?name=${name}`,
                brandColor,
                email,
                phone,
                contactPerson,
                contractDate: new Date(contractDate).toISOString(),
                driveFolderId: finalDriveId,
                notes
              });

              // ✅ Create or Update linked user in app state
              if (createAccess && onCreateClientUser && accessUsername) {
                const userId = existingUser ? existingUser.id : `u-client-${clientId}`;
                const finalPassword = accessPassword || (existingUser ? existingUser.password : '123456');

                onCreateClientUser({
                  id: userId,
                  name: name,
                  username: accessUsername,
                  password: finalPassword as string,
                  role: UserRole.CLIENT,
                  linkedClientId: clientId,
                  status: 'Active',
                  avatar: logo || `https://ui-avatars.com/api/?name=${name}`,
                  email: email,
                  roles: [UserRole.CLIENT],
                  departments: ['External'],
                  isDeleted: false,
                  lastUpdated: new Date().toISOString()
                });
              }

              // ✅ SAVE TO DATABASE (PostgreSQL)
              try {
                if (createAccess && accessUsername) {
                  // endpoint /users currently saves just a "name"
                  await apiCreateUser((name || accessUsername).trim());
                }
              } catch (e) {
                alert('صار خطأ بحفظ المستخدم بالداتا بيس: ' + (e instanceof Error ? e.message : String(e)));
                // إذا بدك تمنع الإغلاق عند الفشل: فك التعليق عن السطر الجاي
                // return;
              }

              onClose();
            }}
            className="bg-primary text-black py-3 px-8 rounded-xl font-black text-sm hover:bg-blue-400 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Save size={18} /> حفظ البيانات
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClientDrawer;
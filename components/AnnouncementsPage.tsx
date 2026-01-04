
import React, { useState, useRef, useEffect } from 'react';
import { Announcement, AnnouncementSlide, User, UserRole } from '../types';
import { Megaphone, Plus, Image as ImageIcon, X, Loader2, Save, MoveHorizontal, Layout, Check, Trash2, Monitor, AlertCircle, Images, ChevronRight, ChevronLeft, Pause, Play, Edit3, Archive, Layers, ShieldAlert } from 'lucide-react';

interface AnnouncementsPageProps {
  currentUser: User;
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
}

// Helper component for previewing slideshow INSIDE an ad
const BannerPreview: React.FC<{ slides: AnnouncementSlide[], textColor?: string }> = ({ slides, textColor }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (slides.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 4000); 
        return () => clearInterval(interval);
    }, [slides.length]);

    return (
        <div className="absolute inset-0 w-full h-full">
            {slides.map((slide, idx) => (
                <div key={slide.id} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <img
                        src={slide.image}
                        className={`absolute inset-0 w-full h-full object-cover opacity-60 ${idx === currentIndex ? 'scale-105' : 'scale-100'} transition-transform duration-[6000ms]`}
                        alt="banner slide"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-8 md:p-12 flex flex-col justify-end">
                        <h3 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-lg" style={{ color: textColor }}>{slide.title}</h3>
                        <p className="text-lg text-white/80 font-medium line-clamp-2 max-w-2xl drop-shadow-md" style={{ color: textColor ? `${textColor}cc` : undefined }}>{slide.content}</p>
                    </div>
                </div>
            ))}
            
            {/* Dots */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {slides.map((_, idx) => (
                        <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/30'}`}></div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({ currentUser, announcements, onUpdateAnnouncements }) => {
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Carousel State
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Permission Check: 'malek' or any ADMIN can manage announcements
  const isManager = currentUser.username === 'malek' || currentUser.role === UserRole.ADMIN;

  // Form State
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    type: 'hero',
    isActive: true,
    backgroundColor: '#1e293b',
    textColor: '#ffffff',
    isScrolling: false,
    slides: [] 
  });

  // Slide input state
  const [currentSlide, setCurrentSlide] = useState<{image: string, title: string, content: string}>({
      image: '',
      title: '',
      content: ''
  });

  const safeAnnouncements = announcements.filter(a => a && a.id);
  const activeAnnouncements = safeAnnouncements.filter(a => a.isActive);
  const inactiveAnnouncements = safeAnnouncements.filter(a => !a.isActive);

  // Auto-rotate logic
  useEffect(() => {
      if (activeAnnouncements.length <= 1 || isPaused) return;
      const timer = setInterval(() => {
          setActiveSlideIndex(prev => (prev + 1) % activeAnnouncements.length);
      }, 8000); 
      return () => clearInterval(timer);
  }, [activeAnnouncements.length, isPaused]);

  useEffect(() => {
      if (activeSlideIndex >= activeAnnouncements.length && activeAnnouncements.length > 0) {
          setActiveSlideIndex(0);
      }
  }, [activeAnnouncements.length, activeSlideIndex]);

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
            // AGGRESSIVE OPTIMIZATION v2: 
            // Max width 450px and Quality 0.4 to prevent Google Apps Script Payload errors
            const MAX_WIDTH = 450; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4); 
            
            setCurrentSlide(prev => ({ ...prev, image: compressedDataUrl }));
            setIsProcessingImage(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const addSlide = () => {
      if (!currentSlide.image) {
          alert('يرجى اختيار صورة للشريحة');
          return;
      }
      
      // Limit slides to avoid payload overflow
      if ((formData.slides || []).length >= 5) {
          alert('الحد الأقصى للشرائح هو 5 لضمان سرعة النظام.');
          return;
      }

      const newSlide: AnnouncementSlide = {
          id: Date.now().toString(),
          image: currentSlide.image,
          title: currentSlide.title || formData.title || 'عنوان',
          content: currentSlide.content || formData.content || 'تفاصيل'
      };

      setFormData(prev => ({
          ...prev,
          slides: [...(prev.slides || []), newSlide]
      }));

      setCurrentSlide({ image: '', title: '', content: '' });
  };

  const removeSlide = (id: string) => {
      setFormData(prev => ({
          ...prev,
          slides: (prev.slides || []).filter(s => s.id !== id)
      }));
  };

  const handleSubmit = () => {
      const finalType = formData.isScrolling ? 'scrolling' : 'hero';
      let finalSlides = formData.slides || [];
      
      const newAnnouncement: Announcement = {
          id: formData.id || Date.now().toString(),
          title: formData.title || (finalSlides[0]?.title || 'بدون عنوان'),
          content: formData.content || (finalSlides[0]?.content || '...'),
          type: finalType,
          isActive: formData.isActive ?? true,
          // CRITICAL: Always update date on save to force Cloud Sync overwrite
          date: new Date().toISOString(),
          authorId: currentUser.id,
          imageUrl: finalSlides.length > 0 ? finalSlides[0].image : '',
          images: finalSlides.map(s => s.image),
          slides: finalSlides,
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          isScrolling: formData.isScrolling
      };

      if (!newAnnouncement.isScrolling && newAnnouncement.slides?.length === 0) {
          alert("يرجى إضافة شريحة واحدة على الأقل للإعلانات المصورة");
          return;
      }

      const exists = safeAnnouncements.find(a => a.id === newAnnouncement.id);
      if (exists) {
          // Replace existing
          onUpdateAnnouncements(safeAnnouncements.map(a => a.id === newAnnouncement.id ? newAnnouncement : a));
      } else {
          // Add new
          onUpdateAnnouncements([newAnnouncement, ...safeAnnouncements]);
      }

      setShowForm(false);
      resetForm();
  };

  const resetForm = () => {
      setFormData({
        id: undefined,
        title: '',
        content: '',
        type: 'hero',
        isActive: true,
        backgroundColor: '#1e293b',
        textColor: '#ffffff',
        isScrolling: false,
        slides: []
      });
      setCurrentSlide({ image: '', title: '', content: '' });
  };

  const handleEdit = (announcement: Announcement) => {
      if (!isManager) return;
      let slides = announcement.slides || [];
      // Legacy compatibility
      if (slides.length === 0 && announcement.imageUrl) {
          slides.push({
              id: '1',
              image: announcement.imageUrl,
              title: announcement.title,
              content: announcement.content
          });
      } else if (slides.length === 0 && announcement.images && announcement.images.length > 0) {
          slides = announcement.images.map((img, idx) => ({
              id: idx.toString(),
              image: img,
              title: announcement.title,
              content: announcement.content
          }));
      }

      setFormData({
          ...announcement,
          slides
      });
      setShowForm(true);
  };

  const handleDelete = (id: string) => {
      if (!isManager) return;
      if (confirm("هل أنت متأكد من حذف هذا الإعلان؟ سيختفي عند الجميع.")) {
          // Send update with removed item
          onUpdateAnnouncements(safeAnnouncements.filter(a => a.id !== id));
      }
  };

  const handleToggle = (id: string) => {
      if (!isManager) return;
      // CRITICAL: Update 'date' field to current time so Smart Merge knows this is the newest version
      const now = new Date().toISOString();
      onUpdateAnnouncements(safeAnnouncements.map(a => a.id === id ? { ...a, isActive: !a.isActive, date: now } : a));
  };

  const nextSlide = () => setActiveSlideIndex(prev => (prev + 1) % activeAnnouncements.length);
  const prevSlide = () => setActiveSlideIndex(prev => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in bg-charcoal-950 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
            <div>
                <h2 className="text-3xl black-header text-white flex items-center gap-3">
                    <Megaphone className="text-primary" size={32}/> لوحة الإعلانات
                </h2>
                <p className="text-zinc-500 text-sm">نشر البانرات بنظام الشرائح المتعددة.</p>
            </div>
            {isManager && !showForm && (
                <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-black px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                    <Plus size={18}/> إعلان جديد
                </button>
            )}
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-hidden min-h-0">
            
            {/* Form Section (Sidebar) - Only visible to Manager */}
            {isManager && showForm && (
                <div className="w-full md:w-1/3 bg-charcoal-900 border border-white/5 rounded-[30px] p-6 flex flex-col overflow-y-auto custom-scrollbar animate-slide-in-right h-full">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h3 className="text-white font-bold">{formData.id ? 'تعديل الإعلان' : 'إنشاء إعلان جديد'}</h3>
                        <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                    </div>

                    <div className="space-y-6 flex-1">
                        
                        {/* Global Settings */}
                        <div className="space-y-3 p-4 bg-charcoal-800 rounded-2xl border border-white/5">
                            <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Layout size={14}/> إعدادات عامة</h4>
                            <div className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.isScrolling ? 'bg-primary/10 border-primary/30' : 'bg-charcoal-900 border-white/5'}`} onClick={() => setFormData({...formData, isScrolling: !formData.isScrolling})}>
                                <div className="flex items-center gap-2">
                                    <MoveHorizontal size={16} className={formData.isScrolling ? "text-primary" : "text-zinc-500"}/>
                                    <div>
                                        <div className={`text-xs font-bold ${formData.isScrolling ? "text-white" : "text-zinc-400"}`}>شريط إخباري فقط</div>
                                    </div>
                                </div>
                                {formData.isScrolling && <Check size={14} className="text-primary"/>}
                            </div>
                            
                            {!formData.isScrolling && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 block mb-1">الخلفية</label>
                                        <div className="flex items-center gap-2 bg-charcoal-900 p-2 rounded-lg border border-white/5">
                                            <input type="color" value={formData.backgroundColor} onChange={e => setFormData({...formData, backgroundColor: e.target.value})} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"/>
                                            <span className="text-[10px] text-zinc-400 font-mono">{formData.backgroundColor}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 block mb-1">النص</label>
                                        <div className="flex items-center gap-2 bg-charcoal-900 p-2 rounded-lg border border-white/5">
                                            <input type="color" value={formData.textColor} onChange={e => setFormData({...formData, textColor: e.target.value})} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"/>
                                            <span className="text-[10px] text-zinc-400 font-mono">{formData.textColor}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Scrolling specific input */}
                        {formData.isScrolling ? (
                            <div className="space-y-3">
                                <label className="text-xs text-zinc-500 font-bold block">محتوى الشريط</label>
                                <textarea rows={3} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value, title: 'شريط عاجل'})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none focus:border-primary" placeholder="اكتب الخبر العاجل هنا..."/>
                            </div>
                        ) : (
                            /* Slides Builder */
                            <div className="space-y-4">
                                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> إدارة الشرائح (Slides)</h4>
                                
                                {/* New Slide Input */}
                                <div className="p-4 bg-charcoal-800 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                                    
                                    {/* Image Selector */}
                                    <div onClick={() => fileInputRef.current?.click()} className="h-32 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors relative overflow-hidden group">
                                        {currentSlide.image ? (
                                            <img src={currentSlide.image} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center text-zinc-500 group-hover:text-primary">
                                                {isProcessingImage ? <Loader2 className="animate-spin mb-2"/> : <Images size={24} className="mb-2 mx-auto"/>}
                                                <span className="text-[10px] font-bold">اضغط لإضافة صورة</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">تغيير الصورة</div>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                                    <input type="text" value={currentSlide.title} onChange={e => setCurrentSlide({...currentSlide, title: e.target.value})} className="w-full bg-charcoal-900 border border-white/5 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary" placeholder="عنوان الشريحة (اختياري)"/>
                                    <textarea rows={2} value={currentSlide.content} onChange={e => setCurrentSlide({...currentSlide, content: e.target.value})} className="w-full bg-charcoal-900 border border-white/5 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary" placeholder="نص الشريحة (اختياري)"/>
                                    
                                    <button onClick={addSlide} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                        <Plus size={14}/> إدراج الشريحة
                                    </button>
                                </div>

                                {/* Slides List */}
                                <div className="space-y-2">
                                    {(formData.slides || []).map((slide, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-charcoal-800 rounded-xl border border-white/5 group">
                                            <img src={slide.image} className="w-12 h-12 rounded-lg object-cover bg-black" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white text-xs font-bold truncate">{slide.title || 'بدون عنوان'}</div>
                                                <div className="text-zinc-500 text-[10px] truncate">{slide.content}</div>
                                            </div>
                                            <button onClick={() => removeSlide(slide.id)} className="p-2 text-zinc-500 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {(formData.slides || []).length === 0 && (
                                        <div className="text-center py-4 text-zinc-600 text-xs italic">لم يتم إضافة شرائح بعد</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                        <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-zinc-500 font-bold text-xs hover:text-white">إلغاء</button>
                        <button onClick={handleSubmit} className="flex-[2] bg-primary text-black py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg">
                            <Save size={16}/> {formData.id ? 'حفظ ونشر التعديلات' : 'نشر الإعلان'}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Display Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-20">
                
                {/* 1. Active Ads Carousel */}
                {activeAnnouncements.length > 0 ? (
                    <div className="relative group rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-charcoal-900 aspect-video md:aspect-[21/9] transition-all">
                        {/* The Current Active Item */}
                        {(() => {
                            const item = activeAnnouncements[activeSlideIndex];
                            
                            // Prevent crash if item is undefined
                            if (!item) return <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500"/></div>;

                            const hasSlides = item.slides && item.slides.length > 0;
                            
                            return (
                                <div className="absolute inset-0 flex flex-col h-full">
                                    {/* Ad Content */}
                                    <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: item.backgroundColor }}>
                                        {hasSlides ? (
                                            <BannerPreview slides={item.slides!} textColor={item.textColor} />
                                        ) : (
                                            <>
                                                {/* Fallback for legacy ads */}
                                                {item.imageUrl && (
                                                    <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="banner"/>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-8 md:p-12 flex flex-col justify-end">
                                                    {item.isScrolling && <span className="inline-block w-fit bg-primary text-black text-[10px] font-black px-2 py-1 rounded mb-2">شريط عاجل</span>}
                                                    <h3 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-lg" style={{ color: item.textColor }}>{item.title}</h3>
                                                    <p className="text-lg text-white/80 font-medium line-clamp-2 max-w-2xl drop-shadow-md" style={{ color: item.textColor ? `${item.textColor}cc` : undefined }}>{item.content}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Controls Bar - Only visible to Manager */}
                                    {isManager && (
                                        <div className="h-16 bg-charcoal-950/90 backdrop-blur border-t border-white/5 flex items-center justify-between px-6 shrink-0 relative z-30">
                                            <div className="flex items-center gap-4">
                                                <div className="flex gap-1">
                                                    {activeAnnouncements.map((_, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeSlideIndex ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`}
                                                        ></div>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-zinc-500 font-mono">
                                                    {activeSlideIndex + 1} / {activeAnnouncements.length}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setIsPaused(!isPaused)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white" title={isPaused ? "تشغيل" : "إيقاف مؤقت"}>
                                                    {isPaused ? <Play size={18} fill="currentColor"/> : <Pause size={18} fill="currentColor"/>}
                                                </button>
                                                
                                                <div className="w-px h-6 bg-white/10 mx-2"></div>

                                                <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                                    <Edit3 size={16}/> تعديل
                                                </button>
                                                <button onClick={() => handleToggle(item.id)} className="p-2 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold" title="إيقاف العرض">
                                                    <Monitor size={16}/> إيقاف
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors" title="حذف">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Navigation Arrows */}
                        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-primary text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-30"><ChevronRight size={24}/></button>
                        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-primary text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-30"><ChevronLeft size={24}/></button>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-700 border-4 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                        <Megaphone size={64} className="mb-6 opacity-20"/>
                        <h3 className="text-xl font-bold text-white mb-2">لا توجد إعلانات نشطة</h3>
                        {isManager && <p className="text-sm">اضغط على "إعلان جديد" للبدء.</p>}
                    </div>
                )}

                {/* 2. Inactive / Archived Ads List */}
                {inactiveAnnouncements.length > 0 && isManager && (
                    <div className="pt-8 border-t border-white/5">
                        <h3 className="text-zinc-500 font-bold text-sm mb-4 flex items-center gap-2"><Archive size={16}/> الإعلانات المتوقفة (الأرشيف)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveAnnouncements.map(item => {
                                const hasSlides = item.slides && item.slides.length > 0;
                                const firstImage = hasSlides ? item.slides![0].image : (item.imageUrl || (item.images && item.images[0]));
                                const displayTitle = hasSlides ? item.slides![0].title : item.title;

                                return (
                                    <div key={item.id} className="bg-charcoal-900 border border-white/5 rounded-2xl p-4 flex gap-4 items-center opacity-60 hover:opacity-100 transition-all group">
                                        <div className="w-16 h-16 rounded-xl bg-charcoal-800 shrink-0 overflow-hidden relative">
                                            {firstImage ? (
                                                <img src={firstImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><Layout size={20}/></div>
                                            )}
                                            {hasSlides && item.slides!.length > 1 && (
                                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-lg font-bold">
                                                    +{item.slides!.length - 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold text-sm truncate mb-1">{displayTitle}</h4>
                                            <p className="text-zinc-500 text-xs truncate">{hasSlides ? 'عرض شرائح متعدد' : item.content}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => handleToggle(item.id)} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500 hover:text-black transition-colors" title="تنشيط"><Check size={14}/></button>
                                            <button onClick={() => handleEdit(item)} className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors" title="تعديل"><Edit3 size={14}/></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="حذف"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* 3. Restricted Message for non-Manager */}
                {!isManager && (
                    <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
                        <ShieldAlert size={20} className="text-primary"/>
                        <p className="text-zinc-400 text-xs">إدارة الإعلانات مقيدة بصلاحيات خاصة. للإضافة أو التعديل يرجى التواصل مع المسؤول.</p>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default AnnouncementsPage;


import React, { useState } from 'react';
import { ProductionRequest, RequestStatus, Client } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Filter, Plus, Power, AlertCircle } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface CalendarViewProps {
  requests: ProductionRequest[];
  onOpenRequest: (req: ProductionRequest) => void;
  onCreateRequest: () => void;
  clients?: Client[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ requests, onOpenRequest, onCreateRequest, clients = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const getTasksForDay = (day: number) => {
    return requests.filter(req => {
      if (!req) return false;
      // Hide inactive tasks from calendar
      if (req.isActive === false) return false;

      const taskDate = new Date(req.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === month &&
        taskDate.getFullYear() === year &&
        req.status !== RequestStatus.ARCHIVED
      );
    });
  };

  const getClientLogo = (clientName: string) => {
      const client = clients.find(c => c && c.name === clientName);
      return client?.logo || `https://ui-avatars.com/api/?name=${clientName}&background=334155&color=fff`;
  };

  const days = [];
  // Add empty slots for days before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-32 md:h-40 bg-charcoal-900/30 border border-white/5 opacity-50"></div>);
  }

  // Add actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dayTasks = getTasksForDay(d);
    const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;

    days.push(
      <div key={d} className={`h-32 md:h-40 bg-charcoal-900 border border-white/5 p-2 overflow-y-auto custom-scrollbar relative group transition-colors hover:bg-charcoal-800 ${isToday ? 'bg-primary/5 border-primary/30' : ''}`}>
        <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-black' : 'text-zinc-400 group-hover:text-white'}`}>{d}</span>
            {dayTasks.length > 0 && <span className="text-[10px] text-zinc-500 bg-black/20 px-1.5 py-0.5 rounded">{dayTasks.length}</span>}
        </div>
        
        <div className="space-y-1.5">
            {dayTasks.map(task => {
                const isActive = task.isActive !== false;
                return (
                    <div 
                        key={task.id}
                        onClick={() => onOpenRequest(task)}
                        className={`p-1.5 rounded-lg border cursor-pointer hover:scale-[1.02] transition-transform shadow-sm flex items-start gap-2 ${STATUS_COLORS[task.status]}`}
                    >
                        <img src={getClientLogo(task.client)} className="w-5 h-5 rounded-md object-cover flex-shrink-0 bg-white/10" alt="logo" />
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center">
                                <div className={`text-[10px] font-bold truncate`}>{task.title}</div>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[8px] opacity-70 truncate max-w-[60px]">{task.client}</span>
                                {task.priority === 'High' && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in bg-charcoal-950 overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <CalendarIcon size={24} />
              </div>
              <div>
                  <h2 className="text-2xl md:text-3xl black-header text-white">التقويم</h2>
                  <p className="text-zinc-500 text-sm font-medium">جدول المهام والمواعيد النهائية</p>
              </div>
          </div>

          <div className="flex items-center gap-3 bg-charcoal-900 p-1.5 rounded-2xl border border-white/5">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"><ChevronRight size={20}/></button>
              <div className="px-4 text-center min-w-[140px]">
                  <h3 className="text-lg font-black text-white">{monthNames[month]} <span className="text-primary">{year}</span></h3>
              </div>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"><ChevronLeft size={20}/></button>
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <button onClick={handleToday} className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all">اليوم</button>
          </div>

          <button onClick={onCreateRequest} className="bg-primary text-black px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20">
              <Plus size={16} /> إضافة مهمة
          </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-px mb-2 text-center bg-charcoal-900 rounded-xl border border-white/5 p-2">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
              <div key={d} className="text-zinc-500 text-xs font-bold uppercase tracking-wider py-2">{d}</div>
          ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-1 md:gap-2 pb-20">
              {days}
          </div>
      </div>
    </div>
  );
};

export default CalendarView;


import React, { useState, useMemo, useRef } from 'react';
import { Transaction, User, Client, ProductionRequest, TransactionType, PaymentStatus, PaymentMethod } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Users, FileText, Plus, Search, Filter, Briefcase, Download, ArrowUpRight, ArrowDownLeft, Wallet, PieChart, Calculator, Clock, Upload, Paperclip, X, Check, Calendar, Eye } from 'lucide-react';

interface FinanceDashboardProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  clients: Client[];
  users: User[];
  requests: ProductionRequest[];
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction, clients, users, requests }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payroll' | 'invoices'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Transaction | null>(null); // State for Viewing Invoice Details
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Invoice Form State
  const [newInvoice, setNewInvoice] = useState({
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      description: '',
      amount: 0,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
  });

  // --- Statistics ---
  const totalIncome = transactions.filter(t => t.type === 'Income' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const pendingIncome = transactions.filter(t => t.type === 'Income' && t.status === 'Pending').reduce((sum, t) => sum + t.amount, 0);

  // --- Filtered List ---
  const filteredTransactions = transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || t.type === filterType;
      return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Invoices List (Transactions categorized as Invoice) ---
  const invoicesList = transactions.filter(t => t.category === 'Invoice' || t.description.startsWith('فاتورة #'));

  // --- Payroll Calculation (Smart) ---
  const payrollData = useMemo(() => {
      return users.map(u => {
          const userRequests = requests.filter(r => r.assigneeId === u.id);
          const totalHours = userRequests.reduce((acc, req) => acc + (req.workLogs || []).reduce((a, l) => a + l.hours, 0), 0);
          const hourlyRate = u.hourlyRate || 0;
          const totalDue = totalHours * hourlyRate;
          
          // Paid amount this month (mock logic based on transactions linked to user)
          const paidAmount = transactions
            .filter(t => t.userId === u.id && t.type === 'Expense' && t.category === 'Salary')
            .reduce((sum, t) => sum + t.amount, 0);

          return { user: u, totalHours, hourlyRate, totalDue, paidAmount, balance: totalDue - paidAmount };
      });
  }, [users, requests, transactions]);

  // --- Form State ---
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
      type: 'Income',
      date: new Date().toISOString().split('T')[0],
      status: 'Paid',
      paymentMethod: 'Bank Transfer',
      amount: 0
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingFile(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewTx(prev => ({ ...prev, attachment: result }));
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTransaction = () => {
      if (!newTx.description || !newTx.amount) return;
      onAddTransaction({
          id: `tx-${Date.now()}`,
          ...newTx as Transaction,
          date: new Date(newTx.date!).toISOString()
      });
      setShowAddModal(false);
      setNewTx({ type: 'Income', date: new Date().toISOString().split('T')[0], status: 'Paid', paymentMethod: 'Bank Transfer', amount: 0, attachment: undefined });
  };

  const handleCreateInvoice = () => {
      if (!newInvoice.clientId || !newInvoice.amount) {
          alert('يرجى اختيار العميل وتحديد المبلغ');
          return;
      }
      
      const clientName = clients.find(c => c.id === newInvoice.clientId)?.name || 'Unknown';

      onAddTransaction({
          id: `inv-${Date.now()}`,
          type: 'Income',
          category: 'Invoice',
          description: `فاتورة #${newInvoice.invoiceNumber} - ${newInvoice.description}`,
          amount: newInvoice.amount,
          date: new Date(newInvoice.date).toISOString(),
          clientId: newInvoice.clientId,
          status: 'Pending', // الفواتير تبدأ كمعلقة
          paymentMethod: 'Bank Transfer',
          notes: `Due Date: ${newInvoice.dueDate}`
      });

      setShowInvoiceModal(false);
      setNewInvoice({
          clientId: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          description: '',
          amount: 0,
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
      });
  };

  const handleViewAttachment = (dataUrl: string) => {
      const win = window.open();
      if(win) {
          win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
  };

  const handleMarkAsPaid = (inv: Transaction) => {
      if(confirm('هل تريد تسجيل هذه الفاتورة كمدفوعة؟')) {
          onUpdateTransaction({ ...inv, status: 'Paid' });
      }
  };

  const getClientName = (clientId?: string) => {
      if (!clientId) return "عميل عام";
      return clients.find(c => c.id === clientId)?.name || "عميل غير معروف";
  };

  return (
    <div className="p-4 md:p-8 h-full bg-charcoal-950 flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className="text-3xl black-header text-white flex items-center gap-3">
                    <Wallet className="text-emerald-500" size={32}/> الإدارة المالية
                </h2>
                <p className="text-zinc-500 text-sm">متابعة التدفقات النقدية (شيكل)، الفواتير، ورواتب الفريق</p>
            </div>
            <div className="flex bg-charcoal-900 p-1 rounded-xl border border-white/5">
                {[
                    {id: 'overview', label: 'نظرة عامة', icon: PieChart},
                    {id: 'transactions', label: 'سجل المعاملات', icon: FileText},
                    {id: 'payroll', label: 'الرواتب (Payroll)', icon: Users},
                    {id: 'invoices', label: 'الفواتير', icon: DollarSign}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <tab.icon size={16}/> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl"><ArrowDownLeft size={24}/></div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">الإيرادات</span>
                            </div>
                            <div className="text-3xl font-black text-white mb-1">₪{totalIncome.toLocaleString()}</div>
                            <div className="text-xs text-emerald-500 font-bold">+ مدفوعة</div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl"><ArrowUpRight size={24}/></div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">المصروفات</span>
                            </div>
                            <div className="text-3xl font-black text-white mb-1">₪{totalExpenses.toLocaleString()}</div>
                            <div className="text-xs text-red-500 font-bold">- مدفوعة</div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/20 text-blue-500 rounded-2xl"><Wallet size={24}/></div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">صافي الربح</span>
                            </div>
                            <div className={`text-3xl font-black mb-1 ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>₪{netProfit.toLocaleString()}</div>
                            <div className="text-xs text-zinc-500 font-bold">Net Profit</div>
                        </div>
                        <div className="bg-charcoal-900 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-500/20 text-orange-500 rounded-2xl"><Clock size={24}/></div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">مستحقات معلقة</span>
                            </div>
                            <div className="text-3xl font-black text-white mb-1">₪{pendingIncome.toLocaleString()}</div>
                            <div className="text-xs text-orange-500 font-bold">تحت التحصيل</div>
                        </div>
                    </div>

                    {/* Quick Add & Recent */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-charcoal-900 p-6 rounded-[32px] border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-bold flex items-center gap-2"><TrendingUp size={20} className="text-primary"/> أحدث المعاملات</h3>
                                <button onClick={() => setActiveTab('transactions')} className="text-xs text-primary hover:underline">عرض الكل</button>
                            </div>
                            <div className="space-y-3">
                                {transactions.length === 0 && <p className="text-center text-zinc-600 text-sm py-4">لا توجد معاملات مسجلة</p>}
                                {transactions.slice(0, 5).map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-4 bg-charcoal-950 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {t.type === 'Income' ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">{t.description}</div>
                                                <div className="text-zinc-500 text-[10px]">{new Date(t.date).toLocaleDateString('ar-EG')} • {t.category}</div>
                                            </div>
                                        </div>
                                        <div className={`font-black text-sm ${t.type === 'Income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {t.type === 'Income' ? '+' : '-'}₪{t.amount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-b from-charcoal-900 to-black p-6 rounded-[32px] border border-white/5 flex flex-col justify-center items-center text-center">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-black mb-6 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse">
                                <Plus size={32}/>
                            </div>
                            <h3 className="text-white font-black text-xl mb-2">تسجيل معاملة جديدة</h3>
                            <p className="text-zinc-500 text-sm mb-6">إضافة إيراد جديد أو تسجيل مصروفات تشغيلية.</p>
                            <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black hover:scale-105 transition-transform w-full">
                                إضافة الآن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
                <div className="animate-slide-up space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-charcoal-900 p-4 rounded-2xl border border-white/5">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute right-3 top-3 text-zinc-500 w-4 h-4"/>
                            <input type="text" placeholder="بحث في المعاملات..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-charcoal-950 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-emerald-500 outline-none"/>
                        </div>
                        <div className="flex gap-2">
                            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-charcoal-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                                <option value="All">الكل</option>
                                <option value="Income">إيرادات</option>
                                <option value="Expense">مصروفات</option>
                            </select>
                            <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                                <Plus size={16}/> إضافة
                            </button>
                        </div>
                    </div>

                    <div className="bg-charcoal-900 rounded-[30px] border border-white/5 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-charcoal-950 text-zinc-500 text-[10px] font-black uppercase">
                                <tr>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">الوصف</th>
                                    <th className="p-4">الفئة</th>
                                    <th className="p-4">طريقة الدفع</th>
                                    <th className="p-4">مرفقات</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4">المبلغ (₪)</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-zinc-400 text-xs font-mono">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="p-4 text-white font-bold text-sm">{t.description}</td>
                                        <td className="p-4"><span className="bg-white/5 px-2 py-1 rounded text-[10px] text-zinc-300 border border-white/5">{t.category}</span></td>
                                        <td className="p-4 text-zinc-400 text-xs">
                                            {t.paymentMethod === 'Check' ? 'شيك' : 
                                             t.paymentMethod === 'Cash' ? 'نقدي' : 
                                             t.paymentMethod === 'Credit Card' ? 'فيزا/بطاقة' : 
                                             t.paymentMethod === 'Bank Transfer' ? 'تحويل بنكي' : t.paymentMethod}
                                        </td>
                                        <td className="p-4">
                                            {t.attachment && (
                                                <button onClick={() => handleViewAttachment(t.attachment!)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]">
                                                    <Paperclip size={12}/> عرض
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${t.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : t.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-black text-sm ${t.type === 'Income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {t.type === 'Income' ? '+' : '-'}₪{t.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-left">
                                            <button onClick={() => { if(confirm('حذف المعاملة؟')) onDeleteTransaction(t.id)}} className="text-zinc-600 hover:text-red-500 transition-colors">🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PAYROLL TAB */}
            {activeTab === 'payroll' && (
                <div className="animate-slide-up space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {payrollData.map(p => (
                            <div key={p.user.id} className="bg-charcoal-900 p-6 rounded-[32px] border border-white/5 flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <img src={p.user.avatar} className="w-14 h-14 rounded-2xl border border-white/10" alt={p.user.name} />
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{p.user.name}</h4>
                                        <div className="text-zinc-500 text-xs">{p.user.role}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-charcoal-950 p-4 rounded-2xl border border-white/5">
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">ساعات العمل</div>
                                        <div className="text-white font-mono font-bold">{p.totalHours}h</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">معدل الساعة</div>
                                        <div className="text-white font-mono font-bold">₪{p.hourlyRate}</div>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-white/5 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-zinc-400">إجمالي المستحق</span>
                                            <span className="text-emerald-400 font-black">₪{p.totalDue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-zinc-400">المدفوع</span>
                                            <span className="text-zinc-300 font-bold">₪{p.paidAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 bg-white/5 p-2 rounded-lg">
                                            <span className="text-xs text-white font-bold">المتبقي</span>
                                            <span className={`font-black ${p.balance > 0 ? 'text-red-400' : 'text-emerald-500'}`}>₪{p.balance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setNewTx({
                                            type: 'Expense',
                                            category: 'Salary',
                                            description: `راتب: ${p.user.name}`,
                                            amount: p.balance > 0 ? p.balance : 0,
                                            userId: p.user.id,
                                            date: new Date().toISOString().split('T')[0],
                                            status: 'Paid',
                                            paymentMethod: 'Bank Transfer'
                                        });
                                        setShowAddModal(true);
                                    }}
                                    className="w-full py-3 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2"
                                >
                                    <DollarSign size={16}/> تسجيل دفعة راتب
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
                <div className="animate-slide-up space-y-6">
                    {/* Header Action */}
                    <div className="flex justify-between items-center bg-charcoal-900 p-6 rounded-[24px] border border-white/5">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-1">نظام الفواتير</h3>
                            <p className="text-zinc-500 text-xs">إدارة فواتير العملاء وتتبع المدفوعات المستحقة.</p>
                        </div>
                        <button 
                            onClick={() => setShowInvoiceModal(true)} 
                            className="bg-primary text-black px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Plus size={16}/> إنشاء فاتورة جديدة
                        </button>
                    </div>

                    {/* Invoices List */}
                    {invoicesList.length === 0 ? (
                        <div className="bg-charcoal-900 rounded-[30px] border border-white/5 p-8 text-center border-dashed border-2 opacity-50">
                            <FileText size={48} className="mx-auto text-zinc-700 mb-4"/>
                            <h3 className="text-white font-bold mb-2">لا توجد فواتير</h3>
                            <p className="text-zinc-500 text-sm">ابدأ بإنشاء أول فاتورة للعميل.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {invoicesList.map(inv => (
                                <div key={inv.id} onClick={() => setViewInvoice(inv)} className="bg-charcoal-900 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-primary/20 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            <FileText size={20}/>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-white font-bold text-sm">{inv.description.split('-')[0]}</h4>
                                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-300 border border-white/5">{getClientName(inv.clientId)}</span>
                                            </div>
                                            <p className="text-zinc-500 text-xs">{inv.description.split('-')[1] || inv.description}</p>
                                            <div className="text-[10px] text-zinc-600 mt-1 flex gap-2">
                                                <span>{new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                                                {inv.notes && <span>• {inv.notes}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-right">
                                            <div className="text-white font-black text-lg">₪{inv.amount.toLocaleString()}</div>
                                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                {inv.status === 'Paid' ? 'مدفوعة' : 'بانتظار الدفع'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {inv.status !== 'Paid' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(inv); }} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all" title="تسجيل كمدفوع">
                                                    <Check size={18}/>
                                                </button>
                                            )}
                                            <button className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all" title="عرض التفاصيل">
                                                <Eye size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* View Invoice Modal */}
        {viewInvoice && (
            <div className="fixed inset-0 z-[1400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-charcoal-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-charcoal-950">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><FileText size={20} className="text-primary"/> تفاصيل الفاتورة</h3>
                        <button onClick={() => setViewInvoice(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-8 bg-white text-black font-sans relative overflow-hidden">
                        {/* Watermark for visual effect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black text-gray-100 -rotate-45 pointer-events-none z-0">INVOICE</div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="text-2xl font-black mb-1">INVOICE</div>
                                    <div className="text-sm text-gray-500 font-bold">{viewInvoice.description.split('-')[0] || 'INV-001'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-800">B2U Plus Agency</div>
                                    <div className="text-xs text-gray-500">Premium Digital Solutions</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bill To:</div>
                                    <div className="text-sm font-bold">{getClientName(viewInvoice.clientId)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Date:</div>
                                    <div className="text-sm font-mono font-bold">{new Date(viewInvoice.date).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="border-t-2 border-black mb-4"></div>

                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-2 font-bold text-sm">
                                    <span>Description</span>
                                    <span>Amount</span>
                                </div>
                                <div className="flex justify-between items-start text-sm">
                                    <span className="text-gray-600 max-w-[70%]">{viewInvoice.description}</span>
                                    <span className="font-mono">₪{viewInvoice.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                <div className="text-sm font-bold">Total Due</div>
                                <div className="text-2xl font-black">₪{viewInvoice.amount.toLocaleString()}</div>
                            </div>

                            <div className="mt-8 text-center">
                                <span className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase border-2 ${viewInvoice.status === 'Paid' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}>
                                    {viewInvoice.status === 'Paid' ? 'PAID' : 'PAYMENT PENDING'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-charcoal-950 border-t border-white/5 flex justify-end gap-3">
                        <button onClick={() => setViewInvoice(null)} className="px-6 py-2 rounded-xl text-zinc-400 hover:text-white font-bold text-sm">إغلاق</button>
                        <button onClick={() => window.print()} className="px-6 py-2 rounded-xl bg-charcoal-800 text-white font-bold text-sm hover:bg-charcoal-700">طباعة</button>
                    </div>
                </div>
            </div>
        )}

        {/* Add Transaction Modal */}
        {showAddModal && (
            <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-charcoal-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-white font-bold text-lg">تسجيل معاملة مالية</h3>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">نوع المعاملة</label>
                                <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as any})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="Income">إيراد (+)</option>
                                    <option value="Expense">مصروف (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">التاريخ</label>
                                <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">الوصف</label>
                            <input type="text" placeholder="مثال: دفعة مشروع..." value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">المبلغ (₪)</label>
                                <input type="number" placeholder="0.00" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none font-mono"/>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">الفئة (Category)</label>
                                <input type="text" placeholder="Salary, Project..." value={newTx.category || ''} onChange={e => setNewTx({...newTx, category: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none"/>
                            </div>
                        </div>
                        
                        {/* Conditional Selects */}
                        {newTx.type === 'Income' && (
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">العميل (مصدر الدفعة)</label>
                                <select value={newTx.clientId || ''} onChange={e => setNewTx({...newTx, clientId: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="">-- اختر عميل --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        {newTx.type === 'Expense' && (
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">الموظف (اختياري - للرواتب)</label>
                                <select value={newTx.userId || ''} onChange={e => setNewTx({...newTx, userId: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="">-- اختر موظف --</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">طريقة الدفع</label>
                                <select value={newTx.paymentMethod} onChange={e => setNewTx({...newTx, paymentMethod: e.target.value as any})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="Cash">نقدي (Cash)</option>
                                    <option value="Check">شيك (Check)</option>
                                    <option value="Credit Card">فيزا / بطاقة</option>
                                    <option value="Bank Transfer">تحويل بنكي</option>
                                    <option value="PayPal">PayPal</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">حالة الدفع</label>
                                <select value={newTx.status} onChange={e => setNewTx({...newTx, status: e.target.value as any})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                    <option value="Paid">مدفوع</option>
                                    <option value="Pending">معلق (آجل)</option>
                                    <option value="Overdue">متأخر</option>
                                </select>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="bg-charcoal-800/50 p-4 rounded-xl border border-white/5 border-dashed">
                            <label className="text-xs text-zinc-500 block mb-2 flex items-center gap-2">
                                <Paperclip size={14}/> إرفاق مستند (صورة شيك، إيصال، كشف راتب)
                            </label>
                            
                            {!newTx.attachment ? (
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={isProcessingFile}
                                    className="w-full py-3 bg-charcoal-800 hover:bg-charcoal-700 text-zinc-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessingFile ? 'جاري المعالجة...' : 'رفع ملف'} <Upload size={14}/>
                                </button>
                            ) : (
                                <div className="flex items-center justify-between bg-charcoal-800 p-2 rounded-lg">
                                    <span className="text-xs text-emerald-500 font-bold">تم إرفاق الملف بنجاح</span>
                                    <button onClick={() => setNewTx(prev => ({ ...prev, attachment: undefined }))} className="text-red-500 text-xs underline">إزالة</button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                        </div>

                    </div>
                    <div className="p-6 border-t border-white/5 flex gap-4 shrink-0">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white font-bold text-sm">إلغاء</button>
                        <button onClick={handleSaveTransaction} disabled={isProcessingFile} className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-black text-sm hover:bg-emerald-400 disabled:opacity-50">حفظ</button>
                    </div>
                </div>
            </div>
        )}

        {/* Invoice Creator Modal */}
        {showInvoiceModal && (
            <div className="fixed inset-0 z-[1350] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-charcoal-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><FileText size={20} className="text-primary"/> إنشاء فاتورة جديدة</h3>
                        <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">العميل</label>
                            <select value={newInvoice.clientId} onChange={e => setNewInvoice({...newInvoice, clientId: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none">
                                <option value="">-- اختر العميل --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">رقم الفاتورة</label>
                                <input type="text" value={newInvoice.invoiceNumber} onChange={e => setNewInvoice({...newInvoice, invoiceNumber: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none font-mono"/>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">المبلغ (₪)</label>
                                <input type="number" value={newInvoice.amount || ''} onChange={e => setNewInvoice({...newInvoice, amount: Number(e.target.value)})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none font-mono" placeholder="0.00"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">تاريخ الإصدار</label>
                                <input type="date" value={newInvoice.date} onChange={e => setNewInvoice({...newInvoice, date: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none"/>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">تاريخ الاستحقاق (Due Date)</label>
                                <input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">وصف الفاتورة / المشروع</label>
                            <textarea rows={2} value={newInvoice.description} onChange={e => setNewInvoice({...newInvoice, description: e.target.value})} className="w-full bg-charcoal-800 border border-white/5 rounded-xl p-3 text-white text-sm outline-none" placeholder="مثال: رسوم إدارة الحملات لشهر يناير..."/>
                        </div>
                    </div>
                    <div className="p-6 border-t border-white/5">
                        <button onClick={handleCreateInvoice} className="w-full bg-primary text-black py-3 rounded-xl font-black text-sm hover:scale-[1.02] transition-transform">
                            إنشاء وإرسال
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FinanceDashboard;

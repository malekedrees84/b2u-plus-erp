
import { UserRole, RequestStatus, User, Client, ProductionRequest, RequestType, Transaction } from './types';

export const STATUS_COLORS: Record<string, string> = {
  [RequestStatus.CREATED]: 'text-slate-400 border-slate-400/20 bg-slate-400/5',        
  [RequestStatus.IN_PROGRESS]: 'text-blue-400 border-blue-400/20 bg-blue-400/5',      
  [RequestStatus.WAITING_REVIEW]: 'text-purple-400 border-purple-400/20 bg-purple-400/5',   
  [RequestStatus.IN_REVIEW]: 'text-purple-400 border-purple-400/20 bg-purple-400/5',   
  [RequestStatus.NEEDS_CHANGES]: 'text-red-400 border-red-400/20 bg-red-400/5',       
  [RequestStatus.WAITING_CLIENT_APPROVAL]: 'text-orange-400 border-orange-400/20 bg-orange-400/5', 
  [RequestStatus.APPROVED]: 'text-teal-400 border-teal-400/20 bg-teal-400/5',         
  [RequestStatus.PUBLISHED]: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5', 
  
  [RequestStatus.SUSPENDED]: 'text-orange-400 border-orange-400/20 bg-orange-400/5',
  [RequestStatus.CANCELLED]: 'text-red-600 border-red-600/20 bg-red-600/5',
  [RequestStatus.OVERDUE]: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
  [RequestStatus.ARCHIVED]: 'text-zinc-600 border-zinc-600/20 bg-zinc-600/5',
};

// الهيكل التنظيمي
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLIENT]: 0,     // External
  [UserRole.VIEWER]: 0,
  [UserRole.CREATOR]: 1,    
  [UserRole.PUBLISHING]: 2, 
  [UserRole.ACCOUNTANT]: 3, 
  [UserRole.SUPERVISOR]: 4, 
  [UserRole.ADMIN]: 5,      
};

export const AVAILABLE_DEPARTMENTS = [
  'الإدارة العليا',
  'المشرفين',
  'المالية والمحاسبة',
  'التسويق',
  'التصميم',
  'الإنتاج',
  'النشر',
  'كتابة المحتوى',
  'الموارد البشرية',
  'تطوير الأعمال'
];

export const MOCK_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    name: 'المدير العام (Master)',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin+Master&background=0D8ABC&color=fff',
    departments: ['الإدارة العليا'],
    email: 'admin@b2u.com',
    password: '123',
    status: 'Active',
    hourlyRate: 100
  },
  {
    id: 'u-accountant',
    username: 'money',
    name: 'المحاسب العام',
    role: UserRole.ACCOUNTANT,
    avatar: 'https://ui-avatars.com/api/?name=Money+Manager&background=10b981&color=fff',
    departments: ['المالية والمحاسبة'],
    email: 'finance@b2u.com',
    password: '123',
    status: 'Active',
    hourlyRate: 80
  },
  {
    id: 'u-demo',
    username: 'user',
    name: 'مستخدم تجريبي (Demo)',
    role: UserRole.CREATOR,
    avatar: 'https://ui-avatars.com/api/?name=User+Demo&background=3b82f6&color=fff',
    departments: ['التصميم', 'السوشيال ميديا'],
    email: 'user@b2u.com',
    password: '123',
    status: 'Active',
    hourlyRate: 50
  }
];

export const INITIAL_CLIENTS: Client[] = [
    {
        id: 'c-1',
        name: 'شركة المستقبل',
        industry: 'التكنولوجيا',
        logo: 'https://ui-avatars.com/api/?name=Future+Tech&background=6366f1&color=fff',
        brandColor: '#6366f1',
        contactPerson: 'أحمد علي',
        email: 'contact@future.com',
        phone: '0500000000',
        status: 'Active',
        contractDate: new Date().toISOString(),
        notes: 'عميل مميز',
        budget: 50000
    }
];

export const INITIAL_REQUESTS: ProductionRequest[] = [
    {
        id: 'req-init-1',
        title: 'تصميم هوية بصرية مبدئية',
        client: 'شركة المستقبل',
        project: 'إطلاق العلامة التجارية',
        type: RequestType.DESIGN,
        status: RequestStatus.IN_PROGRESS,
        assigneeId: 'u-demo', 
        supervisorId: 'u-admin',
        priority: 'High',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], 
        brief: 'تصميم شعار وألوان الهوية للشركة الجديدة.',
        createdAt: new Date().toISOString(),
        deliverables: [],
        comments: [],
        checklists: [
            { id: '1', text: 'رسم السكتشات الأولية', completed: true },
            { id: '2', text: 'اختيار الألوان', completed: false }
        ],
        attachments: [],
        isActive: true,
        workLogs: [
            { id: 'wl-1', userId: 'u-demo', userName: 'مستخدم تجريبي', date: new Date().toISOString(), hours: 5, note: 'تصميم أولي' }
        ]
    },
    {
        id: 'req-init-2',
        title: 'كتابة محتوى تعريفي',
        client: 'شركة المستقبل',
        project: 'الموقع الإلكتروني',
        type: RequestType.CONTENT,
        status: RequestStatus.WAITING_REVIEW,
        assigneeId: 'u-demo', 
        supervisorId: 'u-admin',
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0], 
        brief: 'كتابة صفحة "من نحن" والرؤية والرسالة.',
        createdAt: new Date().toISOString(),
        deliverables: [],
        comments: [],
        checklists: [],
        attachments: [],
        isActive: true
    }
];

// Start with ZERO transactions
export const MOCK_TRANSACTIONS: Transaction[] = [];

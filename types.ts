export enum UserRole {
  ADMIN = 'المدير العام',
  SUPERVISOR = 'مشرف',
  ACCOUNTANT = 'محاسب',
  CREATOR = 'منفذ',
  PUBLISHING = 'نشر',
  VIEWER = 'مشاهد',
  CLIENT = 'عميل'
}

export enum RequestStatus {
  CREATED = 'جديد',
  IN_PROGRESS = 'قيد التنفيذ',
  WAITING_REVIEW = 'بانتظار المراجعة',
  IN_REVIEW = 'قيد المراجعة',
  NEEDS_CHANGES = 'تعديلات مطلوبة',
  WAITING_CLIENT_APPROVAL = 'بانتظار موافقة العميل',
  APPROVED = 'معتمد',
  PUBLISHED = 'منشور',
  SUSPENDED = 'معلق',
  CANCELLED = 'ملغي',
  OVERDUE = 'متأخر',
  ARCHIVED = 'مؤرشف'
}

export enum RequestType {
  DESIGN = 'تصميم',
  CONTENT = 'محتوى',
  VIDEO = 'فيديو',
  SOCIAL = 'سوشيال ميديا',
  OTHER = 'آخر'
}

export enum RecurrencePattern {
  NONE = 'None',
  DAILY = 'يومي',
  WEEKLY = 'أسبوعي',
  MONTHLY = 'شهري'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  text?: string;
  image?: string;
  fileUrl?: string;
  fileName?: string;
  audioUrl?: string;
  taskId?: string;
  taskTitle?: string;
  taskStatus?: RequestStatus;
  read: boolean;
}

export interface Permissions {
  canCreateRequest: boolean;
  canEditRequest: boolean;
  canDeleteRequest: boolean;
  canManageUsers: boolean;
  canPostAnnouncements: boolean;
  canViewReports: boolean;
  canViewAllRequests: boolean;
  canViewInternalNotes: boolean;
  canApproveTasks: boolean;
  canPublishTasks: boolean;
  canSeeActivityLog: boolean;
  canManageFinance: boolean;
  canViewFinancials: boolean;
}

export type RolePermissions = Record<UserRole, Permissions>;

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roles?: UserRole[];
  avatar: string;
  departments: string[];
  department?: string;
  email: string;
  password?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  hourlyRate?: number;
  isDeleted?: boolean;
  lastSeen?: string;
  customPermissions?: Partial<Permissions>;
  linkedClientId?: string;
  lastUpdated?: string;
  phone?: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  logo: string;
  brandColor: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  contractDate: string;
  notes: string;
  budget?: number;
  isDeleted?: boolean;
  driveFolderId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: ToastType;
  context: string;
  entityId?: string;
  targetUserId?: string | string[] | "all";
  isPassive?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: string;
  uploadedAt: string;
}

export interface WorkLog {
  id: string;
  userId: string;
  userName: string;
  date: string;
  hours: number;
  note: string;
}

export interface StatusHistoryEntry {
  status: RequestStatus;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface ProductionRequest {
  id: string;
  title: string;
  client: string;
  project?: string;
  type: RequestType;
  status: RequestStatus;
  assigneeId: string;
  supervisorId: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  brief: string;
  createdAt: string;
  deliverables?: any[];
  comments?: Comment[];
  checklists?: ChecklistItem[];
  attachments?: Attachment[];
  isActive: boolean;
  workLogs?: WorkLog[];
  statusHistory?: StatusHistoryEntry[];
  creatorId?: string;
  publishedAt?: string;
  lastActivity?: string;
  watchers?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurrence?: RecurrencePattern;
}

export type ToastType = 'success' | 'error' | 'info';

export interface AppSettings {
  appName: string;
  appLogo: string;
  primaryColor: string;
  loginHeadline?: string;
  loginSubtext?: string;
  loginBgColor?: string;
}

export type TransactionType = 'Income' | 'Expense';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type PaymentMethod = 'Cash' | 'Check' | 'Credit Card' | 'Bank Transfer' | 'PayPal';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  clientId?: string;
  userId?: string;
  attachment?: string;
  notes?: string;
}

export interface AnnouncementSlide {
  id: string;
  image: string;
  title: string;
  content: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  authorId: string;
  type: 'hero' | 'scrolling' | 'info';
  isActive: boolean;
  imageUrl?: string;
  images?: string[];
  slides?: AnnouncementSlide[];
  backgroundColor?: string;
  textColor?: string;
  isScrolling?: boolean;
  link?: string;
}

export interface LoginConfig {}
export interface WelcomeConfig {}
export type MilestoneTypeKey = 'DESIGN' | 'CONTENT' | 'DELIVERY';

export type ProjectMilestoneTemplate =
  | 'STANDARD'
  | 'QUICK_START'
  | 'CONTENT_FIRST'
  | 'CUSTOM';

export interface ProjectSummary {
  id: string;
  name: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientWebsite?: string | null;
  description?: string | null;
  status: string;
  progress: number;
  nextAction?: string | null;
  milestoneTemplate?: ProjectMilestoneTemplate;
  clientId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectPayload {
  id: string;
  name: string;
  status: string;
  progress: number;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientWebsite?: string | null;
  milestoneTemplate?: ProjectMilestoneTemplate;
  nextAction?: string | null;
  description?: string | null;
  clientId: string;
  estimatedDeliveryAt?: string | null;
  createdAt?: string;
}

export interface ClientSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string;
  createdAt?: string;
}

export interface ClientInvitationSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

export interface ClientDetailPayload extends ClientSummary {
  isActive: boolean;
  updatedAt: string;
  stats: {
    totalProjects: number;
    activeProjects: number;
    waitingProjects: number;
    completedProjects: number;
    averageProgress: number;
    lastProjectUpdateAt?: string | null;
  };
  invitationStats: {
    pendingInvitations: number;
    acceptedInvitations: number;
    revokedInvitations: number;
    expiredInvitations: number;
    latestInvitationAt?: string | null;
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  source: string;
  priority?: string | null;
  dueDate?: string | null;
  milestoneType?: string | null;
  blockedReason?: string | null;
  position?: number;
  checklistTotal: number;
  checklistDone: number;
  createdAt?: string;
}

export interface TaskDetail extends TaskItem {
  files: FileItem[];
  milestoneValidation?: MilestoneItem | null;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface TicketItem {
  id: string;
  projectId: string;
  createdById?: string;
  title: string;
  description: string;
  status: string;
  type: string;
  requiresPayment: boolean;
  priceCents?: number | null;
  currency?: string;
  paymentDescription?: string | null;
  statusReason?: string | null;
  convertedTaskId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type TicketViewFilter = 'ALL' | 'ACTION_REQUIRED' | 'PAYMENT_REQUIRED' | 'CLOSED';

export type TicketSortBy = 'PRIORITY' | 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

export interface PaginatedTicketsPayload {
  items: TicketItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    actionRequired: number;
    paymentRequired: number;
    closed: number;
  };
}

export interface MessageItem {
  id: string;
  authorId: string;
  body: string;
  ticketId?: string | null;
  createdAt: string;
}

export interface FileItem {
  id: string;
  originalName: string;
  category: string;
  contentType: string;
  sizeBytes: number;
  versionLabel?: string | null;
  isUploaded: boolean;
  isDeleted: boolean;
  noteCount: number;
  createdAt: string;
}

export interface FileNoteItem {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface PaymentItem {
  id: string;
  title: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  status: string;
  ticketId?: string | null;
  createdAt: string;
}

export interface AuditItem {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
}

export interface MilestoneItem {
  id: string;
  type: string;
  validated: boolean;
  comment?: string | null;
  validatedAt?: string | null;
  validatedByAdminId?: string | null;
  validatedByAdminAt?: string | null;
  adminComment?: string | null;
  validatedByClientId?: string | null;
  validatedByClientAt?: string | null;
  clientComment?: string | null;
}

export interface AdminNoteItem {
  id: string;
  content: string;
  createdAt: string;
}

export interface DashboardPayload {
  project: ProjectPayload;
  summary: {
    totalTasks: number;
    doneTasks: number;
    blockedTasks: number;
    completionRate: number;
  };
}

export interface ProjectTabNotificationCounts {
  tasks: number;
  tickets: number;
  messages: number;
  files: number;
  payments: number;
  activity: number;
  'admin-notes': number;
}

export interface ProjectTabNotificationsPayload {
  counts: ProjectTabNotificationCounts;
  total: number;
}

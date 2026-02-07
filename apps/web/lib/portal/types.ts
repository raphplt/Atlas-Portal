export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  nextAction?: string | null;
  clientId: string;
  updatedAt?: string;
}

export interface ProjectPayload {
  id: string;
  name: string;
  status: string;
  progress: number;
  nextAction?: string | null;
  description?: string | null;
  clientId: string;
}

export interface ClientSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string;
  createdAt?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  source: string;
  blockedReason?: string | null;
  position?: number;
  createdAt?: string;
}

export interface TicketItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  type: string;
  requiresPayment: boolean;
  priceCents?: number | null;
  paymentDescription?: string | null;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  body: string;
  ticketId?: string | null;
  createdAt: string;
}

export interface FileItem {
  id: string;
  originalName: string;
  category: string;
  isUploaded: boolean;
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

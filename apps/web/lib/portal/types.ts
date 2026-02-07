export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  nextAction?: string | null;
  clientId: string;
  createdAt?: string;
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
  statusReason?: string | null;
  createdAt: string;
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

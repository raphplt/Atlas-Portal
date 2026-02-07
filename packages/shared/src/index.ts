import { z } from 'zod';

export const USER_ROLES = ['ADMIN', 'CLIENT'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROJECT_STATUSES = ['IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_SOURCES = ['CORE', 'TICKET'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const TASK_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TICKET_TYPES = ['BUG', 'MODIFICATION', 'IMPROVEMENT', 'QUESTION'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = [
  'OPEN',
  'NEEDS_INFO',
  'ACCEPTED',
  'REJECTED',
  'PAYMENT_REQUIRED',
  'PAID',
  'CONVERTED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELED', 'EXPIRED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FILE_CATEGORIES = ['BRANDING', 'CONTENT', 'DELIVERABLE', 'OTHER'] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const MILESTONE_TYPES = ['DESIGN', 'CONTENT', 'DELIVERY'] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export const projectListQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(PROJECT_STATUSES).optional(),
  search: z.string().max(120).optional(),
});

export const paginatedQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export enum ProjectStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CLIENT = 'WAITING_CLIENT',
  COMPLETED = 'COMPLETED',
}

export enum TaskSource {
  CORE = 'CORE',
  TICKET = 'TICKET',
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED_BY_CLIENT = 'BLOCKED_BY_CLIENT',
  DONE = 'DONE',
}

export enum TicketType {
  BUG = 'BUG',
  MODIFICATION = 'MODIFICATION',
  IMPROVEMENT = 'IMPROVEMENT',
  QUESTION = 'QUESTION',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  NEEDS_INFO = 'NEEDS_INFO',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAID = 'PAID',
  CONVERTED = 'CONVERTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum FileCategory {
  BRANDING = 'BRANDING',
  CONTENT = 'CONTENT',
  DELIVERABLE = 'DELIVERABLE',
  OTHER = 'OTHER',
}

export enum MilestoneType {
  DESIGN = 'DESIGN',
  CONTENT = 'CONTENT',
  DELIVERY = 'DELIVERY',
}

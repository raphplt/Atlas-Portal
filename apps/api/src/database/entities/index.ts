import { AdminNoteEntity } from './admin-note.entity';
import { AuditEventEntity } from './audit-event.entity';
import { ClientInvitationEntity } from './client-invitation.entity';
import { FileAssetEntity } from './file-asset.entity';
import { MessageEntity } from './message.entity';
import { MilestoneValidationEntity } from './milestone-validation.entity';
import { PaymentEntity } from './payment.entity';
import { ProjectEntity } from './project.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { StripeEventEntity } from './stripe-event.entity';
import { TaskEntity } from './task.entity';
import { TicketEntity } from './ticket.entity';
import { UserEntity } from './user.entity';
import { WorkspaceEntity } from './workspace.entity';

export const ENTITIES = [
  WorkspaceEntity,
  UserEntity,
  RefreshTokenEntity,
  ProjectEntity,
  TaskEntity,
  TicketEntity,
  MessageEntity,
  FileAssetEntity,
  PaymentEntity,
  AuditEventEntity,
  AdminNoteEntity,
  MilestoneValidationEntity,
  StripeEventEntity,
  ClientInvitationEntity,
];

export {
  AdminNoteEntity,
  AuditEventEntity,
  ClientInvitationEntity,
  FileAssetEntity,
  MessageEntity,
  MilestoneValidationEntity,
  PaymentEntity,
  ProjectEntity,
  RefreshTokenEntity,
  StripeEventEntity,
  TaskEntity,
  TicketEntity,
  UserEntity,
  WorkspaceEntity,
};

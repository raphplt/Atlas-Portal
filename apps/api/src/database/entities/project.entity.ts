import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectStatus } from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { UserEntity } from './user.entity';
import { TaskEntity } from './task.entity';
import { TicketEntity } from './ticket.entity';
import { MessageEntity } from './message.entity';
import { FileAssetEntity } from './file-asset.entity';
import { PaymentEntity } from './payment.entity';
import { AuditEventEntity } from './audit-event.entity';
import { MilestoneValidationEntity } from './milestone-validation.entity';
import { AdminNoteEntity } from './admin-note.entity';

@Entity('projects')
@Index(['workspaceId', 'createdAt'])
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @ManyToOne(() => UserEntity, (user) => user.projects, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: UserEntity;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.IN_PROGRESS })
  status!: ProjectStatus;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'varchar', length: 255, name: 'next_action', nullable: true })
  nextAction?: string | null;

  @Column({ type: 'uuid', name: 'last_update_author_id', nullable: true })
  lastUpdateAuthorId?: string | null;

  @Column({ type: 'timestamptz', name: 'estimated_delivery_at', nullable: true })
  estimatedDeliveryAt?: Date | null;

  @OneToMany(() => TaskEntity, (task) => task.project)
  tasks!: TaskEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.project)
  tickets!: TicketEntity[];

  @OneToMany(() => MessageEntity, (message) => message.project)
  messages!: MessageEntity[];

  @OneToMany(() => FileAssetEntity, (file) => file.project)
  files!: FileAssetEntity[];

  @OneToMany(() => PaymentEntity, (payment) => payment.project)
  payments!: PaymentEntity[];

  @OneToMany(() => AuditEventEntity, (event) => event.project)
  auditEvents!: AuditEventEntity[];

  @OneToMany(() => MilestoneValidationEntity, (validation) => validation.project)
  milestoneValidations!: MilestoneValidationEntity[];

  @OneToMany(() => AdminNoteEntity, (note) => note.project)
  adminNotes!: AdminNoteEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

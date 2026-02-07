import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketStatus, TicketType } from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';
import { TaskEntity } from './task.entity';
import { MessageEntity } from './message.entity';

@Entity('tickets')
@Index(['workspaceId', 'projectId', 'status'])
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.tickets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: UserEntity;

  @Column({ type: 'enum', enum: TicketType })
  type!: TicketType;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @Column({ type: 'boolean', name: 'requires_payment', default: false })
  requiresPayment!: boolean;

  @Column({ type: 'int', name: 'price_cents', nullable: true })
  priceCents?: number | null;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'payment_description',
    nullable: true,
  })
  paymentDescription?: string | null;

  @Column({
    type: 'uuid',
    name: 'converted_task_id',
    nullable: true,
    unique: true,
  })
  convertedTaskId?: string | null;

  @OneToOne(() => TaskEntity, (task) => task.ticket, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'converted_task_id' })
  convertedTask?: TaskEntity | null;

  @Column({ type: 'boolean', name: 'is_deleted', default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => MessageEntity, (message) => message.ticket)
  messages!: MessageEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

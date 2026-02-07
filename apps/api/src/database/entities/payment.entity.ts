import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { TicketEntity } from './ticket.entity';
import { UserEntity } from './user.entity';

@Entity('payments')
@Index(['workspaceId', 'projectId', 'status'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'ticket_id', nullable: true })
  ticketId?: string | null;

  @ManyToOne(() => TicketEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: TicketEntity | null;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: UserEntity;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'int', name: 'amount_cents' })
  amountCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_checkout_session_id',
    nullable: true,
  })
  stripeCheckoutSessionId?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_payment_intent_id',
    nullable: true,
  })
  stripePaymentIntentId?: string | null;

  @Column({ type: 'timestamptz', name: 'due_at', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  MilestoneType,
  TaskPriority,
  TaskSource,
  TaskStatus,
} from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { TicketEntity } from './ticket.entity';

@Entity('tasks')
@Index(['workspaceId', 'projectId', 'status'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'enum', enum: TaskSource })
  source!: TaskSource;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.BACKLOG })
  status!: TaskStatus;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'blocked_reason',
    nullable: true,
  })
  blockedReason?: string | null;

  @Column({ type: 'enum', enum: TaskPriority, nullable: true })
  priority?: TaskPriority | null;

  @Column({ type: 'timestamptz', name: 'due_date', nullable: true })
  dueDate?: Date | null;

  @Column({
    type: 'enum',
    enum: MilestoneType,
    name: 'milestone_type',
    nullable: true,
  })
  milestoneType?: MilestoneType | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @OneToOne(() => TicketEntity, (ticket) => ticket.convertedTask)
  ticket?: TicketEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

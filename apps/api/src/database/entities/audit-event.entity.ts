import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('audit_events')
@Index(['workspaceId', 'projectId', 'createdAt'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string | null;

  @ManyToOne(() => ProjectEntity, (project) => project.auditEvents, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity | null;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: UserEntity | null;

  @Column({ type: 'varchar', length: 120 })
  action!: string;

  @Column({ type: 'varchar', length: 80, name: 'resource_type' })
  resourceType!: string;

  @Column({ type: 'varchar', length: 120, name: 'resource_id' })
  resourceId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

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
import { MilestoneType } from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('milestone_validations')
@Index(['workspaceId', 'projectId', 'type'], { unique: true })
export class MilestoneValidationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.milestoneValidations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'enum', enum: MilestoneType })
  type!: MilestoneType;

  /** Derived: true when both admin AND client have validated. */
  @Column({ type: 'boolean', default: false })
  validated!: boolean;

  // --- Admin validation ---
  @Column({ type: 'uuid', name: 'validated_by_admin_id', nullable: true })
  validatedByAdminId?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by_admin_id' })
  validatedByAdmin?: UserEntity | null;

  @Column({ type: 'timestamptz', name: 'validated_by_admin_at', nullable: true })
  validatedByAdminAt?: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'admin_comment', nullable: true })
  adminComment?: string | null;

  // --- Client validation ---
  @Column({ type: 'uuid', name: 'validated_by_client_id', nullable: true })
  validatedByClientId?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by_client_id' })
  validatedByClient?: UserEntity | null;

  @Column({ type: 'timestamptz', name: 'validated_by_client_at', nullable: true })
  validatedByClientAt?: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'client_comment', nullable: true })
  clientComment?: string | null;

  // --- Legacy fields (kept for backward compatibility with existing data) ---
  @Column({ type: 'uuid', name: 'validated_by_id', nullable: true })
  validatedById?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by_id' })
  validatedBy?: UserEntity | null;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comment?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

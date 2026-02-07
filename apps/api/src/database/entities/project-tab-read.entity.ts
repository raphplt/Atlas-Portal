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
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('project_tab_reads')
@Index(['workspaceId', 'projectId', 'userId'])
@Index(['workspaceId', 'projectId', 'userId', 'tabKey'], { unique: true })
export class ProjectTabReadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', name: 'tab_key', length: 32 })
  tabKey!: string;

  @Column({ type: 'timestamptz', name: 'last_read_at', default: () => 'now()' })
  lastReadAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

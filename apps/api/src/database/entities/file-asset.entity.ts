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
import { FileCategory } from '../../common/enums';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('file_assets')
@Index(['workspaceId', 'projectId', 'createdAt'])
export class FileAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @Column({ type: 'uuid', name: 'uploader_id' })
  uploaderId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploader_id' })
  uploader!: UserEntity;

  @Column({ type: 'enum', enum: FileCategory, default: FileCategory.OTHER })
  category!: FileCategory;

  @Column({ type: 'varchar', length: 255, name: 'original_name' })
  originalName!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'varchar', length: 120, name: 'content_type' })
  contentType!: string;

  @Column({ type: 'bigint', name: 'size_bytes' })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum?: string | null;

  @Column({ type: 'varchar', length: 32, name: 'version_label', nullable: true })
  versionLabel?: string | null;

  @Column({ type: 'uuid', name: 'ticket_id', nullable: true })
  ticketId?: string | null;

  @Column({ type: 'uuid', name: 'message_id', nullable: true })
  messageId?: string | null;

  @Column({ type: 'boolean', name: 'is_uploaded', default: false })
  isUploaded!: boolean;

  @Column({ type: 'boolean', name: 'is_deleted', default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

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
import { FileAssetEntity } from './file-asset.entity';
import { UserEntity } from './user.entity';

@Entity('file_notes')
@Index(['workspaceId', 'fileId', 'createdAt'])
export class FileNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'file_id' })
  fileId!: string;

  @ManyToOne(() => FileAssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file!: FileAssetEntity;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author!: UserEntity;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

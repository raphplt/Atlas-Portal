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
import { ClientInvitationStatus } from '../../common/enums';
import { UserEntity } from './user.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity('client_invitations')
@Index(['workspaceId', 'email', 'status'])
@Index(['tokenHash'], { unique: true })
export class ClientInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ type: 'uuid', name: 'invited_by_id' })
  invitedById!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy!: UserEntity;

  @Column({ type: 'uuid', name: 'accepted_user_id', nullable: true })
  acceptedUserId?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accepted_user_id' })
  acceptedUser?: UserEntity | null;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'first_name' })
  firstName?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'last_name' })
  lastName?: string | null;

  @Column({ type: 'varchar', length: 2, default: 'fr' })
  locale!: string;

  @Column({ type: 'varchar', length: 128, name: 'token_hash' })
  tokenHash!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ClientInvitationStatus.PENDING,
  })
  status!: ClientInvitationStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'accepted_at', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ClientInvitationStatus, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  ClientInvitationEntity,
  UserEntity,
  WorkspaceEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(ClientInvitationEntity)
    private readonly invitationRepository: Repository<ClientInvitationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspacesRepository: Repository<WorkspaceEntity>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async list(user: AuthUser, query: InvitationQueryDto) {
    this.assertAdmin(user);

    const qb = this.invitationRepository
      .createQueryBuilder('invitation')
      .where('invitation.workspace_id = :workspaceId', {
        workspaceId: user.workspaceId,
      });

    if (query.status) {
      qb.andWhere('invitation.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(invitation.email ILIKE :search OR invitation.first_name ILIKE :search OR invitation.last_name ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    const invitations = await qb
      .orderBy('invitation.created_at', 'DESC')
      .limit(query.limit)
      .getMany();

    return invitations.map((invitation) =>
      this.serializeInvitation(invitation),
    );
  }

  async create(user: AuthUser, dto: CreateInvitationDto) {
    this.assertAdmin(user);

    const normalizedEmail = dto.email.toLowerCase();

    const existingClient = await this.usersService.findByWorkspaceAndEmail(
      user.workspaceId,
      normalizedEmail,
    );

    if (existingClient) {
      throw new BadRequestException('Client already exists in workspace');
    }

    await this.invitationRepository.update(
      {
        workspaceId: user.workspaceId,
        email: normalizedEmail,
        status: ClientInvitationStatus.PENDING,
      },
      {
        status: ClientInvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    );

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = this.createExpiryDate();
    const locale = (dto.locale ?? 'fr').toLowerCase();

    const invitation = this.invitationRepository.create({
      workspaceId: user.workspaceId,
      invitedById: user.id,
      email: normalizedEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      locale,
      tokenHash,
      status: ClientInvitationStatus.PENDING,
      expiresAt,
    });

    const saved = await this.invitationRepository.save(invitation);

    const workspace = await this.workspacesRepository.findOne({
      where: { id: user.workspaceId },
    });

    const invitationUrl = this.buildInvitationUrl(token, locale);

    await this.notificationsService.send({
      to: normalizedEmail,
      subject: `Invitation to ${workspace?.name ?? 'Atlas Portal'}`,
      textBody: [
        `You have been invited to join ${workspace?.name ?? 'Atlas Portal'}.`,
        'Create your account using this secure link:',
        invitationUrl,
      ].join('\n\n'),
    });

    await this.auditService.create({
      workspaceId: user.workspaceId,
      actorId: user.id,
      action: 'CLIENT_INVITATION_CREATED',
      resourceType: 'ClientInvitation',
      resourceId: saved.id,
      metadata: { email: normalizedEmail },
    });

    return {
      ...this.serializeInvitation(saved),
      invitationUrl,
    };
  }

  async revoke(user: AuthUser, invitationId: string) {
    this.assertAdmin(user);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== ClientInvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    invitation.status = ClientInvitationStatus.REVOKED;
    invitation.revokedAt = new Date();

    const updated = await this.invitationRepository.save(invitation);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      actorId: user.id,
      action: 'CLIENT_INVITATION_REVOKED',
      resourceType: 'ClientInvitation',
      resourceId: invitation.id,
      metadata: { email: invitation.email },
    });

    return this.serializeInvitation(updated);
  }

  async getPublicInvitation(token: string) {
    const invitation = await this.resolvePendingInvitation(token);

    const workspace = await this.workspacesRepository.findOne({
      where: { id: invitation.workspaceId },
    });

    return {
      id: invitation.id,
      workspaceName: workspace?.name ?? 'Atlas Portal',
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      locale: invitation.locale,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptPublicInvitation(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.resolvePendingInvitation(token);

    const existingClient = await this.usersService.findByWorkspaceAndEmail(
      invitation.workspaceId,
      invitation.email,
    );

    if (existingClient) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = this.usersRepository.create({
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      passwordHash,
      role: UserRole.CLIENT,
      locale: (dto.locale ?? invitation.locale ?? 'fr').toLowerCase(),
      firstName: dto.firstName ?? invitation.firstName,
      lastName: dto.lastName ?? invitation.lastName,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);

    invitation.status = ClientInvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    invitation.acceptedUserId = savedUser.id;

    await this.invitationRepository.save(invitation);

    await this.auditService.create({
      workspaceId: invitation.workspaceId,
      actorId: savedUser.id,
      action: 'CLIENT_INVITATION_ACCEPTED',
      resourceType: 'ClientInvitation',
      resourceId: invitation.id,
      metadata: { email: invitation.email },
    });

    return this.authService.createSessionForUser(savedUser);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createExpiryDate(): Date {
    const expiryDaysRaw = this.configService.get<number>(
      'CLIENT_INVITATION_EXPIRY_DAYS',
      7,
    );
    const expiryDays = Math.min(30, Math.max(1, expiryDaysRaw));

    return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  }

  private buildInvitationUrl(token: string, locale: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    const normalizedBase = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;

    return `${normalizedBase}/${locale}/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  private async resolvePendingInvitation(
    token: string,
  ): Promise<ClientInvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: {
        tokenHash: this.hashToken(token),
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== ClientInvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not active');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      invitation.status = ClientInvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  private assertAdmin(user: AuthUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage invitations');
    }
  }

  private serializeInvitation(invitation: ClientInvitationEntity) {
    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      locale: invitation.locale,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    };
  }
}

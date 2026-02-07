import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientInvitationStatus,
  ProjectStatus,
  UserRole,
} from '../../common/enums';
import {
  ClientInvitationEntity,
  ProjectEntity,
  UserEntity,
} from '../../database/entities';

export interface ClientDetailsStats {
  totalProjects: number;
  activeProjects: number;
  waitingProjects: number;
  completedProjects: number;
  averageProgress: number;
  lastProjectUpdateAt: Date | null;
}

export interface ClientInvitationStats {
  pendingInvitations: number;
  acceptedInvitations: number;
  revokedInvitations: number;
  expiredInvitations: number;
  latestInvitationAt: Date | null;
}

export interface ClientDetailsPayload {
  id: string;
  email: string;
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats: ClientDetailsStats;
  invitationStats: ClientInvitationStats;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(ClientInvitationEntity)
    private readonly invitationsRepository: Repository<ClientInvitationEntity>,
  ) {}

  async findByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { workspaceId, email: email.toLowerCase() },
    });
  }

  async findByIdOrFail(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIds(workspaceId: string, ids: string[]): Promise<UserEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.workspace_id = :workspaceId', { workspaceId })
      .andWhere('user.id IN (:...ids)', { ids })
      .getMany();
  }

  async listWorkspaceUsers(workspaceId: string): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { workspaceId, isActive: true },
    });
  }

  async listWorkspaceClients(
    workspaceId: string,
    options: { limit: number; search?: string },
  ): Promise<UserEntity[]> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('user.workspace_id = :workspaceId', { workspaceId })
      .andWhere('user.role = :role', { role: UserRole.CLIENT })
      .andWhere('user.isActive = true');

    if (options.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user."firstName" ILIKE :search OR user."lastName" ILIKE :search)',
        {
          search: `%${options.search}%`,
        },
      );
    }

    return qb.orderBy('user.createdAt', 'DESC').limit(options.limit).getMany();
  }

  async findActiveByEmail(email: string): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getWorkspaceClientDetails(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientDetailsPayload> {
    const client = await this.usersRepository.findOne({
      where: {
        id: clientId,
        workspaceId,
        role: UserRole.CLIENT,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const [projectStats, invitationStats] = await Promise.all([
      this.getWorkspaceClientProjectStats(workspaceId, clientId),
      this.getWorkspaceClientInvitationStats(workspaceId, clientId, client.email),
    ]);

    return {
      id: client.id,
      email: client.email,
      locale: client.locale,
      firstName: client.firstName,
      lastName: client.lastName,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      stats: projectStats,
      invitationStats,
    };
  }

  private async getWorkspaceClientProjectStats(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientDetailsStats> {
    const raw = await this.projectsRepository
      .createQueryBuilder('project')
      .select('COUNT(project.id)', 'totalProjects')
      .addSelect(
        'SUM(CASE WHEN project.status != :completedStatus THEN 1 ELSE 0 END)',
        'activeProjects',
      )
      .addSelect(
        'SUM(CASE WHEN project.status = :waitingStatus THEN 1 ELSE 0 END)',
        'waitingProjects',
      )
      .addSelect(
        'SUM(CASE WHEN project.status = :completedStatus THEN 1 ELSE 0 END)',
        'completedProjects',
      )
      .addSelect('ROUND(COALESCE(AVG(project.progress), 0))', 'averageProgress')
      .addSelect('MAX(project.updated_at)', 'lastProjectUpdateAt')
      .where('project.workspace_id = :workspaceId', { workspaceId })
      .andWhere('project.client_id = :clientId', { clientId })
      .setParameters({
        waitingStatus: ProjectStatus.WAITING_CLIENT,
        completedStatus: ProjectStatus.COMPLETED,
      })
      .getRawOne<{
        totalProjects?: string | null;
        activeProjects?: string | null;
        waitingProjects?: string | null;
        completedProjects?: string | null;
        averageProgress?: string | null;
        lastProjectUpdateAt?: Date | string | null;
      }>();

    return {
      totalProjects: Number.parseInt(raw?.totalProjects ?? '0', 10),
      activeProjects: Number.parseInt(raw?.activeProjects ?? '0', 10),
      waitingProjects: Number.parseInt(raw?.waitingProjects ?? '0', 10),
      completedProjects: Number.parseInt(raw?.completedProjects ?? '0', 10),
      averageProgress: Number.parseInt(raw?.averageProgress ?? '0', 10),
      lastProjectUpdateAt: raw?.lastProjectUpdateAt
        ? new Date(raw.lastProjectUpdateAt)
        : null,
    };
  }

  private async getWorkspaceClientInvitationStats(
    workspaceId: string,
    clientId: string,
    email: string,
  ): Promise<ClientInvitationStats> {
    const raw = await this.invitationsRepository
      .createQueryBuilder('invitation')
      .select(
        'SUM(CASE WHEN invitation.status = :pendingStatus THEN 1 ELSE 0 END)',
        'pendingInvitations',
      )
      .addSelect(
        'SUM(CASE WHEN invitation.status = :acceptedStatus THEN 1 ELSE 0 END)',
        'acceptedInvitations',
      )
      .addSelect(
        'SUM(CASE WHEN invitation.status = :revokedStatus THEN 1 ELSE 0 END)',
        'revokedInvitations',
      )
      .addSelect(
        'SUM(CASE WHEN invitation.status = :expiredStatus THEN 1 ELSE 0 END)',
        'expiredInvitations',
      )
      .addSelect('MAX(invitation.created_at)', 'latestInvitationAt')
      .where('invitation.workspace_id = :workspaceId', { workspaceId })
      .andWhere(
        '(invitation.accepted_user_id = :clientId OR LOWER(invitation.email) = LOWER(:email))',
        {
          clientId,
          email,
        },
      )
      .setParameters({
        pendingStatus: ClientInvitationStatus.PENDING,
        acceptedStatus: ClientInvitationStatus.ACCEPTED,
        revokedStatus: ClientInvitationStatus.REVOKED,
        expiredStatus: ClientInvitationStatus.EXPIRED,
      })
      .getRawOne<{
        pendingInvitations?: string | null;
        acceptedInvitations?: string | null;
        revokedInvitations?: string | null;
        expiredInvitations?: string | null;
        latestInvitationAt?: Date | string | null;
      }>();

    return {
      pendingInvitations: Number.parseInt(raw?.pendingInvitations ?? '0', 10),
      acceptedInvitations: Number.parseInt(raw?.acceptedInvitations ?? '0', 10),
      revokedInvitations: Number.parseInt(raw?.revokedInvitations ?? '0', 10),
      expiredInvitations: Number.parseInt(raw?.expiredInvitations ?? '0', 10),
      latestInvitationAt: raw?.latestInvitationAt
        ? new Date(raw.latestInvitationAt)
        : null,
    };
  }
}

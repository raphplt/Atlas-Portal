import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities';
import type { AuthUser } from '../../common/types/auth-user.type';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UserRole } from '../../common/enums';

interface AuditInput {
  workspaceId: string;
  projectId?: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditRepository: Repository<AuditEventEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
  ) {}

  async create(input: AuditInput): Promise<AuditEventEntity> {
    const event = this.auditRepository.create({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
    });

    return this.auditRepository.save(event);
  }

  async listByProject(
    user: AuthUser,
    projectId: string,
    limit: number,
  ): Promise<AuditEventEntity[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Project not found');
    }

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException('Project access denied');
    }

    return this.auditRepository
      .createQueryBuilder('event')
      .where('event.workspace_id = :workspaceId', {
        workspaceId: user.workspaceId,
      })
      .andWhere('event.project_id = :projectId', { projectId })
      .orderBy('event.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MilestoneType, TaskStatus, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  AdminNoteEntity,
  AuditEventEntity,
  FileAssetEntity,
  MessageEntity,
  MilestoneValidationEntity,
  PaymentEntity,
  ProjectEntity,
  ProjectTabReadEntity,
  TaskEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ValidateMilestoneDto } from './dto/validate-milestone.dto';
import {
  isProjectNotificationTab,
  ProjectNotificationTab,
} from './project-notification-tabs';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepository: Repository<TaskEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketsRepository: Repository<TicketEntity>,
    @InjectRepository(MessageEntity)
    private readonly messagesRepository: Repository<MessageEntity>,
    @InjectRepository(FileAssetEntity)
    private readonly filesRepository: Repository<FileAssetEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEventsRepository: Repository<AuditEventEntity>,
    @InjectRepository(AdminNoteEntity)
    private readonly adminNotesRepository: Repository<AdminNoteEntity>,
    @InjectRepository(MilestoneValidationEntity)
    private readonly milestoneRepository: Repository<MilestoneValidationEntity>,
    @InjectRepository(ProjectTabReadEntity)
    private readonly projectTabReadRepository: Repository<ProjectTabReadEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(user: AuthUser, dto: CreateProjectDto): Promise<ProjectEntity> {
    const client = await this.usersRepository.findOne({
      where: {
        id: dto.clientId,
        workspaceId: user.workspaceId,
        role: UserRole.CLIENT,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found in workspace');
    }

    const project = this.projectsRepository.create({
      workspaceId: user.workspaceId,
      clientId: dto.clientId,
      name: dto.name,
      description: dto.description,
      nextAction: dto.nextAction,
      progress: dto.progress ?? 0,
      estimatedDeliveryAt: dto.estimatedDeliveryAt,
      lastUpdateAuthorId: user.id,
    });

    const savedProject = await this.projectsRepository.save(project);

    const milestones = Object.values(MilestoneType).map((type) =>
      this.milestoneRepository.create({
        workspaceId: user.workspaceId,
        projectId: savedProject.id,
        type,
      }),
    );
    await this.milestoneRepository.save(milestones);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: savedProject.id,
      actorId: user.id,
      action: 'PROJECT_CREATED',
      resourceType: 'Project',
      resourceId: savedProject.id,
      metadata: { name: savedProject.name },
    });

    return savedProject;
  }

  async list(user: AuthUser, query: ProjectQueryDto): Promise<ProjectEntity[]> {
    const qb = this.projectsRepository.createQueryBuilder('project');

    qb.where('project.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });

    if (user.role === UserRole.CLIENT) {
      qb.andWhere('project.client_id = :clientId', { clientId: user.id });
    }

    if (query.clientId) {
      qb.andWhere('project.client_id = :clientIdFilter', {
        clientIdFilter: query.clientId,
      });
    }

    if (query.status) {
      qb.andWhere('project.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(project.name ILIKE :search OR project.description ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.orderBy('project.created_at', 'DESC').limit(query.limit);

    const projects = await qb.getMany();

    // Compute progress from task completion instead of manual field
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      const taskStats: { projectId: string; total: string; done: string }[] =
        await this.tasksRepository
          .createQueryBuilder('task')
          .select('task.project_id', 'projectId')
          .addSelect('COUNT(*)', 'total')
          .addSelect(
            "COUNT(CASE WHEN task.status = 'DONE' THEN 1 END)",
            'done',
          )
          .where('task.project_id IN (:...projectIds)', { projectIds })
          .groupBy('task.project_id')
          .getRawMany();

      const statsMap = new Map(taskStats.map((s) => [s.projectId, s]));
      for (const project of projects) {
        const stats = statsMap.get(project.id);
        if (stats && Number(stats.total) > 0) {
          project.progress = Math.round(
            (Number(stats.done) * 100) / Number(stats.total),
          );
        }
      }
    }

    return projects;
  }

  async getById(user: AuthUser, projectId: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Project not found');
    }

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException('Project is not accessible');
    }

    return project;
  }

  async update(
    user: AuthUser,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.getById(user, projectId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can update project');
    }

    Object.assign(project, dto, { lastUpdateAuthorId: user.id });
    const updated = await this.projectsRepository.save(project);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId,
      actorId: user.id,
      action: 'PROJECT_UPDATED',
      resourceType: 'Project',
      resourceId: projectId,
      metadata: { ...dto },
    });

    return updated;
  }

  async remove(user: AuthUser, projectId: string): Promise<{ success: true }> {
    const project = await this.getById(user, projectId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can delete project');
    }

    await this.projectsRepository.remove(project);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      actorId: user.id,
      action: 'PROJECT_DELETED',
      resourceType: 'Project',
      resourceId: projectId,
      metadata: {
        name: project.name,
        clientId: project.clientId,
      },
    });

    return { success: true };
  }

  async getDashboard(user: AuthUser, projectId: string) {
    const project = await this.getById(user, projectId);

    const [openTasksCount, doneTasksCount, blockedTasksCount, lastTask] =
      await Promise.all([
        this.tasksRepository.count({
          where: { workspaceId: user.workspaceId, projectId: project.id },
        }),
        this.tasksRepository.count({
          where: {
            workspaceId: user.workspaceId,
            projectId: project.id,
            status: TaskStatus.DONE,
          },
        }),
        this.tasksRepository.count({
          where: {
            workspaceId: user.workspaceId,
            projectId: project.id,
            status: TaskStatus.BLOCKED_BY_CLIENT,
          },
        }),
        this.tasksRepository.findOne({
          where: { workspaceId: user.workspaceId, projectId: project.id },
          order: { updatedAt: 'DESC' },
        }),
      ]);

    const completionRate =
      openTasksCount === 0
        ? 0
        : Math.round((doneTasksCount / openTasksCount) * 100);

    return {
      project: {
        ...project,
        progress: completionRate,
      } as ProjectEntity,
      summary: {
        totalTasks: openTasksCount,
        doneTasks: doneTasksCount,
        blockedTasks: blockedTasksCount,
        completionRate,
      },
      latestUpdate: lastTask
        ? {
            at: lastTask.updatedAt,
            type: 'TASK',
            title: lastTask.title,
          }
        : null,
    };
  }

  async getTabNotifications(user: AuthUser, projectId: string) {
    await this.getById(user, projectId);

    const tabReads = await this.projectTabReadRepository.find({
      where: {
        workspaceId: user.workspaceId,
        projectId,
        userId: user.id,
      },
    });

    const lastReadByTab = new Map(
      tabReads.map((tabRead) => [tabRead.tabKey, tabRead.lastReadAt]),
    );
    const getLastReadAt = (tab: ProjectNotificationTab) =>
      lastReadByTab.get(tab) ?? new Date(0);

    const [
      tasksCount,
      ticketsCount,
      messagesCount,
      filesCount,
      paymentsCount,
      milestonesCount,
      activityCount,
      adminNotesCount,
    ] = await Promise.all([
      this.tasksRepository.count({
        where: {
          workspaceId: user.workspaceId,
          projectId,
          updatedAt: MoreThan(getLastReadAt('tasks')),
        },
      }),
      this.ticketsRepository.count({
        where: {
          workspaceId: user.workspaceId,
          projectId,
          isDeleted: false,
          updatedAt: MoreThan(getLastReadAt('tickets')),
        },
      }),
      this.messagesRepository
        .createQueryBuilder('message')
        .where('message.workspace_id = :workspaceId', {
          workspaceId: user.workspaceId,
        })
        .andWhere('message.project_id = :projectId', { projectId })
        .andWhere('message.created_at > :lastReadAt', {
          lastReadAt: getLastReadAt('messages'),
        })
        .andWhere('message.author_id != :userId', { userId: user.id })
        .getCount(),
      this.filesRepository.count({
        where: {
          workspaceId: user.workspaceId,
          projectId,
          isDeleted: false,
          isUploaded: true,
          updatedAt: MoreThan(getLastReadAt('files')),
        },
      }),
      this.paymentsRepository.count({
        where: {
          workspaceId: user.workspaceId,
          projectId,
          updatedAt: MoreThan(getLastReadAt('payments')),
        },
      }),
      this.milestoneRepository.count({
        where: {
          workspaceId: user.workspaceId,
          projectId,
          updatedAt: MoreThan(getLastReadAt('milestones')),
        },
      }),
      this.auditEventsRepository
        .createQueryBuilder('event')
        .where('event.workspace_id = :workspaceId', {
          workspaceId: user.workspaceId,
        })
        .andWhere('event.project_id = :projectId', { projectId })
        .andWhere('event.created_at > :lastReadAt', {
          lastReadAt: getLastReadAt('activity'),
        })
        .andWhere('(event.actor_id IS NULL OR event.actor_id != :userId)', {
          userId: user.id,
        })
        .getCount(),
      user.role !== UserRole.ADMIN
        ? Promise.resolve(0)
        : this.adminNotesRepository
            .createQueryBuilder('note')
            .where('note.workspace_id = :workspaceId', {
              workspaceId: user.workspaceId,
            })
            .andWhere('note.project_id = :projectId', { projectId })
            .andWhere('note.created_at > :lastReadAt', {
              lastReadAt: getLastReadAt('admin-notes'),
            })
            .andWhere('note.author_id != :userId', { userId: user.id })
            .getCount(),
    ]);

    const counts: Record<ProjectNotificationTab, number> = {
      tasks: tasksCount,
      tickets: ticketsCount,
      messages: messagesCount,
      files: filesCount,
      payments: paymentsCount,
      milestones: milestonesCount,
      activity: activityCount,
      'admin-notes': adminNotesCount,
    };

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    return { counts, total };
  }

  async markTabAsRead(user: AuthUser, projectId: string, tab: string) {
    if (!isProjectNotificationTab(tab)) {
      throw new BadRequestException('Invalid project tab');
    }

    await this.assertTabNotificationAccess(user, projectId, tab);

    const now = new Date();
    const existingRead = await this.projectTabReadRepository.findOne({
      where: {
        workspaceId: user.workspaceId,
        projectId,
        userId: user.id,
        tabKey: tab,
      },
    });

    if (existingRead) {
      existingRead.lastReadAt = now;
      await this.projectTabReadRepository.save(existingRead);
    } else {
      const createdRead = this.projectTabReadRepository.create({
        workspaceId: user.workspaceId,
        projectId,
        userId: user.id,
        tabKey: tab,
        lastReadAt: now,
      });
      await this.projectTabReadRepository.save(createdRead);
    }

    return { success: true, tab, lastReadAt: now };
  }

  async upsertMilestoneValidation(
    user: AuthUser,
    projectId: string,
    dto: ValidateMilestoneDto,
  ): Promise<MilestoneValidationEntity> {
    await this.getById(user, projectId);

    const current = await this.milestoneRepository.findOne({
      where: {
        workspaceId: user.workspaceId,
        projectId,
        type: dto.type,
      },
    });

    if (!current) {
      throw new NotFoundException('Milestone record not found');
    }

    const now = new Date();

    if (user.role === UserRole.ADMIN) {
      if (dto.validated) {
        current.validatedByAdminId = user.id;
        current.validatedByAdminAt = now;
        current.adminComment = dto.comment ?? null;
      } else {
        current.validatedByAdminId = null;
        current.validatedByAdminAt = null;
        current.adminComment = null;
      }
    } else {
      // CLIENT
      if (dto.validated) {
        current.validatedByClientId = user.id;
        current.validatedByClientAt = now;
        current.clientComment = dto.comment ?? null;
      } else {
        current.validatedByClientId = null;
        current.validatedByClientAt = null;
        current.clientComment = null;
      }
    }

    // Fully validated only when both parties have signed off
    current.validated =
      !!current.validatedByAdminAt && !!current.validatedByClientAt;

    // Keep legacy fields in sync for backward compat
    current.validatedAt = current.validated ? now : null;
    current.validatedById = current.validated ? user.id : null;
    current.comment = dto.comment ?? current.comment;

    const updated = await this.milestoneRepository.save(current);

    const actionSuffix = user.role === UserRole.ADMIN ? 'ADMIN' : 'CLIENT';
    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId,
      actorId: user.id,
      action: dto.validated
        ? `MILESTONE_VALIDATED_BY_${actionSuffix}`
        : `MILESTONE_UNVALIDATED_BY_${actionSuffix}`,
      resourceType: 'MilestoneValidation',
      resourceId: updated.id,
      metadata: {
        type: dto.type,
        comment: dto.comment ?? null,
        fullyValidated: updated.validated,
      },
    });

    return updated;
  }

  async listMilestones(
    user: AuthUser,
    projectId: string,
  ): Promise<MilestoneValidationEntity[]> {
    await this.getById(user, projectId);

    return this.milestoneRepository.find({
      where: {
        workspaceId: user.workspaceId,
        projectId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  private async assertTabNotificationAccess(
    user: AuthUser,
    projectId: string,
    tab: ProjectNotificationTab,
  ): Promise<void> {
    await this.getById(user, projectId);

    if (tab === 'admin-notes' && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin notes are private to admins');
    }
  }
}

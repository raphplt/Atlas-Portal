import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneType, TaskStatus, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  MilestoneValidationEntity,
  ProjectEntity,
  TaskEntity,
  UserEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ValidateMilestoneDto } from './dto/validate-milestone.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepository: Repository<TaskEntity>,
    @InjectRepository(MilestoneValidationEntity)
    private readonly milestoneRepository: Repository<MilestoneValidationEntity>,
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

    return qb.getMany();
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

    return {
      project,
      summary: {
        totalTasks: openTasksCount,
        doneTasks: doneTasksCount,
        blockedTasks: blockedTasksCount,
        completionRate:
          openTasksCount === 0
            ? 0
            : Math.round((doneTasksCount / openTasksCount) * 100),
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

    current.validated = dto.validated;
    current.comment = dto.comment;
    current.validatedAt = dto.validated ? new Date() : null;
    current.validatedById = dto.validated ? user.id : null;

    const updated = await this.milestoneRepository.save(current);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId,
      actorId: user.id,
      action: dto.validated ? 'MILESTONE_VALIDATED' : 'MILESTONE_UNVALIDATED',
      resourceType: 'MilestoneValidation',
      resourceId: updated.id,
      metadata: { type: dto.type, comment: dto.comment ?? null },
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
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSource, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import { ProjectEntity, TaskEntity } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  async list(user: AuthUser, query: TaskQueryDto): Promise<TaskEntity[]> {
    const qb = this.taskRepository.createQueryBuilder('task');

    qb.innerJoin(ProjectEntity, 'project', 'project.id = task.project_id');
    qb.where('task.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });

    if (user.role === UserRole.CLIENT) {
      qb.andWhere('project.client_id = :clientId', { clientId: user.id });
    }

    if (query.projectId) {
      qb.andWhere('task.project_id = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.source) {
      qb.andWhere('task.source = :source', { source: query.source });
    }

    if (query.search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    return qb
      .orderBy('task.position', 'ASC')
      .addOrderBy('task.created_at', 'ASC')
      .limit(query.limit)
      .getMany();
  }

  async create(user: AuthUser, dto: CreateTaskDto): Promise<TaskEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create tasks');
    }

    await this.projectsService.getById(user, dto.projectId);

    const position = await this.taskRepository.count({
      where: { workspaceId: user.workspaceId, projectId: dto.projectId },
    });

    const task = this.taskRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      source: dto.source ?? TaskSource.CORE,
      blockedReason: dto.blockedReason,
      position,
    });

    const saved = await this.taskRepository.save(task);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'TASK_CREATED',
      resourceType: 'Task',
      resourceId: saved.id,
      metadata: { source: saved.source, status: saved.status },
    });

    return saved;
  }

  async update(
    user: AuthUser,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update tasks');
    }

    Object.assign(task, dto);
    const updated = await this.taskRepository.save(task);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: task.projectId,
      actorId: user.id,
      action: 'TASK_UPDATED',
      resourceType: 'Task',
      resourceId: task.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async createFromTicket(
    user: AuthUser,
    input: { projectId: string; title: string; description: string },
  ): Promise<TaskEntity> {
    await this.projectsService.getById(user, input.projectId);

    const position = await this.taskRepository.count({
      where: { workspaceId: user.workspaceId, projectId: input.projectId },
    });

    const task = this.taskRepository.create({
      workspaceId: user.workspaceId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      source: TaskSource.TICKET,
      position,
    });

    return this.taskRepository.save(task);
  }

  async ensureProjectBelongsToWorkspace(
    projectId: string,
    workspaceId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found');
    }
  }
}

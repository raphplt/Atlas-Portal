import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSource, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  FileAssetEntity,
  MilestoneValidationEntity,
  ProjectEntity,
  TaskChecklistItemEntity,
  TaskEntity,
} from '../../database/entities';
import { escapeIlike } from '../../common/utils/search.util';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(TaskChecklistItemEntity)
    private readonly checklistRepository: Repository<TaskChecklistItemEntity>,
    @InjectRepository(FileAssetEntity)
    private readonly fileRepository: Repository<FileAssetEntity>,
    @InjectRepository(MilestoneValidationEntity)
    private readonly milestoneRepository: Repository<MilestoneValidationEntity>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  async list(user: AuthUser, query: TaskQueryDto) {
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
          search: `%${escapeIlike(query.search)}%`,
        },
      );
    }

    const tasks = await qb
      .orderBy('task.position', 'ASC')
      .addOrderBy('task.created_at', 'ASC')
      .limit(query.limit)
      .getMany();

    if (tasks.length === 0) return [];

    // Fetch checklist counts for all tasks
    const taskIds = tasks.map((t) => t.id);
    const checklistCounts = await this.checklistRepository
      .createQueryBuilder('cl')
      .select('cl.task_id', 'taskId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN cl.completed THEN 1 ELSE 0 END)', 'done')
      .where('cl.task_id IN (:...taskIds)', { taskIds })
      .groupBy('cl.task_id')
      .getRawMany<{ taskId: string; total: string; done: string }>();

    const countMap = new Map(
      checklistCounts.map((c) => [
        c.taskId,
        { total: parseInt(c.total, 10), done: parseInt(c.done, 10) },
      ]),
    );

    return tasks.map((t) => {
      const counts = countMap.get(t.id) ?? { total: 0, done: 0 };
      return {
        ...t,
        checklistTotal: counts.total,
        checklistDone: counts.done,
      };
    });
  }

  async getById(user: AuthUser, taskId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    // Access check for clients
    if (user.role === UserRole.CLIENT) {
      await this.projectsService.getById(user, task.projectId);
    }

    // Checklist counts
    const checklistCounts = await this.checklistRepository
      .createQueryBuilder('cl')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN cl.completed THEN 1 ELSE 0 END)', 'done')
      .where('cl.task_id = :taskId', { taskId })
      .getRawOne<{ total: string; done: string }>();

    // Files linked to this task
    const files = await this.fileRepository.find({
      where: {
        taskId,
        workspaceId: user.workspaceId,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Milestone validation if applicable
    let milestoneValidation: MilestoneValidationEntity | null = null;
    if (task.milestoneType) {
      milestoneValidation = await this.milestoneRepository.findOne({
        where: {
          workspaceId: user.workspaceId,
          projectId: task.projectId,
          type: task.milestoneType,
        },
      });
    }

    return {
      ...task,
      checklistTotal: parseInt(checklistCounts?.total ?? '0', 10),
      checklistDone: parseInt(checklistCounts?.done ?? '0', 10),
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        category: f.category,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        versionLabel: f.versionLabel,
        isUploaded: f.isUploaded,
        isDeleted: f.isDeleted,
        noteCount: 0,
        createdAt: f.createdAt,
      })),
      milestoneValidation,
    };
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
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      milestoneType: dto.milestoneType,
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

    // Handle dueDate conversion
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      delete (dto as Record<string, unknown>).dueDate;
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

  async remove(user: AuthUser, taskId: string): Promise<{ success: true }> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete tasks');
    }

    // Don't allow deleting milestone tasks
    if (task.milestoneType) {
      throw new ForbiddenException('Milestone tasks cannot be deleted');
    }

    await this.taskRepository.delete(taskId);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: task.projectId,
      actorId: user.id,
      action: 'TASK_DELETED',
      resourceType: 'Task',
      resourceId: taskId,
      metadata: { title: task.title },
    });

    return { success: true };
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

  async reorder(user: AuthUser, dto: ReorderTasksDto): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reorder tasks');
    }

    await this.projectsService.getById(user, dto.projectId);

    // Run all updates in a transaction for atomicity
    await this.taskRepository.manager.transaction(async (manager) => {
      for (const item of dto.items) {
        await manager.update(
          TaskEntity,
          { id: item.id, workspaceId: user.workspaceId },
          { status: item.status, position: item.position },
        );
      }
    });

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'TASKS_REORDERED',
      resourceType: 'Task',
      resourceId: dto.projectId,
      metadata: { count: dto.items.length },
    });
  }

  /* ─── Checklist ─── */

  async listChecklist(
    user: AuthUser,
    taskId: string,
  ): Promise<TaskChecklistItemEntity[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    if (user.role === UserRole.CLIENT) {
      await this.projectsService.getById(user, task.projectId);
    }

    return this.checklistRepository.find({
      where: { taskId, workspaceId: user.workspaceId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async addChecklistItem(
    user: AuthUser,
    taskId: string,
    dto: CreateChecklistItemDto,
  ): Promise<TaskChecklistItemEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage checklist items');
    }

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    const position = await this.checklistRepository.count({
      where: { taskId, workspaceId: user.workspaceId },
    });

    const item = this.checklistRepository.create({
      workspaceId: user.workspaceId,
      taskId,
      title: dto.title,
      position,
    });

    return this.checklistRepository.save(item);
  }

  async updateChecklistItem(
    user: AuthUser,
    taskId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<TaskChecklistItemEntity> {
    // Admin-only for title/position changes, but allow client to toggle completion
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Task not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update checklist items');
    }

    const item = await this.checklistRepository.findOne({
      where: { id: itemId, taskId, workspaceId: user.workspaceId },
    });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    Object.assign(item, dto);
    return this.checklistRepository.save(item);
  }

  async removeChecklistItem(
    user: AuthUser,
    taskId: string,
    itemId: string,
  ): Promise<{ success: true }> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete checklist items');
    }

    const item = await this.checklistRepository.findOne({
      where: { id: itemId, taskId, workspaceId: user.workspaceId },
    });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    await this.checklistRepository.delete(itemId);
    return { success: true };
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

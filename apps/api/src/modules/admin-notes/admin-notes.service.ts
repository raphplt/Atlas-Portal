import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import { AdminNoteEntity } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { UpdateAdminNoteDto } from './dto/update-admin-note.dto';

@Injectable()
export class AdminNotesService {
  constructor(
    @InjectRepository(AdminNoteEntity)
    private readonly notesRepository: Repository<AdminNoteEntity>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  async list(user: AuthUser, projectId: string): Promise<AdminNoteEntity[]> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin notes are private to admins');
    }

    await this.projectsService.getById(user, projectId);

    return this.notesRepository.find({
      where: { workspaceId: user.workspaceId, projectId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async create(
    user: AuthUser,
    dto: CreateAdminNoteDto,
  ): Promise<AdminNoteEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create admin notes');
    }

    await this.projectsService.getById(user, dto.projectId);

    const note = this.notesRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      authorId: user.id,
      content: dto.content,
    });

    const saved = await this.notesRepository.save(note);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'ADMIN_NOTE_CREATED',
      resourceType: 'AdminNote',
      resourceId: saved.id,
    });

    return saved;
  }

  async update(
    user: AuthUser,
    noteId: string,
    dto: UpdateAdminNoteDto,
  ): Promise<AdminNoteEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update admin notes');
    }

    const note = await this.notesRepository.findOne({ where: { id: noteId } });
    if (!note || note.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Admin note not found');
    }

    note.content = dto.content;
    const updated = await this.notesRepository.save(note);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: note.projectId,
      actorId: user.id,
      action: 'ADMIN_NOTE_UPDATED',
      resourceType: 'AdminNote',
      resourceId: note.id,
    });

    return updated;
  }

  async delete(user: AuthUser, noteId: string): Promise<{ success: true }> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete admin notes');
    }

    const note = await this.notesRepository.findOne({ where: { id: noteId } });
    if (!note || note.workspaceId !== user.workspaceId) {
      throw new NotFoundException('Admin note not found');
    }

    await this.notesRepository.delete(note.id);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: note.projectId,
      actorId: user.id,
      action: 'ADMIN_NOTE_DELETED',
      resourceType: 'AdminNote',
      resourceId: note.id,
    });

    return { success: true };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  FileAssetEntity,
  FileNoteEntity,
  MessageEntity,
  TaskEntity,
  TicketEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';
import { FileCategory } from '../../common/enums';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateFileNoteDto } from './dto/create-file-note.dto';
import { FileQueryDto } from './dto/file-query.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
];

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly fileRepository: Repository<FileAssetEntity>,
    @InjectRepository(FileNoteEntity)
    private readonly fileNoteRepository: Repository<FileNoteEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async createUploadUrl(user: AuthUser, dto: CreateUploadUrlDto) {
    const project = await this.projectsService.getById(user, dto.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'FILE_NOT_FOUND',
        message: 'Project access denied',
      });
    }

    const maxUploadSizeMb = this.configService.get<number>(
      'MAX_UPLOAD_SIZE_MB',
      20,
    );
    const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;

    if (dto.sizeBytes > maxUploadSizeBytes) {
      throw new BadRequestException({
        code: 'FILE_INVALID_TYPE',
        message: `File size exceeds ${maxUploadSizeMb}MB`,
      });
    }

    // Validate ticket/message belong to same project & workspace
    if (dto.ticketId) {
      const ticket = await this.ticketRepository.findOne({
        where: { id: dto.ticketId },
      });
      if (
        !ticket ||
        ticket.workspaceId !== user.workspaceId ||
        ticket.projectId !== dto.projectId
      ) {
        throw new BadRequestException({
          code: 'FILE_INVALID_REFERENCE',
          message: 'Ticket not found or does not belong to this project',
        });
      }
    }

    if (dto.taskId) {
      const task = await this.taskRepository.findOne({
        where: { id: dto.taskId },
      });
      if (
        !task ||
        task.workspaceId !== user.workspaceId ||
        task.projectId !== dto.projectId
      ) {
        throw new BadRequestException({
          code: 'FILE_INVALID_REFERENCE',
          message: 'Task not found or does not belong to this project',
        });
      }
    }

    if (dto.messageId) {
      const message = await this.messageRepository.findOne({
        where: { id: dto.messageId },
      });
      if (
        !message ||
        message.workspaceId !== user.workspaceId ||
        message.projectId !== dto.projectId
      ) {
        throw new BadRequestException({
          code: 'FILE_INVALID_REFERENCE',
          message: 'Message not found or does not belong to this project',
        });
      }
    }

    const key = `${user.workspaceId}/${dto.projectId}/${randomUUID()}-${dto.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const file = this.fileRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      uploaderId: user.id,
      category: dto.category,
      originalName: dto.originalName,
      key,
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      ticketId: dto.ticketId,
      taskId: dto.taskId,
      messageId: dto.messageId,
      versionLabel: dto.versionLabel,
      isUploaded: false,
    });

    const saved = await this.fileRepository.save(file);
    const uploadUrl = await this.storageService.createSignedUploadUrl({
      key,
      contentType: dto.contentType,
    });

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'FILE_UPLOAD_URL_CREATED',
      resourceType: 'FileAsset',
      resourceId: saved.id,
      metadata: { originalName: dto.originalName, sizeBytes: dto.sizeBytes },
    });

    return {
      fileId: saved.id,
      key,
      uploadUrl,
      expiresInSeconds: 900,
    };
  }

  async upload(
    user: AuthUser,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    projectId: string,
    category: string,
  ): Promise<FileAssetEntity> {
    const project = await this.projectsService.getById(user, projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'FILE_NOT_FOUND',
        message: 'Project access denied',
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'FILE_INVALID_TYPE',
        message: 'This file type is not allowed',
      });
    }

    const maxUploadSizeMb = this.configService.get<number>(
      'MAX_UPLOAD_SIZE_MB',
      20,
    );
    if (file.size > maxUploadSizeMb * 1024 * 1024) {
      throw new BadRequestException({
        code: 'FILE_INVALID_TYPE',
        message: `File size exceeds ${maxUploadSizeMb}MB`,
      });
    }

    const fileCategory = Object.values(FileCategory).includes(
      category as FileCategory,
    )
      ? (category as FileCategory)
      : FileCategory.OTHER;

    const key = `${user.workspaceId}/${projectId}/${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    await this.storageService.uploadFile(key, file.buffer, file.mimetype);

    const record = this.fileRepository.create({
      workspaceId: user.workspaceId,
      projectId,
      uploaderId: user.id,
      category: fileCategory,
      originalName: file.originalname,
      key,
      contentType: file.mimetype,
      sizeBytes: file.size,
      isUploaded: true,
    });

    const saved = await this.fileRepository.save(record);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId,
      actorId: user.id,
      action: 'FILE_UPLOADED',
      resourceType: 'FileAsset',
      resourceId: saved.id,
      metadata: { originalName: file.originalname, sizeBytes: file.size },
    });

    return saved;
  }

  async completeUpload(
    user: AuthUser,
    fileId: string,
    dto: CompleteUploadDto,
  ): Promise<FileAssetEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file || file.workspaceId !== user.workspaceId || file.isDeleted) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    if (user.role === UserRole.CLIENT && file.uploaderId !== user.id) {
      await this.projectsService.getById(user, file.projectId);
    }

    file.isUploaded = true;
    file.checksum = dto.checksum;

    const saved = await this.fileRepository.save(file);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: file.projectId,
      actorId: user.id,
      action: 'FILE_UPLOADED',
      resourceType: 'FileAsset',
      resourceId: file.id,
      metadata: { key: file.key },
    });

    return saved;
  }

  async list(user: AuthUser, query: FileQueryDto) {
    await this.projectsService.getById(user, query.projectId);

    const qb = this.fileRepository.createQueryBuilder('file');
    qb.where('file.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });
    qb.andWhere('file.project_id = :projectId', { projectId: query.projectId });
    qb.andWhere('file.is_deleted = false');

    if (query.category) {
      qb.andWhere('file.category = :category', { category: query.category });
    }

    if (query.taskId) {
      qb.andWhere('file.task_id = :taskId', { taskId: query.taskId });
    }

    const files = await qb
      .orderBy('file.created_at', 'DESC')
      .limit(query.limit)
      .getMany();

    if (files.length === 0) return [];

    const noteCounts = await this.fileNoteRepository
      .createQueryBuilder('note')
      .select('note.file_id', 'fileId')
      .addSelect('COUNT(*)', 'count')
      .where('note.file_id IN (:...fileIds)', {
        fileIds: files.map((f) => f.id),
      })
      .groupBy('note.file_id')
      .getRawMany<{ fileId: string; count: string }>();

    const countMap = new Map(
      noteCounts.map((nc) => [nc.fileId, parseInt(nc.count, 10)]),
    );

    return files.map((f) => ({
      ...f,
      noteCount: countMap.get(f.id) ?? 0,
    }));
  }

  async getDownloadUrl(
    user: AuthUser,
    fileId: string,
  ): Promise<{ downloadUrl: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (
      !file ||
      file.workspaceId !== user.workspaceId ||
      file.isDeleted ||
      !file.isUploaded
    ) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    await this.projectsService.getById(user, file.projectId);

    const downloadUrl = await this.storageService.createSignedDownloadUrl(
      file.key,
    );

    return { downloadUrl };
  }

  async softDelete(user: AuthUser, fileId: string): Promise<{ success: true }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file || file.workspaceId !== user.workspaceId || file.isDeleted) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FILE_NOT_FOUND',
        message: 'Only admins can delete files',
      });
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    await this.fileRepository.save(file);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: file.projectId,
      actorId: user.id,
      action: 'FILE_DELETED',
      resourceType: 'FileAsset',
      resourceId: file.id,
    });

    return { success: true };
  }

  /* ─── File Notes ─── */

  async listNotes(user: AuthUser, fileId: string) {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file || file.workspaceId !== user.workspaceId || file.isDeleted) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    await this.projectsService.getById(user, file.projectId);

    const notes = await this.fileNoteRepository.find({
      where: { fileId, workspaceId: user.workspaceId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      take: 100,
    });

    return notes.map((note) => ({
      id: note.id,
      fileId: note.fileId,
      authorId: note.authorId,
      authorName:
        [note.author.firstName, note.author.lastName]
          .filter(Boolean)
          .join(' ') || note.author.email,
      authorRole: note.author.role,
      content: note.content,
      createdAt: note.createdAt,
    }));
  }

  async createNote(user: AuthUser, fileId: string, dto: CreateFileNoteDto) {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file || file.workspaceId !== user.workspaceId || file.isDeleted) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    await this.projectsService.getById(user, file.projectId);

    const note = this.fileNoteRepository.create({
      workspaceId: user.workspaceId,
      fileId,
      authorId: user.id,
      content: dto.content,
    });

    const saved = await this.fileNoteRepository.save(note);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: file.projectId,
      actorId: user.id,
      action: 'FILE_NOTE_CREATED',
      resourceType: 'FileNote',
      resourceId: saved.id,
      metadata: { fileId },
    });

    return saved;
  }

  async deleteNote(user: AuthUser, noteId: string): Promise<{ success: true }> {
    const note = await this.fileNoteRepository.findOne({
      where: { id: noteId },
    });

    if (!note || note.workspaceId !== user.workspaceId) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'Note not found',
      });
    }

    // Only author or admin can delete
    if (user.role !== UserRole.ADMIN && note.authorId !== user.id) {
      throw new ForbiddenException({
        code: 'FILE_NOT_FOUND',
        message: 'You can only delete your own notes',
      });
    }

    const file = await this.fileRepository.findOne({
      where: { id: note.fileId },
    });

    await this.fileNoteRepository.delete(note.id);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: file?.projectId ?? '',
      actorId: user.id,
      action: 'FILE_NOTE_DELETED',
      resourceType: 'FileNote',
      resourceId: note.id,
      metadata: { fileId: note.fileId },
    });

    return { success: true };
  }
}

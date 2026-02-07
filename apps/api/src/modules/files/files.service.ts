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
import { FileAssetEntity } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { FileQueryDto } from './dto/file-query.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly fileRepository: Repository<FileAssetEntity>,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async createUploadUrl(user: AuthUser, dto: CreateUploadUrlDto) {
    const project = await this.projectsService.getById(user, dto.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException('Project access denied');
    }

    const maxUploadSizeMb = this.configService.get<number>(
      'MAX_UPLOAD_SIZE_MB',
      20,
    );
    const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;

    if (dto.sizeBytes > maxUploadSizeBytes) {
      throw new BadRequestException(`File size exceeds ${maxUploadSizeMb}MB`);
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

  async completeUpload(
    user: AuthUser,
    fileId: string,
    dto: CompleteUploadDto,
  ): Promise<FileAssetEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file || file.workspaceId !== user.workspaceId || file.isDeleted) {
      throw new NotFoundException('File not found');
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

  async list(user: AuthUser, query: FileQueryDto): Promise<FileAssetEntity[]> {
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

    return qb.orderBy('file.created_at', 'DESC').limit(query.limit).getMany();
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
      throw new NotFoundException('File not found');
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
      throw new NotFoundException('File not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete files');
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
}

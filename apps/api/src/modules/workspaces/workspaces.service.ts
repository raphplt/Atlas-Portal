import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '../../database/entities';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async findBySlug(slug: string): Promise<WorkspaceEntity | null> {
    return this.workspaceRepository.findOne({ where: { slug } });
  }

  async findByIdOrFail(id: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({ where: { id } });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async createWorkspace(
    data: Pick<WorkspaceEntity, 'name' | 'slug' | 'emailSenderName'>,
  ): Promise<WorkspaceEntity> {
    const entity = this.workspaceRepository.create(data);
    return this.workspaceRepository.save(entity);
  }
}

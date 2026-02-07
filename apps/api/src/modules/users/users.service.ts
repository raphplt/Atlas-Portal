import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { UserEntity } from '../../database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
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
}

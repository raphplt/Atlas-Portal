import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}

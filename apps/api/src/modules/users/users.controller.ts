import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { UserQueryDto } from './dto/user-query.dto';
import { ClientDetailsPayload, UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('clients')
  @Roles(UserRole.ADMIN)
  async listClients(
    @CurrentUser() user: AuthUser,
    @Query() query: UserQueryDto,
  ) {
    const users = await this.usersService.listWorkspaceClients(
      user.workspaceId,
      {
        limit: query.limit,
        search: query.search,
      },
    );

    return users.map((client) => ({
      id: client.id,
      email: client.email,
      locale: client.locale,
      firstName: client.firstName,
      lastName: client.lastName,
      createdAt: client.createdAt,
    }));
  }

  @Get('clients/:id')
  @Roles(UserRole.ADMIN)
  getClientDetails(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) clientId: string,
  ): Promise<ClientDetailsPayload> {
    return this.usersService.getWorkspaceClientDetails(user.workspaceId, clientId);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const currentUser = await this.usersService.findByIdOrFail(user.id);

    return {
      id: currentUser.id,
      workspaceId: currentUser.workspaceId,
      email: currentUser.email,
      role: currentUser.role,
      locale: currentUser.locale,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      isActive: currentUser.isActive,
      createdAt: currentUser.createdAt,
      updatedAt: currentUser.updatedAt,
    };
  }
}

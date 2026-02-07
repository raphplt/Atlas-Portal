import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { setAuthCookies } from '../../common/utils/cookie.util';
import { AuthService } from '../auth/auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  list(@CurrentUser() user: AuthUser, @Query() query: InvitationQueryDto) {
    return this.invitationsService.list(user, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(user, dto);
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  revoke(@CurrentUser() user: AuthUser, @Param('id') invitationId: string) {
    return this.invitationsService.revoke(user, invitationId);
  }

  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.invitationsService.getPublicInvitation(token);
  }

  @Post('public/:token/accept')
  async acceptPublic(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.invitationsService.acceptPublicInvitation(
      token,
      dto,
    );
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.authService.getAccessTtlSeconds(),
      this.authService.getRefreshTtlDays(),
    );
    const { accessToken: _a, refreshToken: _r, ...body } = result;
    return body;
  }
}

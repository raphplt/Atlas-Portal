import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('projects/:projectId')
  listProjectAudit(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditService.listByProject(user, projectId, query.limit);
  }
}

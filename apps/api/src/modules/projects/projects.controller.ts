import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ValidateMilestoneDto } from './dto/validate-milestone.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ProjectQueryDto) {
    return this.projectsService.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') projectId: string) {
    return this.projectsService.getById(user, projectId);
  }

  @Get(':id/dashboard')
  dashboard(@CurrentUser() user: AuthUser, @Param('id') projectId: string) {
    return this.projectsService.getDashboard(user, projectId);
  }

  @Get(':id/milestones')
  milestones(@CurrentUser() user: AuthUser, @Param('id') projectId: string) {
    return this.projectsService.listMilestones(user, projectId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user, projectId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') projectId: string) {
    return this.projectsService.remove(user, projectId);
  }

  @Post(':id/milestones/validate')
  validateMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
    @Body() dto: ValidateMilestoneDto,
  ) {
    return this.projectsService.upsertMilestoneValidation(user, projectId, dto);
  }
}

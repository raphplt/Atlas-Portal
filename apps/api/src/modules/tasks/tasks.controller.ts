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
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: TaskQueryDto) {
    return this.tasksService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') taskId: string) {
    return this.tasksService.getById(user, taskId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Patch('reorder')
  @Roles(UserRole.ADMIN)
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderTasksDto) {
    return this.tasksService.reorder(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, taskId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') taskId: string) {
    return this.tasksService.remove(user, taskId);
  }

  /* ─── Checklist ─── */

  @Get(':id/checklist')
  listChecklist(@CurrentUser() user: AuthUser, @Param('id') taskId: string) {
    return this.tasksService.listChecklist(user, taskId);
  }

  @Post(':id/checklist')
  @Roles(UserRole.ADMIN)
  addChecklistItem(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.tasksService.addChecklistItem(user, taskId, dto);
  }

  @Patch(':id/checklist/:itemId')
  @Roles(UserRole.ADMIN)
  updateChecklistItem(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.tasksService.updateChecklistItem(user, taskId, itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @Roles(UserRole.ADMIN)
  removeChecklistItem(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.tasksService.removeChecklistItem(user, taskId, itemId);
  }
}

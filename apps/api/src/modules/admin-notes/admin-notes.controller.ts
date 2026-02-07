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
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { UpdateAdminNoteDto } from './dto/update-admin-note.dto';
import { AdminNotesService } from './admin-notes.service';

@Controller('admin-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminNotesController {
  constructor(private readonly adminNotesService: AdminNotesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId: string) {
    return this.adminNotesService.list(user, projectId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAdminNoteDto) {
    return this.adminNotesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') noteId: string,
    @Body() dto: UpdateAdminNoteDto,
  ) {
    return this.adminNotesService.update(user, noteId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') noteId: string) {
    return this.adminNotesService.delete(user, noteId);
  }
}

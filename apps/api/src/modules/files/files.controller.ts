import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateFileNoteDto } from './dto/create-file-note.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: FileQueryDto) {
    return this.filesService.list(user, query);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { projectId: string; category?: string },
  ) {
    if (!file) {
      throw new BadRequestException({ code: 'FILE_NOT_FOUND', message: 'No file provided' });
    }
    return this.filesService.upload(
      user,
      file,
      body.projectId,
      body.category ?? 'OTHER',
    );
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('upload-url')
  createUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.filesService.createUploadUrl(user, dto);
  }

  @Post(':id/complete')
  completeUpload(
    @CurrentUser() user: AuthUser,
    @Param('id') fileId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.filesService.completeUpload(user, fileId, dto);
  }

  @Get(':id/download-url')
  getDownloadUrl(@CurrentUser() user: AuthUser, @Param('id') fileId: string) {
    return this.filesService.getDownloadUrl(user, fileId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') fileId: string) {
    return this.filesService.softDelete(user, fileId);
  }

  /* ─── File Notes ─── */

  @Get(':id/notes')
  listNotes(@CurrentUser() user: AuthUser, @Param('id') fileId: string) {
    return this.filesService.listNotes(user, fileId);
  }

  @Post(':id/notes')
  createNote(
    @CurrentUser() user: AuthUser,
    @Param('id') fileId: string,
    @Body() dto: CreateFileNoteDto,
  ) {
    return this.filesService.createNote(user, fileId, dto);
  }

  @Delete('notes/:noteId')
  deleteNote(@CurrentUser() user: AuthUser, @Param('noteId') noteId: string) {
    return this.filesService.deleteNote(user, noteId);
  }
}

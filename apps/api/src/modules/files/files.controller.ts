import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
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

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FileAssetEntity,
  FileNoteEntity,
  MessageEntity,
  TaskEntity,
  TicketEntity,
} from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { ProjectsModule } from '../projects/projects.module';
import { StorageModule } from '../storage/storage.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileAssetEntity,
      FileNoteEntity,
      TaskEntity,
      TicketEntity,
      MessageEntity,
    ]),
    ProjectsModule,
    AuditModule,
    StorageModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
})
export class FilesModule {}

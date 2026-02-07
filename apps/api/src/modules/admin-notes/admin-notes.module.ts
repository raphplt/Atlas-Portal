import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminNoteEntity } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { ProjectsModule } from '../projects/projects.module';
import { AdminNotesController } from './admin-notes.controller';
import { AdminNotesService } from './admin-notes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminNoteEntity]),
    ProjectsModule,
    AuditModule,
  ],
  providers: [AdminNotesService],
  controllers: [AdminNotesController],
})
export class AdminNotesModule {}

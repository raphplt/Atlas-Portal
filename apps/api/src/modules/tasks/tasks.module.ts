import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FileAssetEntity,
  MilestoneValidationEntity,
  ProjectEntity,
  TaskChecklistItemEntity,
  TaskEntity,
} from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskChecklistItemEntity,
      ProjectEntity,
      FileAssetEntity,
      MilestoneValidationEntity,
    ]),
    AuditModule,
    ProjectsModule,
  ],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}

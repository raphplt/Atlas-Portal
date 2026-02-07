import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminNoteEntity,
  AuditEventEntity,
  FileAssetEntity,
  MessageEntity,
  MilestoneValidationEntity,
  PaymentEntity,
  ProjectEntity,
  ProjectTabReadEntity,
  TaskEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      UserEntity,
      TaskEntity,
      TicketEntity,
      MessageEntity,
      FileAssetEntity,
      PaymentEntity,
      AuditEventEntity,
      AdminNoteEntity,
      MilestoneValidationEntity,
      ProjectTabReadEntity,
    ]),
    AuditModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}

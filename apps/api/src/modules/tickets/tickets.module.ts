import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PaymentEntity,
  ProjectEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketEntity,
      ProjectEntity,
      PaymentEntity,
      UserEntity,
    ]),
    ProjectsModule,
    TasksModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}

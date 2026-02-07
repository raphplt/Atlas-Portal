import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MessageEntity,
  ProjectEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      ProjectEntity,
      TicketEntity,
      UserEntity,
    ]),
    ProjectsModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [MessagesGateway, MessagesService],
  controllers: [MessagesController],
  exports: [MessagesGateway],
})
export class MessagesModule {}

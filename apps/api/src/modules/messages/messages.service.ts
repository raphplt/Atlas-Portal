import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  MessageEntity,
  ProjectEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messagesRepository: Repository<MessageEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketsRepository: Repository<TicketEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: AuthUser, query: MessageQueryDto): Promise<MessageEntity[]> {
    await this.projectsService.getById(user, query.projectId);

    const qb = this.messagesRepository.createQueryBuilder('message');
    qb.where('message.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });
    qb.andWhere('message.project_id = :projectId', {
      projectId: query.projectId,
    });

    if (query.ticketId) {
      qb.andWhere('message.ticket_id = :ticketId', {
        ticketId: query.ticketId,
      });
    } else {
      qb.andWhere('message.ticket_id IS NULL');
    }

    return qb
      .orderBy('message.created_at', 'DESC')
      .limit(query.limit)
      .getMany();
  }

  async create(user: AuthUser, dto: CreateMessageDto): Promise<MessageEntity> {
    const project = await this.projectsService.getById(user, dto.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException('Project access denied');
    }

    if (dto.ticketId) {
      const ticket = await this.ticketsRepository.findOne({
        where: { id: dto.ticketId },
      });
      if (
        !ticket ||
        ticket.projectId !== dto.projectId ||
        ticket.workspaceId !== user.workspaceId
      ) {
        throw new NotFoundException('Ticket not found for this project');
      }
    }

    const message = this.messagesRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      ticketId: dto.ticketId,
      authorId: user.id,
      body: dto.body,
    });

    const saved = await this.messagesRepository.save(message);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: dto.ticketId ? 'TICKET_MESSAGE_SENT' : 'PROJECT_MESSAGE_SENT',
      resourceType: 'Message',
      resourceId: saved.id,
      metadata: dto.ticketId ? { ticketId: dto.ticketId } : {},
    });

    const recipients = await this.resolveRecipients(project, user.id);
    const subject = dto.ticketId
      ? `New ticket message - ${project.name}`
      : `New project message - ${project.name}`;

    await Promise.all(
      recipients.map((recipient) =>
        this.notificationsService.send({
          to: recipient.email,
          subject,
          textBody: dto.body,
        }),
      ),
    );

    return saved;
  }

  private async resolveRecipients(
    project: ProjectEntity,
    authorId: string,
  ): Promise<UserEntity[]> {
    const qb = this.usersRepository.createQueryBuilder('user');
    qb.where('user.workspace_id = :workspaceId', {
      workspaceId: project.workspaceId,
    });
    qb.andWhere('user.id != :authorId', { authorId });
    qb.andWhere('(user.role = :adminRole OR user.id = :clientId)', {
      adminRole: UserRole.ADMIN,
      clientId: project.clientId,
    });

    return qb.getMany();
  }
}

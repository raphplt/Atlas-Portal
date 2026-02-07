import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentStatus, TicketStatus, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  PaymentEntity,
  ProjectEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { TicketActionDto } from './dto/ticket-action.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';

/** Valid status transitions for ticket actions. */
const ALLOWED_ACCEPT_FROM = [TicketStatus.OPEN, TicketStatus.NEEDS_INFO];
const ALLOWED_REJECT_FROM = [
  TicketStatus.OPEN,
  TicketStatus.NEEDS_INFO,
  TicketStatus.ACCEPTED,
];
const ALLOWED_NEEDS_INFO_FROM = [TicketStatus.OPEN, TicketStatus.ACCEPTED];
const ALLOWED_REQUEST_PAYMENT_FROM = [
  TicketStatus.OPEN,
  TicketStatus.NEEDS_INFO,
  TicketStatus.ACCEPTED,
];
const ALLOWED_CONVERT_FROM = [TicketStatus.ACCEPTED, TicketStatus.PAID];

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: AuthUser, query: TicketQueryDto): Promise<TicketEntity[]> {
    const qb = this.ticketRepository.createQueryBuilder('ticket');

    qb.innerJoin(ProjectEntity, 'project', 'project.id = ticket.project_id');
    qb.where('ticket.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });
    qb.andWhere('ticket.is_deleted = false');

    if (user.role === UserRole.CLIENT) {
      qb.andWhere('project.client_id = :clientId', { clientId: user.id });
    }

    if (query.projectId) {
      qb.andWhere('ticket.project_id = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('ticket.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere(
        '(ticket.title ILIKE :search OR ticket.description ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.orderBy('ticket.created_at', 'DESC').limit(query.limit);

    return qb.getMany();
  }

  async getById(user: AuthUser, ticketId: string): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (
      !ticket ||
      ticket.workspaceId !== user.workspaceId ||
      ticket.isDeleted
    ) {
      throw new NotFoundException({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found',
      });
    }

    const project = await this.projectsService.getById(user, ticket.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket is not accessible',
      });
    }

    return ticket;
  }

  async create(user: AuthUser, dto: CreateTicketDto): Promise<TicketEntity> {
    const project = await this.projectsService.getById(user, dto.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'TICKET_NOT_FOUND',
        message: 'Cannot create ticket for this project',
      });
    }

    const ticket = this.ticketRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      createdById: user.id,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      requiresPayment: false,
      status: TicketStatus.OPEN,
    });

    const saved = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'TICKET_CREATED',
      resourceType: 'Ticket',
      resourceId: saved.id,
      metadata: { type: saved.type, status: saved.status },
    });

    return saved;
  }

  async accept(user: AuthUser, ticketId: string): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can accept tickets');
    }

    if (ticket.status === TicketStatus.CONVERTED) {
      return ticket;
    }

    if (!ALLOWED_ACCEPT_FROM.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: `Cannot accept ticket in status ${ticket.status}`,
      });
    }

    if (ticket.requiresPayment || (ticket.priceCents ?? 0) > 0) {
      ticket.status = TicketStatus.PAYMENT_REQUIRED;
      const updated = await this.ticketRepository.save(ticket);

      // Ensure a linked pending payment exists
      const existingPayment = await this.paymentRepository.findOne({
        where: {
          ticketId: ticket.id,
          workspaceId: user.workspaceId,
          status: PaymentStatus.PENDING,
        },
      });
      if (!existingPayment) {
        const payment = this.paymentRepository.create({
          workspaceId: user.workspaceId,
          projectId: ticket.projectId,
          ticketId: ticket.id,
          createdById: user.id,
          title: `Ticket: ${ticket.title}`,
          description: ticket.paymentDescription ?? null,
          amountCents: ticket.priceCents ?? 0,
          currency: 'EUR',
          status: PaymentStatus.PENDING,
        });
        await this.paymentRepository.save(payment);
      }

      await this.auditService.create({
        workspaceId: user.workspaceId,
        projectId: ticket.projectId,
        actorId: user.id,
        action: 'TICKET_ACCEPTED_PAYMENT_REQUIRED',
        resourceType: 'Ticket',
        resourceId: ticket.id,
      });

      return updated;
    }

    ticket.status = TicketStatus.ACCEPTED;
    const accepted = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_ACCEPTED',
      resourceType: 'Ticket',
      resourceId: ticket.id,
    });

    return this.convertToTask(user, accepted.id);
  }

  async reject(
    user: AuthUser,
    ticketId: string,
    dto?: TicketActionDto,
  ): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can reject tickets');
    }

    if (!ALLOWED_REJECT_FROM.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: `Cannot reject ticket in status ${ticket.status}`,
      });
    }

    ticket.status = TicketStatus.REJECTED;
    ticket.statusReason = dto?.reason ?? null;
    const saved = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_REJECTED',
      resourceType: 'Ticket',
      resourceId: ticket.id,
      metadata: dto?.reason ? { reason: dto.reason } : {},
    });

    return saved;
  }

  async markNeedsInfo(
    user: AuthUser,
    ticketId: string,
    dto?: TicketActionDto,
  ): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can request more info');
    }

    if (!ALLOWED_NEEDS_INFO_FROM.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: `Cannot request info for ticket in status ${ticket.status}`,
      });
    }

    ticket.status = TicketStatus.NEEDS_INFO;
    ticket.statusReason = dto?.reason ?? null;
    const saved = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_NEEDS_INFO',
      resourceType: 'Ticket',
      resourceId: ticket.id,
      metadata: dto?.reason ? { reason: dto.reason } : {},
    });

    return saved;
  }

  async requestPayment(
    user: AuthUser,
    ticketId: string,
    dto: RequestPaymentDto,
  ): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can request payment');
    }

    if (!ALLOWED_REQUEST_PAYMENT_FROM.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: `Cannot request payment for ticket in status ${ticket.status}`,
      });
    }

    ticket.requiresPayment = true;
    ticket.priceCents = dto.priceCents;
    ticket.paymentDescription = dto.description ?? null;
    ticket.status = TicketStatus.PAYMENT_REQUIRED;

    const saved = await this.ticketRepository.save(ticket);

    // Create the linked PaymentEntity so the client can actually pay
    const payment = this.paymentRepository.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      createdById: user.id,
      title: `Ticket: ${ticket.title}`,
      description: dto.description ?? null,
      amountCents: dto.priceCents,
      currency: dto.currency?.toUpperCase() ?? 'EUR',
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_PAYMENT_REQUESTED',
      resourceType: 'Ticket',
      resourceId: ticket.id,
      metadata: { priceCents: dto.priceCents, paymentId: payment.id },
    });

    // Notify the client
    const project = await this.projectRepository.findOne({
      where: { id: ticket.projectId },
    });
    if (project) {
      const client = await this.usersRepository.findOne({
        where: { id: project.clientId },
      });
      if (client) {
        await this.notificationsService.send({
          to: client.email,
          subject: `Payment required – ${ticket.title}`,
          textBody: `A payment of ${(dto.priceCents / 100).toFixed(2)} EUR is required for ticket "${ticket.title}". Please log in to proceed.`,
        });
      }
    }

    return saved;
  }

  async markPaid(user: AuthUser, ticketId: string): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (
      ![TicketStatus.PAYMENT_REQUIRED, TicketStatus.PAID].includes(
        ticket.status,
      )
    ) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: 'Ticket is not awaiting payment',
      });
    }

    ticket.status = TicketStatus.PAID;
    const saved = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_PAID',
      resourceType: 'Ticket',
      resourceId: ticket.id,
    });

    return saved;
  }

  async markPaidAndConvertBySystem(
    workspaceId: string,
    ticketId: string,
  ): Promise<TicketEntity | null> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket || ticket.workspaceId !== workspaceId || ticket.isDeleted) {
      return null;
    }

    ticket.status = TicketStatus.PAID;
    const paid = await this.ticketRepository.save(ticket);

    const systemUser: AuthUser = {
      id: paid.createdById,
      workspaceId,
      role: UserRole.ADMIN,
      email: 'system@atlas-portal.local',
    };

    return this.convertToTask(systemUser, paid.id);
  }

  async convertToTask(user: AuthUser, ticketId: string): Promise<TicketEntity> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can convert tickets');
    }

    if (ticket.convertedTaskId) {
      ticket.status = TicketStatus.CONVERTED;
      return this.ticketRepository.save(ticket);
    }

    // P0.2: OPEN removed — only ACCEPTED or PAID tickets can be converted
    if (!ALLOWED_CONVERT_FROM.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'TICKET_INVALID_TRANSITION',
        message: 'Ticket cannot be converted in current status',
      });
    }

    if ((ticket.priceCents ?? 0) > 0 && ticket.status !== TicketStatus.PAID) {
      throw new BadRequestException({
        code: 'TICKET_PAYMENT_PENDING',
        message: 'Paid ticket must be marked as PAID before conversion',
      });
    }

    const task = await this.tasksService.createFromTicket(user, {
      projectId: ticket.projectId,
      title: ticket.title,
      description: ticket.description,
    });

    ticket.convertedTaskId = task.id;
    ticket.status = TicketStatus.CONVERTED;

    const saved = await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_CONVERTED_TO_TASK',
      resourceType: 'Ticket',
      resourceId: ticket.id,
      metadata: { taskId: task.id },
    });

    return saved;
  }

  async softDelete(
    user: AuthUser,
    ticketId: string,
  ): Promise<{ success: true }> {
    const ticket = await this.getById(user, ticketId);

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can delete tickets');
    }

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    await this.ticketRepository.save(ticket);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: ticket.projectId,
      actorId: user.id,
      action: 'TICKET_DELETED',
      resourceType: 'Ticket',
      resourceId: ticket.id,
    });

    return { success: true };
  }

  async assertProjectAccess(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== user.workspaceId) {
      throw new NotFoundException({
        code: 'TICKET_NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'TICKET_NOT_FOUND',
        message: 'Project access denied',
      });
    }

    return project;
  }
}

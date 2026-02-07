import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { PaymentStatus, TicketStatus, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  PaymentEntity,
  ProjectEntity,
  StripeEventEntity,
  TicketEntity,
  UserEntity,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe?: Stripe;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketsRepository: Repository<TicketEntity>,
    @InjectRepository(StripeEventEntity)
    private readonly stripeEventsRepository: Repository<StripeEventEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly ticketsService: TicketsService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  async list(user: AuthUser, query: PaymentQueryDto): Promise<PaymentEntity[]> {
    const project = await this.projectsService.getById(user, query.projectId);
    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Project access denied',
      });
    }

    const qb = this.paymentRepository.createQueryBuilder('payment');
    qb.where('payment.workspace_id = :workspaceId', {
      workspaceId: user.workspaceId,
    });
    qb.andWhere('payment.project_id = :projectId', {
      projectId: query.projectId,
    });

    if (query.ticketId) {
      qb.andWhere('payment.ticket_id = :ticketId', {
        ticketId: query.ticketId,
      });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    return qb
      .orderBy('payment.created_at', 'DESC')
      .limit(query.limit)
      .getMany();
  }

  async create(user: AuthUser, dto: CreatePaymentDto): Promise<PaymentEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Only admins can create payment requests',
      });
    }

    await this.projectsService.getById(user, dto.projectId);

    if (dto.ticketId) {
      const ticket = await this.ticketsRepository.findOne({
        where: { id: dto.ticketId },
      });
      if (
        !ticket ||
        ticket.workspaceId !== user.workspaceId ||
        ticket.projectId !== dto.projectId
      ) {
        throw new BadRequestException({
          code: 'PAYMENT_NOT_FOUND',
          message: 'Ticket not found for this project',
        });
      }

      ticket.status = TicketStatus.PAYMENT_REQUIRED;
      ticket.requiresPayment = true;
      ticket.priceCents = dto.amountCents;
      await this.ticketsRepository.save(ticket);
    }

    const payment = this.paymentRepository.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      ticketId: dto.ticketId,
      createdById: user.id,
      title: dto.title,
      description: dto.description,
      amountCents: dto.amountCents,
      currency: dto.currency?.toUpperCase() ?? 'EUR',
      dueAt: dto.dueAt,
      status: PaymentStatus.PENDING,
    });

    const saved = await this.paymentRepository.save(payment);

    await this.auditService.create({
      workspaceId: user.workspaceId,
      projectId: dto.projectId,
      actorId: user.id,
      action: 'PAYMENT_REQUEST_CREATED',
      resourceType: 'Payment',
      resourceId: saved.id,
      metadata: { amountCents: saved.amountCents, ticketId: saved.ticketId },
    });

    const project = await this.projectsRepository.findOne({
      where: { id: dto.projectId },
    });
    if (project) {
      const client = await this.usersRepository.findOne({
        where: { id: project.clientId },
      });
      if (client) {
        await this.notificationsService.send({
          to: client.email,
          subject: `Payment request - ${dto.title}`,
          textBody: `A new payment request is available: ${dto.title}`,
        });
      }
    }

    return saved;
  }

  async cancel(
    user: AuthUser,
    paymentId: string,
  ): Promise<PaymentEntity> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Only admins can cancel payment requests',
      });
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment || payment.workspaceId !== user.workspaceId) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException({
        code: 'PAYMENT_NOT_PENDING',
        message: 'Only pending payments can be canceled',
      });
    }

    payment.status = PaymentStatus.CANCELED;
    const saved = await this.paymentRepository.save(payment);

    // If linked to a ticket in PAYMENT_REQUIRED, revert ticket to ACCEPTED
    if (payment.ticketId) {
      const ticket = await this.ticketsRepository.findOne({
        where: { id: payment.ticketId },
      });
      if (ticket && ticket.status === TicketStatus.PAYMENT_REQUIRED) {
        ticket.status = TicketStatus.ACCEPTED;
        ticket.requiresPayment = false;
        ticket.priceCents = null as unknown as number;
        await this.ticketsRepository.save(ticket);
      }
    }

    await this.auditService.create({
      workspaceId: payment.workspaceId,
      projectId: payment.projectId,
      actorId: user.id,
      action: 'PAYMENT_CANCELED',
      resourceType: 'Payment',
      resourceId: payment.id,
    });

    return saved;
  }

  async createCheckoutSession(
    user: AuthUser,
    paymentId: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new InternalServerErrorException({
        code: 'PAYMENT_CHECKOUT_FAILED',
        message: 'Stripe is not configured',
      });
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment || payment.workspaceId !== user.workspaceId) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    const project = await this.projectsService.getById(user, payment.projectId);

    if (user.role === UserRole.CLIENT && project.clientId !== user.id) {
      throw new ForbiddenException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment is not accessible',
      });
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException({
        code: 'PAYMENT_ALREADY_PAID',
        message: 'Payment is not pending',
      });
    }

    // Resolve client info for Stripe pre-fill
    const client = await this.usersRepository.findOne({
      where: { id: project.clientId },
    });

    const webAppUrl =
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    const clientLocale =
      client?.locale?.toLowerCase() === 'en' ? 'en' : 'fr';
    const successUrl = `${webAppUrl}/${clientLocale}/payments/success`;
    const cancelUrl = `${webAppUrl}/${clientLocale}/payments/cancel`;

    const clientName = [client?.firstName, client?.lastName]
      .filter(Boolean)
      .join(' ');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: client?.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency.toLowerCase(),
            unit_amount: payment.amountCents,
            product_data: {
              name: payment.title,
              description: payment.description ?? undefined,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        workspaceId: payment.workspaceId,
        projectId: payment.projectId,
        ...(clientName ? { clientName } : {}),
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?project_id=${payment.projectId}`,
    });

    payment.stripeCheckoutSessionId = session.id;
    await this.paymentRepository.save(payment);

    if (!session.url) {
      throw new InternalServerErrorException({
        code: 'PAYMENT_CHECKOUT_FAILED',
        message: 'Stripe session URL is missing',
      });
    }

    return { url: session.url };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature?: string,
  ): Promise<{ received: true }> {
    if (!this.stripe) {
      throw new InternalServerErrorException({
        code: 'PAYMENT_CHECKOUT_FAILED',
        message: 'Stripe is not configured',
      });
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret || !signature) {
      throw new BadRequestException({
        code: 'PAYMENT_CHECKOUT_FAILED',
        message: 'Stripe webhook signature is missing',
      });
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException({
        code: 'PAYMENT_CHECKOUT_FAILED',
        message: 'Invalid Stripe signature',
      });
    }

    const alreadyProcessed = await this.stripeEventsRepository.findOne({
      where: { id: event.id },
    });
    if (alreadyProcessed) {
      return { received: true };
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this.handleCheckoutCompleted(session);
    }

    await this.stripeEventsRepository.save(
      this.stripeEventsRepository.create({
        id: event.id,
        eventType: event.type,
      }),
    );

    return { received: true };
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
      return;
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null;
    await this.paymentRepository.save(payment);

    await this.auditService.create({
      workspaceId: payment.workspaceId,
      projectId: payment.projectId,
      action: 'PAYMENT_RECEIVED',
      resourceType: 'Payment',
      resourceId: payment.id,
      metadata: { stripeCheckoutSessionId: session.id },
    });

    if (payment.ticketId) {
      await this.ticketsService.markPaidAndConvertBySystem(
        payment.workspaceId,
        payment.ticketId,
      );
    }
  }
}

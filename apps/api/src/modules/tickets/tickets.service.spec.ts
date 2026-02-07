import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketStatus, UserRole } from '../../common/enums';
import { ProjectEntity, TicketEntity } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const ticketRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const projectRepository = {
    findOne: jest.fn(),
  };

  const projectsService = {
    getById: jest.fn(),
  };

  const tasksService = {
    createFromTicket: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(TicketEntity),
          useValue: ticketRepository,
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: projectRepository,
        },
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('sets payment-required status when requesting payment', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'ticket-1',
      workspaceId: 'ws-1',
      projectId: 'project-1',
      requiresPayment: false,
      status: TicketStatus.OPEN,
    } as TicketEntity);

    ticketRepository.save.mockImplementation((entity: TicketEntity) => entity);

    const result = await service.requestPayment(
      {
        id: 'admin-1',
        workspaceId: 'ws-1',
        role: UserRole.ADMIN,
        email: 'admin@atlas.com',
      },
      'ticket-1',
      {
        priceCents: 15_000,
        description: 'Out-of-scope change',
      },
    );

    expect(result.status).toBe(TicketStatus.PAYMENT_REQUIRED);
    expect(result.priceCents).toBe(15_000);
    expect(result.requiresPayment).toBe(true);
  });

  it('blocks conversion when ticket requires payment but is not paid', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'ticket-2',
      workspaceId: 'ws-1',
      projectId: 'project-1',
      title: 'Fix visual bug',
      description: 'Footer alignment',
      status: TicketStatus.PAYMENT_REQUIRED,
      priceCents: 9_900,
      convertedTaskId: null,
      isDeleted: false,
    } as TicketEntity);

    await expect(
      service.convertToTask(
        {
          id: 'admin-1',
          workspaceId: 'ws-1',
          role: UserRole.ADMIN,
          email: 'admin@atlas.com',
        },
        'ticket-2',
      ),
    ).rejects.toThrow('Ticket cannot be converted in current status');
  });

  it('converts a paid ticket into a task', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'ticket-3',
      workspaceId: 'ws-1',
      projectId: 'project-1',
      title: 'Add testimonial section',
      description: 'Create section with slider',
      status: TicketStatus.PAID,
      priceCents: 12_000,
      convertedTaskId: null,
      isDeleted: false,
    } as TicketEntity);

    tasksService.createFromTicket.mockResolvedValue({ id: 'task-100' });
    ticketRepository.save.mockImplementation((entity: TicketEntity) => entity);

    const result = await service.convertToTask(
      {
        id: 'admin-1',
        workspaceId: 'ws-1',
        role: UserRole.ADMIN,
        email: 'admin@atlas.com',
      },
      'ticket-3',
    );

    expect(result.status).toBe(TicketStatus.CONVERTED);
    expect(result.convertedTaskId).toBe('task-100');
  });
});

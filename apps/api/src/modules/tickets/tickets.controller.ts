import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { TicketActionDto } from './dto/ticket-action.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: TicketQueryDto) {
    return this.ticketsService.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ticketsService.getById(user, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user, dto);
  }

  @Post(':id/accept')
  @Roles(UserRole.ADMIN)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ticketsService.accept(user, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TicketActionDto,
  ) {
    return this.ticketsService.reject(user, id, dto);
  }

  @Post(':id/needs-info')
  @Roles(UserRole.ADMIN)
  needsInfo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TicketActionDto,
  ) {
    return this.ticketsService.markNeedsInfo(user, id, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/request-payment')
  @Roles(UserRole.ADMIN)
  requestPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RequestPaymentDto,
  ) {
    return this.ticketsService.requestPayment(user, id, dto);
  }

  @Post(':id/convert-to-task')
  @Roles(UserRole.ADMIN)
  convertToTask(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ticketsService.convertToTask(user, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ticketsService.softDelete(user, id);
  }
}

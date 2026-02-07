import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto) {
    return this.paymentsService.list(user, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.cancel(user, paymentId);
  }

  @Post(':id/checkout-session')
  @UseGuards(JwtAuthGuard)
  createCheckoutSession(
    @CurrentUser() user: AuthUser,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.createCheckoutSession(user, paymentId);
  }

  @Post('webhooks/stripe')
  webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is required for Stripe webhook');
    }

    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}

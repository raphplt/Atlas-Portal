import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  clearAuthCookies,
  readRefreshCookie,
  setAuthCookies,
} from '../../common/utils/cookie.util';
import { AuthService } from './auth.service';
import { CreateClientDto } from './dto/create-client.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register-admin')
  async registerAdmin(
    @Body() dto: RegisterAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerAdmin(dto);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.authService.getAccessTtlSeconds(),
      this.authService.getRefreshTtlDays(),
    );
    const { accessToken: _a, refreshToken: _r, ...body } = result;
    return body;
  }

  @Post('login')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.authService.getAccessTtlSeconds(),
      this.authService.getRefreshTtlDays(),
    );
    const { accessToken: _a, refreshToken: _r, ...body } = result;
    return body;
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = readRefreshCookie(
      req.cookies as Record<string, string>,
    );
    if (!cookieToken) {
      clearAuthCookies(res);
      return { success: false };
    }

    const result = await this.authService.refreshByCookie(cookieToken);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.authService.getAccessTtlSeconds(),
      this.authService.getRefreshTtlDays(),
    );
    const { accessToken: _a, refreshToken: _r, ...body } = result;
    return body;
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = readRefreshCookie(
      req.cookies as Record<string, string>,
    );
    if (cookieToken) {
      await this.authService.logoutByCookie(cookieToken);
    }
    clearAuthCookies(res);
    return { success: true };
  }

  @Post('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createClient(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.authService.createClient(user, dto);
  }
}

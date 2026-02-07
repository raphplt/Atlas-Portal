import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserRole } from '../enums';
import type { AuthUser } from '../types/auth-user.type';
import { readAccessCookie } from '../utils/cookie.util';

interface AccessTokenPayload {
  sub: string;
  workspaceId: string;
  role: UserRole;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    // Try cookie first, then fall back to Authorization header
    const cookieToken = readAccessCookie(
      request.cookies as Record<string, string>,
    );
    const authorization = request.headers.authorization;
    const token =
      cookieToken ??
      (authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : undefined);

    if (!token) {
      throw new UnauthorizedException('Missing authentication');
    }

    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new UnauthorizedException('JWT access secret is not configured');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret },
      );
      request.user = {
        id: payload.sub,
        workspaceId: payload.workspaceId,
        role: payload.role,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

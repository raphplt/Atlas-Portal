import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  RefreshTokenEntity,
  UserEntity,
  WorkspaceEntity,
} from '../../database/entities';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateClientDto } from './dto/create-client.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  sub: string;
  workspaceId: string;
  role: UserRole;
  email: string;
  tokenId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async registerAdmin(dto: RegisterAdminDto) {
    const normalizedEmail = dto.adminEmail.toLowerCase();
    const slug = dto.workspaceSlug.toLowerCase();

    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { slug },
    });
    if (existingWorkspace) {
      throw new BadRequestException('Workspace slug already used');
    }

    const passwordHash = await argon2.hash(dto.password);

    const workspace = this.workspaceRepository.create({
      name: dto.workspaceName,
      slug,
      emailSenderName: dto.workspaceName,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    const user = this.userRepository.create({
      workspaceId: savedWorkspace.id,
      email: normalizedEmail,
      passwordHash,
      role: UserRole.ADMIN,
      locale: dto.locale ?? 'fr',
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    const tokens = await this.issueTokens(savedUser);

    return {
      workspace: {
        id: savedWorkspace.id,
        name: savedWorkspace.name,
        slug: savedWorkspace.slug,
      },
      user: this.serializeUser(savedUser),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const workspace = await this.workspacesService.findBySlug(
      dto.workspaceSlug.toLowerCase(),
    );

    if (!workspace) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.findByWorkspaceAndEmail(
      workspace.id,
      dto.email.toLowerCase(),
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      user: this.serializeUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new UnauthorizedException('Refresh token not configured');
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { id: payload.tokenId },
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const tokenValid = await argon2.verify(
      tokenRecord.tokenHash,
      dto.refreshToken,
    );

    if (!tokenValid) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const user = await this.usersService.findByIdOrFail(payload.sub);

    tokenRecord.revokedAt = new Date();
    await this.refreshTokenRepository.save(tokenRecord);

    const tokens = await this.issueTokens(user, tokenRecord.id);

    return {
      user: this.serializeUser(user),
      ...tokens,
    };
  }

  async logout(dto: RefreshTokenDto): Promise<{ success: true }> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      return { success: true };
    }

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        {
          secret: refreshSecret,
        },
      );

      await this.refreshTokenRepository.update(
        { id: payload.tokenId, revokedAt: IsNull() },
        {
          revokedAt: new Date(),
        },
      );
    } catch {
      // If token is already invalid, logout is considered successful.
    }

    return { success: true };
  }

  async createClient(authUser: AuthUser, dto: CreateClientDto) {
    if (authUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can create clients');
    }

    const existing = await this.usersService.findByWorkspaceAndEmail(
      authUser.workspaceId,
      dto.email,
    );

    if (existing) {
      throw new BadRequestException('Email already exists in workspace');
    }

    const passwordHash = await argon2.hash(dto.password);
    const client = this.userRepository.create({
      workspaceId: authUser.workspaceId,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: UserRole.CLIENT,
      locale: dto.locale ?? 'fr',
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
    });

    const saved = await this.userRepository.save(client);
    return this.serializeUser(saved);
  }

  private async issueTokens(
    user: UserEntity,
    previousTokenId?: string,
  ): Promise<TokenBundle> {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshDays = this.configService.get<number>(
      'JWT_REFRESH_TTL_DAYS',
      7,
    );

    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException('JWT secrets are not configured');
    }

    const tokenId = randomUUID();
    const payload = {
      sub: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: this.parseTokenTtlToSeconds(accessTtl),
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        tokenId,
      },
      {
        secret: refreshSecret,
        expiresIn: `${refreshDays}d`,
      },
    );

    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      id: tokenId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    if (previousTokenId) {
      await this.refreshTokenRepository.update(
        { id: previousTokenId },
        {
          replacedByTokenId: tokenId,
        },
      );
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  private serializeUser(user: UserEntity) {
    return {
      id: user.id,
      workspaceId: user.workspaceId,
      email: user.email,
      role: user.role,
      locale: user.locale,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private parseTokenTtlToSeconds(value: string): number {
    const match = value.trim().match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60;
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 24 * 60 * 60;
      default:
        return 15 * 60;
    }
  }
}

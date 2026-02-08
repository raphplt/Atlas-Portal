import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRole } from '../../common/enums';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    workspaceId: string;
    role: UserRole;
    email: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/ws',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      // Try cookie first, then query token
      const cookies = this.parseCookies(client.handshake.headers.cookie ?? '');
      const token =
        cookies['atlas.access'] ??
        (client.handshake.auth?.token as string | undefined);

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!secret) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        workspaceId: string;
        role: UserRole;
        email: string;
      }>(token, { secret });

      client.data = {
        userId: payload.sub,
        workspaceId: payload.workspaceId,
        role: payload.role,
        email: payload.email,
      };

      this.logger.debug(`Client connected: ${client.id} (${payload.email})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ): void {
    const room = `project:${data.projectId}`;
    void client.join(room);
    this.logger.debug(`${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ): void {
    const room = `project:${data.projectId}`;
    void client.leave(room);
    this.logger.debug(`${client.id} left room ${room}`);
  }

  /** Called from MessagesService after a message is persisted. */
  emitNewMessage(
    projectId: string,
    message: {
      id: string;
      authorId: string;
      body: string;
      ticketId?: string | null;
      createdAt: string;
    },
  ): void {
    const room = `project:${projectId}`;
    this.server.to(room).emit('newMessage', message);
  }

  private parseCookies(header: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const pair of header.split(';')) {
      const [key, ...rest] = pair.trim().split('=');
      if (key) {
        result[key] = rest.join('=');
      }
    }
    return result;
  }
}

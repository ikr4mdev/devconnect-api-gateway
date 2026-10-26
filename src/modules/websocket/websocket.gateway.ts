import { JwtTokenService, VerifiedJwtPayloadType } from '@/core';
import { Logger } from '@nestjs/common';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly MAX_TIMER_DELAY = 2_147_483_647;

  constructor(private readonly jwtTokenService: JwtTokenService) {}

  @WebSocketServer()
  server: Server;

  private scheduleExpiration(client: Socket, exp: number): void {
    const remaining = exp * 1000 - Date.now();

    if (remaining <= 0) {
      client.disconnect(true);
      return;
    }
    const delay = Math.min(remaining, this.MAX_TIMER_DELAY);

    const handle = setTimeout(() => {
      this.timers.delete(client.id);
      const stillRemaining = exp * 1000 - Date.now();

      if (stillRemaining <= 0) {
        this.timers.delete(client.id);
        client.disconnect(true);
      } else {
        this.scheduleExpiration(client, exp);
      }
    }, delay);

    this.timers.set(client.id, handle);
  }

  afterInit(server: Server) {
    server.use(async (client, next) => {
      const token = client.handshake.auth?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Unauthorized: missing or invalid token'));
      }

      try {
        const payload: VerifiedJwtPayloadType =
          await this.jwtTokenService.verifyToken(token);
        client.data.user = {
          sub: payload.sub,
          email: payload.email,
        };
        this.scheduleExpiration(client, payload.exp);

        next();
      } catch {
        this.logger.warn('WebSocket connection rejected: invalid token');
        next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`User connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const handle = this.timers.get(client.id);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(client.id);
    }

    this.logger.log(`User disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping_server')
  handlePingServer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
    @Ack() ack: (response: { message: string }) => void,
  ): void {
    ack({ message: data.message });

    client.emit('server_notification', {
      message: 'Ping processed on the server',
    });
  }

  @SubscribeMessage('join_demo_room')
  async handleJoinDemoRoom(
    @ConnectedSocket() client: Socket,
    @Ack() ack: (response: { joined: string }) => void,
  ): Promise<void> {
    await client.join('demo-room');

    ack({ joined: 'demo-room' });
  }

  @SubscribeMessage('send_to_demo_room')
  handleSendMsgToDemoRoom(@ConnectedSocket() client: Socket) {
    this.server.to('demo-room').emit('demo_room_message', {
      message: `Hello, demo room! to client: ${client.id}`,
    });
  }
}

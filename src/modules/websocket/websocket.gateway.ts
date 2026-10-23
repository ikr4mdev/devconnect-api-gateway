import { JwtPayloadType, JwtTokenService } from '@/core';
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
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use(async (client, next) => {
      const token = client.handshake.auth?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Unauthorized: missing or invalid token'));
      }

      try {
        const payload: JwtPayloadType =
          await this.jwtTokenService.verifyToken(token);
        client.data.user = payload;
        next();
      } catch {
        next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  handleConnection(client: Socket) {
    console.log('user connect: ', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('user disconnect: ', client.id);
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

jest.mock('@/core', () => ({
  JwtTokenService: class JwtTokenService {},
}));

import type { JwtTokenService } from '@/core';
import { Server, Socket } from 'socket.io';
import { WebsocketGateway } from './websocket.gateway';

type SocketMiddleware = Parameters<Server['use']>[0];

describe('WebsocketGateway', () => {
  let jwtTokenService: jest.Mocked<JwtTokenService>;
  let gateway: WebsocketGateway;
  let middleware: SocketMiddleware;

  beforeEach(() => {
    jest.useFakeTimers();

    jwtTokenService = {
      verifyToken: jest.fn(),
    } as unknown as jest.Mocked<JwtTokenService>;

    gateway = new WebsocketGateway(jwtTokenService);

    const mockServer = {
      use: jest.fn((fn: SocketMiddleware) => {
        middleware = fn;
      }),
    } as unknown as Server;

    gateway.afterInit(mockServer);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('disconnects the socket when the JWT expires', () => {
    const socket = {
      id: 'socket-1',
      disconnect: jest.fn(),
    } as unknown as Socket;

    const exp = Math.floor(Date.now() / 1000) + 2;

    (
      gateway as unknown as {
        scheduleExpiration(client: Socket, exp: number): void;
      }
    ).scheduleExpiration(socket, exp);

    jest.advanceTimersByTime(2_100);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects the handshake when the token is invalid', async () => {
    jwtTokenService.verifyToken.mockRejectedValue(
      new Error('Invalid or expired token.'),
    );

    const socket = {
      id: 'socket-1',
      handshake: { auth: { token: 'not-a-valid-jwt' } },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    const next = jest.fn<void, [Error?]>();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));

    expect(jwtTokenService.verifyToken).toHaveBeenCalledWith('not-a-valid-jwt');

    expect(socket.data.user).toBeUndefined();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});

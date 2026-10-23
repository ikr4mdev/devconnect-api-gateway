jest.mock('@/core', () => ({
  JwtTokenService: class JwtTokenService {},
  IS_PUBLIC_KEY: 'isPublic',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtTokenService } from '@/core';

function createHttpContext(request: any): ExecutionContext {
  const testHandler = () => {};
  class TestController {}
  return {
    getHandler: () => testHandler,
    getClass: () => TestController,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: JwtAuthGuard;
  let module: TestingModule;

  let jwtTokenService: {
    verifyToken: jest.Mock;
  };

  beforeEach(async () => {
    jwtTokenService = {
      verifyToken: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: JwtTokenService,
          useValue: jwtTokenService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    const request = { headers: {} };
    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(jwtTokenService.verifyToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when the verification service rejects the token', async () => {
    const request = {
      headers: { authorization: 'Bearer invalid-token' },
    };
    const context = createHttpContext(request);

    jwtTokenService.verifyToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired token.'),
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(jwtTokenService.verifyToken).toHaveBeenCalledWith('invalid-token');
  });

  it('should accept a valid JWT and attach the user to the request', async () => {
    const token = 'valid-token';
    const request = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = createHttpContext(request);

    jwtTokenService.verifyToken.mockResolvedValue({
      sub: 'test-user-id',
      email: 'test@example.com',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtTokenService.verifyToken).toHaveBeenCalledWith(token);
    expect(request).toHaveProperty('user', {
      sub: 'test-user-id',
      email: 'test@example.com',
    });
  });

  it('should allow public routes without a token', async () => {
    const request = { headers: {} };
    const context = createHttpContext(request);

    const reflector = module.get<Reflector>(Reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtTokenService.verifyToken).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});

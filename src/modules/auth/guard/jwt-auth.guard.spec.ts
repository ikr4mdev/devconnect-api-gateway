import { generateKeyPairSync } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import * as jose from 'jose';

jest.mock('../../../core', () => ({
  gatewayConfig: {
    jwtPublicKey: '',
    audience: 'gateway',
    issuer: 'devconnect',
  },
  IS_PUBLIC_KEY: 'isPublic',
}));

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

import { gatewayConfig } from '../../../core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  let guard: JwtAuthGuard;
  let module: TestingModule;

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const exportedKey = publicKey.export({
    type: 'spki',
    format: 'pem',
  });

  const publicKeyPem =
    typeof exportedKey === 'string' ? exportedKey : exportedKey.toString();

  (gatewayConfig as { jwtPublicKey: string }).jwtPublicKey = publicKeyPem;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    await guard.onModuleInit();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    const request = {
      headers: {},
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when JWT is invalid', async () => {
    const request = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should accept a valid JWT and attach the user to the request', async () => {
    const token = await new jose.SignJWT({
      email: 'test@example.com',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('test-user-id')
      .setIssuer('devconnect')
      .setAudience('gateway')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request).toHaveProperty('user', {
      sub: 'test-user-id',
      email: 'test@example.com',
    });
  });

  it('should reject a validly signed JWT with the wrong issuer', async () => {
    const token = await new jose.SignJWT({
      email: 'test@example.com',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('test-user-id')
      .setIssuer('untrusted-service')
      .setAudience('gateway')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const request = {
      headers: { authorization: `Bearer ${token}` },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a validly signed JWT with the wrong audience', async () => {
    const token = await new jose.SignJWT({
      email: 'test@example.com',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('test-user-id')
      .setIssuer('devconnect')
      .setAudience('user-service')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const request = {
      headers: { authorization: `Bearer ${token}` },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a validly signed JWT without an email claim', async () => {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('test-user-id')
      .setIssuer('devconnect')
      .setAudience('gateway')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const request = {
      headers: { authorization: `Bearer ${token}` },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should allow public routes without a token', async () => {
    const request = {
      headers: {},
    };

    const context = createHttpContext(request);

    const reflector = module.get<Reflector>(Reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should reject an expired JWT', async () => {
    const issuedAt = Math.floor((Date.now() - 30 * 60 * 1000) / 1000);
    const expiredAt = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);

    const token = await new jose.SignJWT({ email: 'test@test.com' })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('test-user-id')
      .setIssuer('devconnect')
      .setAudience('gateway')
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiredAt)
      .sign(privateKey);

    const request = {
      headers: { authorization: `Bearer ${token}` },
    };

    const context = createHttpContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

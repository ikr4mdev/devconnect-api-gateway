import { generateKeyPairSync } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import * as jose from 'jose';

jest.mock('../../../core', () => ({
  gatewayConfig: {
    jwtPublicKey: '',
    audience: 'gateway',
    issuer: 'devconnect',
  },
}));

import { gatewayConfig } from '../../../core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthGuard', () => {
  let guard: JwtAuthGuard;

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
    const module = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    const request = {
      headers: {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

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

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should accept a valid JWT and attach the user to the request', async () => {
    await guard.onModuleInit();

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

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request).toHaveProperty('user', {
      sub: 'test-user-id',
      email: 'test@example.com',
    });
  });

  it('should reject a validly signed JWT with the wrong issuer', async () => {
    await guard.onModuleInit();

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

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a validly signed JWT with the wrong audience', async () => {
    await guard.onModuleInit();

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

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a validly signed JWT without an email claim', async () => {
    await guard.onModuleInit();

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

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

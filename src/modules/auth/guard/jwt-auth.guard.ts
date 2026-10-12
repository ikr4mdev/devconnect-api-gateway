import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { Request } from 'express';
import * as jose from 'jose';

import type { KeyObject } from 'node:crypto';
import { gatewayConfig } from '../../../core';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private publicKey!: CryptoKey | KeyObject | Uint8Array;

  async onModuleInit(): Promise<void> {
    try {
      this.publicKey = await jose.importSPKI(
        gatewayConfig.jwtPublicKey,
        'RS256',
      );
    } catch (cause) {
      throw new Error('Failed to import JWT public key', { cause });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const token = this.extractJwtFromHeader(request);

    const payload: jose.JWTPayload = await this.jwtVerify(token);

    request.user = this.buildAuthenticatedUser(payload);

    return true;
  }

  private extractJwtFromHeader(request: Request): string {
    const header = request.headers.authorization;

    if (!header) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = header.split(' ');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const [type, token] = parts;
    const trimmedToken = token.trim();

    if (type.toLowerCase() !== 'bearer' || !trimmedToken) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    return trimmedToken;
  }

  private async jwtVerify(token: string): Promise<jose.JWTPayload> {
    let payload: jose.JWTVerifyResult<jose.JWTPayload>;

    try {
      payload = await jose.jwtVerify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: gatewayConfig.audience,
        issuer: gatewayConfig.issuer,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (typeof payload.payload.exp !== 'number') {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return payload.payload;
  }

  private buildAuthenticatedUser(payload: jose.JWTPayload): {
    sub: string;
    email: string;
  } {
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (typeof payload.email !== 'string' || payload.email.length === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { sub: payload.sub, email: payload.email };
  }
}

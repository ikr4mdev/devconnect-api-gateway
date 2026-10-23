import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  type AuthenticatedRequest,
  IS_PUBLIC_KEY,
  type JwtPayloadType,
  JwtTokenService,
} from '../../../core';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const contextType = context.getType<'http' | 'ws'>();

    if (contextType === 'ws') {
      const client = context.switchToWs().getClient();

      const user = client?.data?.user as JwtPayloadType | undefined;

      if (
        !user ||
        typeof user.sub !== 'string' ||
        user.sub.trim().length === 0 ||
        typeof user.email !== 'string' ||
        user.email.trim().length === 0
      ) {
        throw new UnauthorizedException(
          'Unauthorized: verified identity required.',
        );
      }

      return true;
    }

    if (contextType === 'http') {
      const request: AuthenticatedRequest = context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

      const token = this.extractJwtFromHeader(request);

      const payload: JwtPayloadType =
        await this.jwtTokenService.verifyToken(token);

      request.user = payload;

      return true;
    }

    throw new UnauthorizedException('Unsupported context type.');
  }

  private extractJwtFromHeader(request: Request): string {
    const header = request.headers.authorization;

    if (!header) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const parts = header.trim().split(/\s+/);
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid Authorization header.');
    }

    const [type, token] = parts;
    const trimmedToken = token.trim();

    if (type.toLowerCase() !== 'bearer' || !trimmedToken) {
      throw new UnauthorizedException('Invalid Authorization header.');
    }

    return trimmedToken;
  }
}

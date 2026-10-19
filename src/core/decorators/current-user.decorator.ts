import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtPayloadType } from '../interfaces';

export const CurrentUser = createParamDecorator(
  <K extends keyof JwtPayloadType>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): JwtPayloadType | JwtPayloadType[K] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) throw new UnauthorizedException('User not found.');

    return data !== undefined ? user[data] : user;
  },
);

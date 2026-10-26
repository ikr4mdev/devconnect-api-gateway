import { Request } from 'express';

export interface JwtPayloadType {
  sub: string;
  email: string;
}

export interface VerifiedJwtPayloadType extends JwtPayloadType {
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadType;
}

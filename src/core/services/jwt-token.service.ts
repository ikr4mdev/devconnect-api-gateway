import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { KeyObject } from 'node:crypto';
import * as jose from 'jose';
import { gatewayConfig } from '../config';
import { JwtPayloadType } from '../interfaces';

@Injectable()
export class JwtTokenService implements OnModuleInit {
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

  public async verifyToken(token: string): Promise<JwtPayloadType> {
    let payload: jose.JWTVerifyResult<jose.JWTPayload>;

    try {
      payload = await jose.jwtVerify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: gatewayConfig.audience,
        issuer: gatewayConfig.issuer,
        requiredClaims: ['exp', 'sub', 'email'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (typeof payload.payload.exp !== 'number') {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const { sub, email } = payload.payload;

    if (typeof sub !== 'string' || sub.trim().length === 0) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return { sub, email };
  }
}

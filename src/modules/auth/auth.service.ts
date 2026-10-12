import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc, RpcException } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

import { status } from '@grpc/grpc-js';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface AuthGrpcService {
  register(data: RegisterRequest): Observable<{
    id: string;
    email: string;
    isEmailVerified: boolean;
    createdAt: string;
  }>;
  login(data: LoginRequest): Observable<AuthResponse>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private authGrpcService!: AuthGrpcService;

  constructor(
    @Inject('AUTH_SERVICE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authGrpcService =
      this.client.getService<AuthGrpcService>('AuthService');
  }

  async register(data: RegisterDto) {
    try {
      return await firstValueFrom(this.authGrpcService.register(data));
    } catch (error: unknown) {
      const grpcError = error as { code?: number };

      switch (grpcError.code) {
        case status.ALREADY_EXISTS:
          throw new ConflictException('Email is already registered.');

        case status.INVALID_ARGUMENT:
          throw new BadRequestException('Invalid registration request.');

        case status.UNAVAILABLE:
          throw new ServiceUnavailableException(
            'Authentication service is temporarily unavailable.',
          );

        default:
          throw new InternalServerErrorException(
            'An unexpected registration error occurred.',
          );
      }
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      return await firstValueFrom(this.authGrpcService.login(data));
    } catch (error: unknown) {
      const grpcError = error as { code?: number };

      switch (grpcError.code) {
        case status.UNAUTHENTICATED:
          throw new UnauthorizedException('Invalid email or password.');

        case status.INVALID_ARGUMENT:
          throw new BadRequestException('Invalid login request.');

        case status.PERMISSION_DENIED:
          throw new ForbiddenException('Access denied.');

        case status.UNAVAILABLE:
          throw new ServiceUnavailableException(
            'Authentication service is temporarily unavailable.',
          );

        default:
          throw new InternalServerErrorException(
            'An unexpected authentication error occurred.',
          );
      }
    }
  }
}

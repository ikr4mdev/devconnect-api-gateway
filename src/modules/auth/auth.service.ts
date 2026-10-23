import { type ClientGrpc } from '@nestjs/microservices';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OperationResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@devconnect-microservices/devconnect-contracts';

import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';

interface AuthGrpcService {
  register(data: RegisterRequest): Observable<RegisterResponse>;
  login(data: LoginRequest): Observable<AuthResponse>;
  resendVerification(
    data: ResendVerificationRequest,
  ): Observable<OperationResponse>;
  verifyEmail(data: VerifyEmailRequest): Observable<OperationResponse>;
  forgotPassword(data: ForgotPasswordRequest): Observable<OperationResponse>;
  resetPassword(data: ResetPasswordRequest): Observable<OperationResponse>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private authGrpcService!: AuthGrpcService;

  constructor(
    @Inject('AUTH_SERVICE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.authGrpcService =
      this.client.getService<AuthGrpcService>('AuthService');
  }

  async register(data: RegisterDto): Promise<RegisterResponse> {
    return firstValueFrom(this.authGrpcService.register(data));
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    return firstValueFrom(this.authGrpcService.login(data));
  }

  async resendVerification(
    data: ResendVerificationDto,
  ): Promise<OperationResponse> {
    return firstValueFrom(this.authGrpcService.resendVerification(data));
  }

  async verifyEmail(data: VerifyEmailDto): Promise<OperationResponse> {
    return firstValueFrom(this.authGrpcService.verifyEmail(data));
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<OperationResponse> {
    return firstValueFrom(this.authGrpcService.forgotPassword(data));
  }

  async resetPassword(data: ResetPasswordDto): Promise<OperationResponse> {
    return firstValueFrom(this.authGrpcService.resetPassword(data));
  }
}

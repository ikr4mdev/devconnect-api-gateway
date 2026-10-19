import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../core';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  AuthResponse,
  OperationResponse,
  RegisterResponse,
} from '@devconnect-microservices/devconnect-contracts';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() data: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginDto): Promise<AuthResponse> {
    return this.authService.login(data);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() data: ResendVerificationDto,
  ): Promise<OperationResponse> {
    return this.authService.resendVerification(data);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() data: VerifyEmailDto): Promise<OperationResponse> {
    return this.authService.verifyEmail(data);
  }
}

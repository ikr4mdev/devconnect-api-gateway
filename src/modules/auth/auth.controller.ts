import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthResponse,
  OperationResponse,
  RegisterResponse,
} from '@ikr4mdev/devconnect-contracts';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { Public } from '@/core/decorators/public.decorator';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginDto): Promise<AuthResponse> {
    return this.authService.login(data);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() data: ForgotPasswordDto,
  ): Promise<OperationResponse> {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() data: ResetPasswordDto,
  ): Promise<OperationResponse> {
    return this.authService.resetPassword(data);
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

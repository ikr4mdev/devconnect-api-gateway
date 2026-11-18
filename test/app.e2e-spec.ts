import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthService } from '@/modules/auth/auth.service';
import { AppErrorCode, GrpcStatusMap } from '@ikr4mdev/devconnect-contracts';
import { mapHttp } from '@/core/errors/grpc-to-http.mapper';
import { Metadata } from '@grpc/grpc-js';
import { randomBytes } from 'node:crypto';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authService: Record<string, jest.Mock>;
  const random = randomBytes(32).toString('hex');

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      resendVerification: jest.fn(),
      verifyEmail: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('/ (POST) rejects registration with an invalid email', async () => {
    const registerDto = {
      email: 'not-an-email',
      password: 'StrongPassword123!',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(400);

    expect(res.body.message).toEqual(expect.stringMatching(/valid email/i));

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('/ (POST) rejects registration with an unexpected isAdmin property', async () => {
    const registerDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(400);

    expect(res.body.message).toEqual(
      expect.stringMatching(/property isAdmin/i),
    );

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('/ (POST) registers a user and returns the created user', async () => {
    const registerDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
    };

    const registerResponse = {
      id: 'test-user-1',
      email: 'test@test.com',
    };

    authService.register.mockResolvedValueOnce(registerResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(registerResponse);

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: registerDto.email,
        password: registerDto.password,
      }),
    );
  });

  it('/ (POST) returns 409 when the service reports the email is already registered', async () => {
    const registerDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
    };

    const metadata = new Metadata();
    metadata.set('app-error-code', AppErrorCode.EMAIL_ALREADY_REGISTERED);

    const error = {
      code: GrpcStatusMap.EMAIL_ALREADY_REGISTERED,
      details: 'Email already registered.',
      metadata,
    };

    authService.register.mockRejectedValueOnce(error);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(409);

    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      message:
        'An account with this email already exists. Try signing in instead.',
      path: '/auth/register',
    });

    expect(authService.register).toHaveBeenCalledTimes(1);
  });

  it('logs in a user and returns the service response', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
    };

    const loginResponse = {
      accessToken: 'jwt-token',
      userId: 'test-user-1',
    };

    authService.login.mockResolvedValueOnce(loginResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(200);

    expect(res.body).toEqual(loginResponse);

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: loginDto.email,
        password: loginDto.password,
      }),
    );
  });

  it('returns 401 when the gateway receives INVALID_CREDENTIALS from upstream', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
    };

    const metadata = new Metadata();
    metadata.set('app-error-code', AppErrorCode.INVALID_CREDENTIALS);

    const loginResponse = {
      code: GrpcStatusMap.INVALID_CREDENTIALS,
      details: 'Invalid email or password.',
      metadata,
    };

    authService.login.mockRejectedValueOnce(loginResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(HttpStatus.UNAUTHORIZED);

    const expected = mapHttp(AppErrorCode.INVALID_CREDENTIALS);

    expect(res.body).toMatchObject({
      statusCode: expected.status,
      code: AppErrorCode.INVALID_CREDENTIALS,
      message: expected.message,
      path: '/auth/login',
    });

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: loginDto.email,
        password: loginDto.password,
      }),
    );
  });

  it('rejects a malformed email on login before reaching the service', async () => {
    const loginDto = {
      email: 'not-an-email',
      password: 'StrongPassword123!',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(400);

    expect(res.body.message).toMatch(/valid email|must be an email/i);

    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/login');

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects an unexpected isAdmin property on login before reaching the service', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'StrongPassword123!',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(400);

    expect(res.body.message).toMatch(/isAdmin/i);

    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/login');

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('sends a password reset email and returns the operation response', async () => {
    const forgotPasswordDto = {
      email: 'test@test.com',
    };

    const operationResponse = {
      message:
        'If the account exists and needs verification, an email will be sent.',
    };

    authService.forgotPassword.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);

    expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authService.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: forgotPasswordDto.email,
      }),
    );
  });

  it('rejects a malformed email on forgot-password before reaching the service', async () => {
    const forgotPasswordDto = {
      email: 'not-an-email',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordDto)
      .expect(400);

    expect(res.body.message).toMatch(/valid email|must be an email/i);

    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/forgot-password');

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('rejects an unexpected isAdmin property on forgot-password before reaching the service', async () => {
    const forgotPasswordDto = {
      email: 'test@test.com',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordDto)
      .expect(400);

    expect(res.body.message).toMatch(/property isAdmin/i);

    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/forgot-password');

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('resets the password and returns the operation response', async () => {
    const resetPasswordDto = {
      token: random,
      newPassword: 'StrongPassword123!',
    };

    const operationResponse = {
      message: 'Password reset successfully. You can now sign in.',
    };

    authService.resetPassword.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);

    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    expect(authService.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        token: resetPasswordDto.token,
        newPassword: resetPasswordDto.newPassword,
      }),
    );
  });

  it('rejects a reset-password request with a missing token before reaching the service', async () => {
    const resetPasswordDto = {
      newPassword: 'StrongPassword123!',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(400);

    expect(res.body.message).toMatch(/Something|reset link/i);

    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('rejects an unexpected isAdmin property on reset-password before reaching the service', async () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'StrongPassword123!',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(400);

    expect(res.body.message).toMatch(/property isAdmin/i);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/reset-password');

    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('rejects a new password that violates the password rules before reaching the service', async () => {
    const resetPasswordDto = {
      token: random,
      newPassword: 'short',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(400);

    expect(res.body.message).toMatch(/at least 8/i);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/reset-password');

    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('verifies the email and returns the operation response', async () => {
    const verifyEmailDto = {
      token: random,
    };

    const operationResponse = {
      message: 'Email verified successfully. You can now sign in.',
    };

    authService.verifyEmail.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);

    expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authService.verifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        token: verifyEmailDto.token,
      }),
    );
  });

  it('rejects an empty body on verify-email before reaching the service', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({})
      .expect(400);

    expect(res.body.message).toMatch(/token/i);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/verify-email');

    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('rejects an unexpected isAdmin property on verify-email before reaching the service', async () => {
    const verifyEmailDto = {
      token: 'valid-verification-token',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(400);

    expect(res.body.message).toMatch(/property isAdmin/i);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/verify-email');

    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('resend the verification email and returns the operation response', async () => {
    const resendVerificationDto = {
      email: 'test@test.com',
    };

    const operationResponse = {
      message:
        'If the account exists and needs verification, an email will be sent.',
    };

    authService.resendVerification.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send(resendVerificationDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);

    expect(authService.resendVerification).toHaveBeenCalledTimes(1);
    expect(authService.resendVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: resendVerificationDto.email,
      }),
    );
  });

  it('rejects a malformed email on resend-verification before reaching the service', async () => {
    const resendVerificationDto = {
      email: 'not-an-email',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send(resendVerificationDto)
      .expect(400);

    expect(res.body.message).toMatch(/valid email/i);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/resend-verification');

    expect(authService.resendVerification).not.toHaveBeenCalled();
  });

  it('rejects an unexpected isAdmin property on resend-verification before reaching the service', async () => {
    const resendVerificationDto = {
      email: 'test@test.com',
      isAdmin: true,
    };

    const res = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send(resendVerificationDto)
      .expect(400);

    expect(res.body.message).toMatch(/property isAdmin/i);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.code).toBeNull();
    expect(res.body.path).toBe('/auth/resend-verification');

    expect(authService.resendVerification).not.toHaveBeenCalled();
  });

  it('returns 503 when the service reports the forgot-password email send failed', async () => {
    const forgotPasswordRequest = {
      email: 'test@test.com',
    };

    const metadata = new Metadata();
    metadata.set('app-error-code', AppErrorCode.EMAIL_SEND_FAILED);

    authService.forgotPassword.mockRejectedValueOnce({
      code: GrpcStatusMap.EMAIL_SEND_FAILED,
      details: 'Unable to send password reset email.',
      metadata,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordRequest)
      .expect(503);

    const expected = mapHttp(AppErrorCode.EMAIL_SEND_FAILED);

    expect(res.body.code).toBe(AppErrorCode.EMAIL_SEND_FAILED);
    expect(res.body.statusCode).toBe(expected.status);
    expect(res.body.message).toBe(expected.message);
    expect(res.body.path).toBe('/auth/forgot-password');

    expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authService.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: forgotPasswordRequest.email }),
    );
  });

  it('returns 410 when the service reports an expired reset token', async () => {
    const resetPasswordDto = {
      token: random,
      newPassword: 'StrongPassword123!',
    };

    const metadata = new Metadata();
    metadata.set('app-error-code', AppErrorCode.VERIFICATION_TOKEN_EXPIRED);

    authService.resetPassword.mockRejectedValueOnce({
      code: GrpcStatusMap.VERIFICATION_TOKEN_EXPIRED,
      details: 'This password reset link is invalid or has expired.',
      metadata,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(410);

    const expected = mapHttp(AppErrorCode.VERIFICATION_TOKEN_EXPIRED);

    expect(res.body.code).toBe(AppErrorCode.VERIFICATION_TOKEN_EXPIRED);
    expect(res.body.statusCode).toBe(expected.status);
    expect(res.body.message).toBe(expected.message);
    expect(res.body.path).toBe('/auth/reset-password');

    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    expect(authService.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        token: resetPasswordDto.token,
        newPassword: resetPasswordDto.newPassword,
      }),
    );
  });

  it('returns 404 when the service reports an invalid verification token', async () => {
    const verifyEmailDto = {
      token: random,
    };

    const metadata = new Metadata();
    metadata.set('app-error-code', AppErrorCode.VERIFICATION_TOKEN_NOT_FOUND);

    authService.verifyEmail.mockRejectedValueOnce({
      code: GrpcStatusMap.VERIFICATION_TOKEN_NOT_FOUND,
      details: 'Invalid or unknown verification token.',
      metadata,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(404);

    const expected = mapHttp(AppErrorCode.VERIFICATION_TOKEN_NOT_FOUND);

    expect(res.body.code).toBe(AppErrorCode.VERIFICATION_TOKEN_NOT_FOUND);
    expect(res.body.statusCode).toBe(expected.status);
    expect(res.body.message).toBe(expected.message);
    expect(res.body.path).toBe('/auth/verify-email');

    expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authService.verifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ token: verifyEmailDto.token }),
    );
  });
});

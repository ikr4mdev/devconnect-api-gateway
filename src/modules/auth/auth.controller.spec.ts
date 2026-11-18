import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import request from 'supertest';
import { randomBytes } from 'node:crypto';

describe('AuthController', () => {
  let app: INestApplication;
  let module: TestingModule;
  let authService = {
    register: jest.fn(),
    login: jest.fn(),
    resendVerification: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const random = randomBytes(32).toString('hex');

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
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

  it('registers a new user and returns the created user', async () => {
    const registerDto = {
      displayName: 'Master User',
      email: 'test@test.com',
      password: 'testPassword',
    };

    const now = Date.now();

    const mockResponse = {
      user: {
        id: 'test-user-1',
        email: registerDto.email,
        isEmailVerified: false,
        createdAt: now,
      },
      message: 'Registration successful. Please verify your email.',
      requiresVerification: true,
    };

    authService.register.mockResolvedValueOnce(mockResponse);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(response.body).toEqual(mockResponse);
    expect(authService.register).toHaveBeenCalledWith(registerDto);
  });

  it('logs in and returns the auth response', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'testPassword',
    };

    const authResponse = {
      accessToken: 'test-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      userId: 'test-user-1',
    };

    authService.login.mockResolvedValueOnce(authResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(200);

    expect(res.body).toEqual(authResponse);
    expect(authService.login).toHaveBeenCalledWith(loginDto);
  });

  it('sends a password reset email and returns the operation message', async () => {
    const forgotPasswordDto = {
      email: 'test@test.com',
    };

    const operationResponse = {
      message:
        'If the account exists, instructions to reset the password will be sent.',
    };

    authService.forgotPassword.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordDto)
      .expect(200);

    expect(res.body.message).toBe(
      'If the account exists, instructions to reset the password will be sent.',
    );

    expect(res.body).toEqual(operationResponse);
    expect(authService.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: forgotPasswordDto.email }),
    );
  });

  it('resets the password and returns the operation message', async () => {
    const resetPasswordDto = {
      token: random,
      newPassword: 'StrongPassword123!',
    };

    const message = 'Password reset successfully. You can now sign in.';

    const operationResponse = {
      message,
    };

    authService.resetPassword.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(resetPasswordDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);
    expect(res.body.message).toBe(message);
    expect(authService.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        token: resetPasswordDto.token,
        newPassword: resetPasswordDto.newPassword,
      }),
    );
  });

  it('resends the verification email and returns the operation message', async () => {
    const resendVerificationDto = {
      email: 'test@test.com',
    };

    const message =
      'If the account exists and needs verification, an email will be sent.';

    const operationResponse = {
      message,
    };

    authService.resendVerification.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send(resendVerificationDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);
    expect(res.body.message).toBe(message);

    expect(authService.resendVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: resendVerificationDto.email,
      }),
    );
  });

  it('verifies the email and returns the operation message', async () => {
    const verifyEmailDto = {
      token: random,
    };

    const message = 'Email verified successfully. You can now sign in.';

    const operationResponse = {
      message,
    };

    authService.verifyEmail.mockResolvedValueOnce(operationResponse);

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(200);

    expect(res.body).toEqual(operationResponse);
    expect(res.body.message).toBe(message);

    expect(authService.verifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        token: verifyEmailDto.token,
      }),
    );
  });

  // Invalid
  it('rejects an invalid email via DTO validation, before the service', async () => {
    const registerDto = {
      displayName: 'Master User',
      email: 'invalidEmail@test',
      password: 'StrongPassword',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/email address is not valid/i),
      ]),
    );

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 400 when the service rejects a valid registration', async () => {
    const registerDto = {
      displayName: 'Master User',
      email: 'valid@example.com',
      password: 'StrongPassword',
    };

    authService.register.mockRejectedValueOnce(
      new BadRequestException(['Email already registered.']),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(400);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/already registered/i)]),
    );

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: registerDto.email,
        password: registerDto.password,
      }),
    );
  });

  it('rejects a malformed email via DTO validation, before the service', async () => {
    const loginDto = {
      email: 'not-an-email',
      password: 'StrongPassword',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(400);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/Please enter/i)]),
    );
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('returns 401 when login credentials are invalid', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'StrongPassword',
    };

    authService.login.mockRejectedValueOnce(
      new UnauthorizedException('Invalid email or password.'),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(401);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: loginDto.email,
        password: loginDto.password,
      }),
    );
  });

  it('rejects a malformed email on forgot-password before the service', async () => {
    const forgotPasswordDto = {
      email: 'not-an-email',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(forgotPasswordDto)
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/i)]),
    );

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('rejects a weak password on reset-password before the service', async () => {
    const dto = {
      token: random, // random = randomBytes
      newPassword: 'short',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send(dto)
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /Your password needs to be at least 8 characters long./i,
        ),
      ]),
    );

    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('rejects a malformed email on resend-verification before the service', async () => {
    const dto = {
      email: 'not-an-email',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send(dto)
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/i)]),
    );

    expect(authService.resendVerification).not.toHaveBeenCalled();
  });

  it('rejects an empty verification token before reaching the service', async () => {
    const dto = {
      token: '',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(dto)
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/The verification token appears/i),
      ]),
    );

    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });
});

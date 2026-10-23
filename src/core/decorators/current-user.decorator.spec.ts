import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CurrentUser } from './current-user.decorator';
import type { JwtPayloadType } from '../interfaces';
import type { Request } from 'express';

@Controller('test')
export class CurrentUserTestController {
  @Get('me')
  getMe(@CurrentUser() data: JwtPayloadType) {
    return data;
  }

  @Get('email')
  getEmail(@CurrentUser('email') data: string) {
    return data;
  }
}

describe('CurrentUser', () => {
  let app: INestApplication;
  let module: TestingModule;
  const user: JwtPayloadType = {
    sub: 'test-user-id',
    email: 'test@test.com',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [CurrentUserTestController],
    }).compile();

    app = module.createNestApplication();

    app.use((req, _res, next) => {
      if (req.headers['x-test-no-user'] !== 'true') {
        (req as Request & { user: JwtPayloadType }).user = user;
      }
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('injects the whole user when no key is passed', async () => {
    const res = await request(app.getHttpServer()).get('/test/me').expect(200);
    expect(res.body).toEqual(user);
  });

  it('injects a single claim when a key is passed', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/email')
      .expect(200);

    expect(res.text).toBe(user.email);
  });

  it('throws UnauthorizedException when request.user is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/me')
      .set('x-test-no-user', 'true')
      .expect(401);

    expect(res.body).toEqual({
      statusCode: 401,
      message: 'User not found.',
      error: 'Unauthorized',
    });
  });
});

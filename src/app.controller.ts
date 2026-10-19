import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { JwtPayloadType } from './core/interfaces';
import { CurrentUser } from './core';

@Controller()
export class AppController {
  @Get('protected')
  protected() {
    return 'work';
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@CurrentUser() data: JwtPayloadType) {
    return { data };
  }
}

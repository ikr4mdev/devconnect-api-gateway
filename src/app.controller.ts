import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from './core';
import { type JwtPayloadType } from './core/interfaces';

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

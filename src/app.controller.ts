import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from './modules/auth/guard/jwt-auth.guard';

@Controller()
export class AppController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  protected(@Req() user: AuthenticatedRequest) {
    return user.user;
  }
}

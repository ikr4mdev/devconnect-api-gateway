import { CurrentUser } from '@/core';
import type { UsersV1 } from '@devconnect-microservices/devconnect-contracts';
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfileByUserId(
    @CurrentUser('sub') userId: string,
  ): Promise<UsersV1.GetProfileByIdResponse> {
    return this.usersService.getProfileByUserId(userId);
  }
}

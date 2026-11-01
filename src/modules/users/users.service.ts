import type { UsersV1 } from '@devconnect-microservices/devconnect-contracts';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface UsersGrpcService {
  getProfileByUserId(
    data: UsersV1.GetProfileByIdRequest,
  ): Observable<UsersV1.GetProfileByIdResponse>;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private usersGrpcService!: UsersGrpcService;

  constructor(@Inject('USERS_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.usersGrpcService =
      this.client.getService<UsersGrpcService>('UsersService');
  }

  async getProfileByUserId(
    userId: string,
  ): Promise<UsersV1.GetProfileByIdResponse> {
    return firstValueFrom(this.usersGrpcService.getProfileByUserId({ userId }));
  }
}

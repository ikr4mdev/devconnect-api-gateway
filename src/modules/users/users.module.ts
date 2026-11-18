import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'users.v1',
          protoPath: join(
            process.cwd(),
            'node_modules/@ikr4mdev/devconnect-contracts/proto/users/v1/users.proto',
          ),
          url: '127.0.0.1:5002',
          loader: {
            keepCase: false,
          },
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

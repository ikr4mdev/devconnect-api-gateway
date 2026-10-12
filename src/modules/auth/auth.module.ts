import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(process.cwd(), 'proto/auth.proto'),
          url: '127.0.0.1:50051',
        },
      },
    ]),
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard],
  providers: [JwtAuthGuard, AuthService],
})
export class AuthModule {}

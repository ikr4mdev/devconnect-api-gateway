import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { credentials } from '@grpc/grpc-js';
import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const authServiceCredentials = credentials.createSsl(
  readFileSync(join(process.cwd(), '.keys/ca.crt')),
  readFileSync(join(process.cwd(), '.keys/gateway-client.key')),
  readFileSync(join(process.cwd(), '.keys/gateway-client.crt')),
);

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(
            process.cwd(),
            'node_modules/@devconnect-microservices/devconnect-contracts/proto/auth.proto',
          ),
          url: '127.0.0.1:50051',
          credentials: authServiceCredentials,
        },
      },
    ]),
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard],
  providers: [JwtAuthGuard, AuthService],
})
export class AuthModule {}

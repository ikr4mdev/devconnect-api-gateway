import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guard/jwt-auth.guard';
import { GlobalHttpExceptionFilter, JwtTokenModule } from './core';
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [AuthModule, WebsocketModule, JwtTokenModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
  ],
})
export class AppModule {}

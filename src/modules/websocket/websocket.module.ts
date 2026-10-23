import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { JwtTokenModule } from '@/core';

@Module({
  imports: [JwtTokenModule],
  providers: [WebsocketGateway],
})
export class WebsocketModule {}

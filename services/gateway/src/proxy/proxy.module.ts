import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './proxy.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ProxyController],
})
export class ProxyModule {}

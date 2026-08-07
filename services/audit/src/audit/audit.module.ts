import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRecord } from './audit-record.entity';
import { AuditPersistenceService } from './audit-persistence.service';
import { AuditConsumerService } from './audit-consumer.service';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditRecord]), AuthModule],
  controllers: [AuditController],
  providers: [AuditPersistenceService, AuditConsumerService],
})
export class AuditModule {}

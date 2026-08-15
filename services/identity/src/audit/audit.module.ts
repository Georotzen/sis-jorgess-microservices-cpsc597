import { Module } from '@nestjs/common';
import { AuditPublisherService } from './audit-publisher.service.js';

@Module({
  providers: [AuditPublisherService],
  exports: [AuditPublisherService],
})
export class AuditModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { AuditRecord } from './audit/audit-record.entity';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Individual DATABASE_HOST/PORT/USER/PASSWORD/NAME vars, matching
    // what infra/docker/docker-compose.yml's `audit` service sets via
    // `environment:` — same convention as every other service.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [AuditRecord],
      // synchronize is convenient for the capstone but should be
      // replaced with migrations before anything resembling production
      // use — same caveat as every other service.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

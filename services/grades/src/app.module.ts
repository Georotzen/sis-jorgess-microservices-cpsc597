import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { GradeRecord } from './grades/grade-record.entity';
import { GradesModule } from './grades/grades.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Individual DATABASE_HOST/PORT/USER/PASSWORD/NAME vars, matching
    // what infra/docker/docker-compose.yml's `grades` service sets via
    // `environment:` — same convention as every other service (see the
    // note in Student Profile's app.module.ts re: Identity's old
    // DATABASE_URL bug, since fixed).
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [GradeRecord],
      // synchronize is convenient for the capstone but should be
      // replaced with migrations before anything resembling production
      // use — same caveat as every other service.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    GradesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

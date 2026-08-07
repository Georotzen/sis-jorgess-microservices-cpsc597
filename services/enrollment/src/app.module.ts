import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { CourseSection } from './course-section/course-section.entity';
import { CourseSectionModule } from './course-section/course-section.module';
import { Enrollment } from './enrollment/enrollment.entity';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Individual DATABASE_HOST/PORT/USER/PASSWORD/NAME vars, matching
    // what infra/docker/docker-compose.yml's `enrollment` service sets
    // via `environment:` — same reasoning as Student Profile's
    // app.module.ts (see the note there re: Identity's DATABASE_URL bug).
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [CourseSection, Enrollment],
      // synchronize is convenient for the capstone but should be
      // replaced with migrations before anything resembling production
      // use — same caveat as every other service.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    CourseSectionModule,
    EnrollmentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

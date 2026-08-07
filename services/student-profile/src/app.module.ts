import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { StudentProfile } from './student-profile/student-profile.entity';
import { StudentProfileModule } from './student-profile/student-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // NOTE: unlike Identity (which reads a single DATABASE_URL), this
    // service reads individual DATABASE_HOST/PORT/USER/PASSWORD/NAME
    // vars — that's deliberate, not a stylistic drift. It's what
    // infra/docker/docker-compose.yml's `student-profile` service
    // already sets via `environment:`. Identity's docker-compose entry
    // sets those same individual vars too, but Identity's app.module.ts
    // never reads them (only DATABASE_URL, which its own .env hardcodes
    // to `localhost` — worth a look, since that would resolve to the
    // Identity container itself rather than identity-db under Compose).
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [StudentProfile],
      // synchronize is convenient for the capstone but should be
      // replaced with migrations before anything resembling production
      // use — same caveat as Identity's app.module.ts.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    StudentProfileModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

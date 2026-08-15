import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AuditModule } from './audit/audit.module.js';
import { User } from './users/user.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Individual vars, not a single DATABASE_URL — this now matches
      // Student Profile and Enrollment, and matches what
      // infra/docker/docker-compose.yml's `identity` service already
      // sets via `environment:`. Previously this read DATABASE_URL,
      // which this service's own .env hardcoded to `localhost:5432` —
      // inside the Docker container that resolves to the identity
      // container itself, not `identity-db`, so the service could never
      // actually connect to Postgres under docker-compose. The
      // `environment:` block's DATABASE_HOST/PORT/USER/PASSWORD/NAME
      // were already being set correctly; nothing was reading them.
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [User],
      // synchronize is convenient for the capstone but should be replaced
      // with migrations before anything resembling production use.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuditModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}

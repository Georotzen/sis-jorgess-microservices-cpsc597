import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { IdentityController } from './identity.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { AuthDemoController } from './auth/auth-demo.controller';
import { IntrospectionService } from './auth/introspection.service';
import { IntrospectionGuard } from './auth/guards/introspection.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    ProxyModule,
  ],
  controllers: [IdentityController,HealthController, AuthDemoController],
  providers: [IntrospectionService,
    // Order matters: rate limit first (cheapest check, and it also
    // protects Keycloak from an introspection-flood), then authenticate,
    // then authorize. Each guard short-circuits the rest on failure.
    { provide: APP_GUARD, useClass: ThrottlerGuard },     
    {provide: APP_GUARD, useClass: IntrospectionGuard},
    {provide: APP_GUARD, useClass: RolesGuard},
  ],
})
export class AppModule {}

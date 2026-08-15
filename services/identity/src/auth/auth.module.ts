import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { KeycloakClient } from './keycloak-admin.client.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [PassportModule, UsersModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, KeycloakClient, JwtStrategy],
})
export class AuthModule {}

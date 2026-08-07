import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakClient } from './keycloak-admin.client';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PassportModule, UsersModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, KeycloakClient, JwtStrategy],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Unlike Identity's AuthModule, this one has no controller — Student
 * Profile doesn't issue tokens, it only verifies them. It exists purely
 * to register JwtStrategy in the DI container so JwtAuthGuard (which
 * activates Passport's 'jwt' strategy by name) can find it.
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}

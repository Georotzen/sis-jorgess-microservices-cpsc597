import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const keycloakUrl = process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'myrealm';
    const issuer = `${keycloakUrl}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: process.env.KEYCLOAK_CLIENT_ID || 'nestjs-gateway',
      issuer: issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
    });
  }

  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Extract realm roles and client roles for RBAC context
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles =
      payload.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || 'nestjs-gateway']?.roles || [];

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.preferred_username,
      roles: [...realmRoles, ...clientRoles],
    };
  }
}
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { JwtPayload, AuthenticatedUser, Role } from '@sis/shared-dtos';

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM ?? 'sis';

/**
 * Validates the JWT's signature locally against Keycloak's public JWKS.
 *
 * Same rationale as Identity's copy of this file (services/identity/src/
 * auth/strategies/jwt.strategy.ts): this is defense in depth against a
 * request reaching this service without going through the Gateway's
 * introspection guard (misconfigured network policy, internal tooling,
 * a future service calling this one directly, etc.), not redundancy for
 * its own sake. Every service in the platform keeps its own copy rather
 * than sharing one, so no single compromised/misconfigured component can
 * disable auth for every service at once.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: { headers?: { authorization?: string } }) => {
        const auth = req.headers?.authorization;
        if (!auth?.startsWith('Bearer ')) return null;
        return auth.slice('Bearer '.length);
      },
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/certs`,
      }),
      algorithms: ['RS256'],
      issuer: `${KEYCLOAK_BASE_URL}/realms/${REALM}`,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const rawRoles = (payload as unknown as {
      realm_access?: { roles?: string[] };
    }).realm_access?.roles ?? [];

    const roles = rawRoles.filter((r): r is Role =>
      Object.values(Role).includes(r as Role),
    );

    return {
      userId: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles,
    };
  }
}

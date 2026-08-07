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
 * This is intentionally a DIFFERENT validation mechanism than the
 * Gateway's OAuth2 introspection call (services/gateway) — this is
 * defense in depth, not redundancy for its own sake. The Gateway's
 * introspection catches tokens Keycloak has actively revoked (e.g. on
 * logout) even before they expire; this local check protects the
 * Identity service even if a request somehow reached it bypassing the
 * Gateway (misconfigured network policy, internal tooling, etc.) and
 * doesn't require a network round-trip to Keycloak on every request.
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
    // Keycloak nests realm roles under realm_access.roles in the raw
    // token; normalize into our shared Role enum here so the rest of
    // the service only ever deals with @sis/shared-dtos types.
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

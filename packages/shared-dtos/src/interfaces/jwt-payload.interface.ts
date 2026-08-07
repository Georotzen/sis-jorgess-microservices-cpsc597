import { Role } from '../enums/role.enum';

/**
 * Shape of the decoded access token issued by Keycloak (OIDC/OAuth2).
 * Consumed by the Gateway's auth guard and by each service that needs
 * to re-validate claims locally (defense in depth).
 */
export interface JwtPayload {
  /** Subject — Keycloak user id (UUID) */
  sub: string;
  /** Preferred username */
  preferred_username: string;
  email: string;
  /** Realm-level roles mapped into our Role enum by the auth guard */
  roles: Role[];
  /** Issued-at (unix seconds) */
  iat: number;
  /** Expiry (unix seconds) */
  exp: number;
  /** Token issuer, e.g. the Keycloak realm URL */
  iss: string;
  /** Intended audience, e.g. 'sis-gateway' */
  aud: string | string[];
  /** Session id, used for refresh-token rotation and forced logout */
  sid: string;
}

/**
 * Minimal identity attached to `req.user` after the Gateway/service
 * auth guard verifies a request. Prefer this over passing the raw
 * JwtPayload deeper into business logic.
 */
export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  roles: Role[];
}

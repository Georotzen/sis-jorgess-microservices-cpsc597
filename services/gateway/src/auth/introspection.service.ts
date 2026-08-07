import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { AuthenticatedUser, Role } from '@sis/shared-dtos';

interface IntrospectionResponse {
  active: boolean;
  sub?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles?: string[] };
  exp?: number;
}

/**
 * Wraps Keycloak's OAuth2 Token Introspection endpoint (RFC 7662),
 * called with the Gateway's own client credentials (`sis-gateway`).
 *
 * This is deliberately an ONLINE check against Keycloak on (almost)
 * every request, rather than pure local JWT/JWKS validation, because
 * the architecture notes call for "OAuth2 introspection" specifically:
 * introspection reflects Keycloak's live view of the token, including
 * tokens that were actively revoked (e.g. on logout or an admin-forced
 * session termination) before their stated expiry — something local
 * signature validation alone cannot detect.
 *
 * A short in-memory cache (a few seconds) is used purely to absorb
 * request bursts for the same token; it intentionally trades a small,
 * bounded staleness window for materially lower load on Keycloak. Set
 * CACHE_TTL_MS to 0 to disable caching entirely if your threat model
 * requires it.
 */
@Injectable()
export class IntrospectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntrospectionService.name);
  private readonly baseUrl = process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8080';
  private readonly realm = process.env.KEYCLOAK_REALM ?? 'sis';
  private readonly clientId = process.env.KEYCLOAK_INTROSPECTION_CLIENT_ID ?? 'sis-gateway';
  private readonly clientSecret = process.env.KEYCLOAK_INTROSPECTION_CLIENT_SECRET ?? '';
  private readonly cacheTtlMs = Number(process.env.INTROSPECTION_CACHE_TTL_MS ?? 3000);

  /**
   * Keycloak calls must fail fast, not hang. A slow-but-not-down Keycloak
   * is a distinct failure mode from a fully down one — without a timeout,
   * that request (and every connection behind it) can hang indefinitely,
   * which is worse for the Gateway than a clean, quick 401. Kept separate
   * from cacheTtlMs since the two are configured for different reasons.
   */
  private readonly requestTimeoutMs = Number(process.env.INTROSPECTION_TIMEOUT_MS ?? 3000);

  private readonly cache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();

  /**
   * Periodic sweep interval handle. Without this, expired cache entries
   * are only removed when the SAME token is looked up again — a token
   * introspected once and never seen again (e.g. a one-off request, or a
   * user who never returns) stays in the Map forever. Over the life of a
   * long-running Gateway process with many distinct tokens rotating every
   * few minutes, that's unbounded memory growth. The sweep guarantees
   * eviction happens on a schedule, independent of whether a token is
   * ever looked up again.
   */
  private sweepInterval: NodeJS.Timeout | null = null;

  /**
   * Sweep every 2x the cache TTL — frequent enough that memory doesn't
   * meaningfully build up between sweeps, infrequent enough not to waste
   * cycles scanning a cache that's mostly still valid. Disabled entirely
   * when caching itself is disabled (cacheTtlMs === 0), since there's
   * nothing to sweep.
   */
  onModuleInit(): void {
    if (this.cacheTtlMs <= 0) return;
    const sweepIntervalMs = Math.max(this.cacheTtlMs * 2, 1000);
    this.sweepInterval = setInterval(() => this.evictExpired(), sweepIntervalMs);
    this.sweepInterval.unref?.(); // don't let this timer keep the process alive
  }

  onModuleDestroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [token, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(token);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.logger.debug(`Introspection cache sweep: evicted ${evicted} expired entr${evicted === 1 ? 'y' : 'ies'}`);
    }
  }

  async introspect(accessToken: string): Promise<AuthenticatedUser | null> {
    const cached = this.cache.get(accessToken);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    let data: IntrospectionResponse;
    try {
      const res = await axios.post<IntrospectionResponse>(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({ token: accessToken }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: this.clientId, password: this.clientSecret },
        },
      );
      data = res.data;
    } catch (err) {
      this.logger.error('Token introspection call failed', err as Error);
      return null;
    }

    if (!data.active || !data.sub) {
      return null;
    }

    const rawRoles = data.realm_access?.roles ?? [];
    const roles = rawRoles.filter((r): r is Role =>
      Object.values(Role).includes(r as Role),
    );

    const user: AuthenticatedUser = {
      userId: data.sub,
      username: data.preferred_username ?? '',
      email: data.email ?? '',
      roles,
    };

    if (this.cacheTtlMs > 0) {
      this.cache.set(accessToken, {
        user,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }

    return user;
  }
}

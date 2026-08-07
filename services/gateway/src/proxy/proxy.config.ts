import { ConfigService } from '@nestjs/config';

/**
 * One entry per backend service the Gateway proxies to.
 *
 * IMPORTANT convention: targets point at the service's bare host:port —
 * the Gateway does NOT strip the `prefix` off the forwarded path. This
 * mirrors Identity, which mounts its controller as `@Controller('identity')`
 * and therefore expects to receive `/identity/register`, not `/register`.
 * Any new service must follow the same `@Controller('<prefix>')` convention
 * so the Gateway's "forward the path unchanged" behavior stays correct for
 * every service, not just Identity.
 *
 * `audit` is deliberately absent: it has no host-facing HTTP API in the
 * current architecture (services publish events to it over RabbitMQ), so
 * there is nothing for the Gateway to route to.
 */
export interface ServiceTarget {
  /** First path segment used to route, e.g. 'identity' -> /identity/*  */
  prefix: 'identity' | 'student-profile' | 'enrollment' | 'grades';
  /** Base URL of the backend service, reachable on the sis-net docker network. */
  target: string;
}

export function getServiceTargets(config: ConfigService): ServiceTarget[] {
  return [
    {
      prefix: 'identity',
      target: config.get<string>('IDENTITY_SERVICE_URL', 'http://identity:3001'),
    },
    {
      prefix: 'student-profile',
      target: config.get<string>('STUDENT_PROFILE_SERVICE_URL', 'http://student-profile:3000'),
    },
    {
      prefix: 'enrollment',
      target: config.get<string>('ENROLLMENT_SERVICE_URL', 'http://enrollment:3000'),
    },
    {
      prefix: 'grades',
      target: config.get<string>('GRADES_SERVICE_URL', 'http://grades:3000'),
    },
  ];
}

/**
 * Routes that must be reachable with NO access token at all, proxied
 * straight through before IntrospectionGuard ever runs. Kept in one
 * place (rather than scattered @Public() calls) so it's obvious, at a
 * glance, exactly how small the unauthenticated surface of the Gateway is.
 *
 * These must match services/identity/src/auth/auth.controller.ts exactly.
 * If Identity adds or removes a public route, update this list in the
 * same PR — nothing enforces the two staying in sync automatically.
 */
export const PUBLIC_PROXY_ROUTES = ['identity/register', 'identity/login', 'identity/refresh'];

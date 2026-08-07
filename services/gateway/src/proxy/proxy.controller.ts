import { All, Controller, Next, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import { AuthenticatedUser } from '@sis/shared-dtos';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import { Public } from '../auth/decorators/public.decorator';
import { getServiceTargets, PUBLIC_PROXY_ROUTES, ServiceTarget } from './proxy.config';

/**
 * Routes requests to the four backend HTTP services.
 *
 * SECURITY NOTE — why this is a Nest controller and not raw Express
 * middleware (e.g. registered in `configure()`/`app.use()`):
 * Nest's request pipeline runs middleware BEFORE guards. If proxying
 * happened in middleware, every request would be forwarded to a backend
 * service before IntrospectionGuard/RolesGuard (registered globally as
 * APP_GUARD in app.module.ts) ever ran — i.e. authentication would be
 * silently bypassed for every proxied route. Putting the proxy logic
 * inside controller handlers means it executes at the normal point in
 * the pipeline (after middleware, after guards), so the exact same
 * global guards that protect `/auth/me` also protect everything proxied
 * here. Do not "simplify" this back to middleware.
 */
@Controller()
export class ProxyController {
  private readonly proxies = new Map<string, ReturnType<typeof createProxyMiddleware>>();

  constructor(private readonly config: ConfigService) {
    for (const svc of getServiceTargets(config)) {
      this.proxies.set(svc.prefix, createProxyMiddleware(this.buildOptions(svc)));
    }
  }

  private buildOptions(svc: ServiceTarget): Options {
    return {
      target: svc.target,
      changeOrigin: true,
      xfwd: true,
      // Fail fast rather than let a slow/hung backend tie up a Gateway
      // connection indefinitely — same reasoning as IntrospectionService's
      // own timeout.
      proxyTimeout: 5000,
      timeout: 5000,
      logger: console,
      on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
          // Strip any of these headers the *caller* may have set themselves
          // before trusting/forwarding our own values — a client must never
          // be able to forge its own identity by sending x-user-* headers.
          proxyReq.removeHeader('x-user-id');
          proxyReq.removeHeader('x-user-roles');
          proxyReq.removeHeader('x-user-email');

          const user = (req as IncomingMessage & { user?: AuthenticatedUser }).user;
          if (user) {
            proxyReq.setHeader('x-user-id', user.userId);
            proxyReq.setHeader('x-user-roles', user.roles.join(','));
            proxyReq.setHeader('x-user-email', user.email ?? '');
          }

          // Propagate (or mint) a correlation id so AllExceptionsFilter in
          // every downstream service logs under the same id as the Gateway.
          const incoming = req.headers['x-correlation-id'];
          const correlationId = Array.isArray(incoming) ? incoming[0] : incoming ?? randomUUID();
          proxyReq.setHeader('x-correlation-id', correlationId);
        },
        error: (err: Error, req: IncomingMessage, res: ServerResponse | Socket) => {
          // http-proxy-middleware hands us a raw Node response here, not a
          // Nest one — AllExceptionsFilter never sees this, so the envelope
          // has to be built by hand. Keep it in the same shape as
          // ErrorResponseBody (@sis/shared-errors) so clients don't need a
          // special case for "the service was unreachable".
          const response = res as ServerResponse;
          if (!response.headersSent) {
            response.writeHead(502, { 'Content-Type': 'application/json' });
          }
          response.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'ERR_BAD_GATEWAY',
                message: `Upstream service '${svc.prefix}' is unreachable`,
              },
              statusCode: 502,
              path: (req as IncomingMessage & { url?: string }).url,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      },
    };
  }

  private dispatch(prefix: ServiceTarget['prefix'], req: Request, res: Response, next: NextFunction) {
    this.proxies.get(prefix)!(req, res, next);
  }

  // --- Public routes: must be declared BEFORE the wildcard identity
  // route below, since Express matches routes in registration order and
  // a literal path has to win over `identity/*` for the same request. ---
  @Public()
  @All(PUBLIC_PROXY_ROUTES)
  identityPublic(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('identity', req, res, next);
  }

  // Everything else under /identity requires a valid, non-revoked token
  // (IntrospectionGuard) — enforced globally, nothing to add here.
  @All('identity/*')
  identity(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('identity', req, res, next);
  }

  @All('student-profile/*')
  studentProfile(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('student-profile', req, res, next);
  }

  @All('enrollment/*')
  enrollment(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('enrollment', req, res, next);
  }

  @All('grades/*')
  grades(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('grades', req, res, next);
  }
}

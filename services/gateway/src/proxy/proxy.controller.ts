import { All, Controller, Inject, Next, OnModuleInit, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import { Public } from '../auth/decorators/public.decorator';
import { getServiceTargets, PUBLIC_PROXY_ROUTES, ServiceTarget } from './proxy.config';

/**
 * Routes requests to the four backend HTTP services.
 */
@Controller()
export class ProxyController implements OnModuleInit {
  private readonly proxies = new Map<string, any>();
  private createProxyMiddleware: any;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    // Dynamically import ESM module
    const { createProxyMiddleware } = await import('http-proxy-middleware');
    this.createProxyMiddleware = createProxyMiddleware;

    for (const svc of getServiceTargets(this.config)) {
      this.proxies.set(svc.prefix, this.createProxyMiddleware(this.buildOptions(svc)));
    }
  }

  private buildOptions(svc: ServiceTarget): any {
    return {
      target: svc.target,
      changeOrigin: true,
      xfwd: true,
      // Don't rewrite — just forward everything as-is. The backend service
      // expects /student-profile/me not /api/student-profile/me anyway.
      proxyTimeout: 5000,
      timeout: 5000,
      logger: console,
      on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
          console.log(`[ProxyReq] ${req.method} ${(req as any).url} -> ${svc.target}`);
          proxyReq.removeHeader('x-user-id');
          proxyReq.removeHeader('x-user-roles');
          proxyReq.removeHeader('x-user-email');

          const user = (req as any).user;
          if (user) {
            proxyReq.setHeader('x-user-id', user.userId);
            proxyReq.setHeader('x-user-roles', user.roles.join(','));
            proxyReq.setHeader('x-user-email', user.email ?? '');
          }

          const incoming = req.headers['x-correlation-id'];
          const correlationId = Array.isArray(incoming) ? incoming[0] : incoming ?? randomUUID();
          proxyReq.setHeader('x-correlation-id', correlationId);
          // If Nest's body-parser already consumed the request stream, the
          // proxy will not forward the body. Detect parsed `req.body` and
          // write it to the proxy request so POST/PUT/PATCH bodies arrive
          // intact at upstream services.
          try {
            const contentType = (req.headers['content-type'] || '').toString();
            const body = (req as any).body;
            if (body && typeof body === 'object' && contentType.includes('application/json')) {
              const bodyData = JSON.stringify(body);
              proxyReq.setHeader('content-length', Buffer.byteLength(bodyData).toString());
              proxyReq.write(bodyData);
            }
          } catch (e) {
            // Best-effort only; if this fails, proxy will attempt to stream
            // the original request as usual and the upstream may error.
            console.warn('[ProxyReq] failed to forward parsed body:', (e as Error).message);
          }
        },
        error: (err: Error, req: IncomingMessage, res: ServerResponse | Socket) => {
          console.error(`[ProxyError] ${(req as any).url}:`, err.message);
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
              path: (req as any).url,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      },
    };
  }

  private dispatch(prefix: ServiceTarget['prefix'], req: Request, res: Response, next: NextFunction) {
    console.log(`[Dispatch] ${prefix}: ${req.method} ${req.url}`);
    const proxy = this.proxies.get(prefix);
    if (!proxy) {
      console.warn(`[Dispatch] No proxy found for prefix: ${prefix}`);
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    proxy(req, res, next);
  }

  @Public()
  @All(PUBLIC_PROXY_ROUTES)
  identityPublic(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.dispatch('identity', req, res, next);
  }

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

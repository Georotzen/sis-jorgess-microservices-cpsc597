import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UnauthenticatedException } from '@sis/shared-errors';
import { AuthenticatedUser } from '@sis/shared-dtos';
import { IntrospectionService } from '../introspection.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
/**
 * Every route the Gateway forwards to a backend service must sit behind
 * this guard (apply globally in main.ts, or per-controller/route as
 * needed for public endpoints like /identity/register and /identity/login).
 * On success, attaches `req.user: AuthenticatedUser` for downstream
 * guards (e.g. a RolesGuard) and for forwarding identity to upstream
 * services via a trusted internal header.
 */
@Injectable()
export class IntrospectionGuard implements CanActivate {
  constructor(private readonly introspection: IntrospectionService, 
              private readonly reflector: Reflector,
  ){}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthenticatedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice('Bearer '.length);
    const user = await this.introspection.introspect(token);

    if (!user) {
      throw new UnauthenticatedException('Token is invalid, expired, or revoked');
    }

    (request as Request & { user: AuthenticatedUser }).user = user;
    return true;
  }
}

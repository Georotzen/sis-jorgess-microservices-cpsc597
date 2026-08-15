import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InsufficientRoleException } from '@sis/shared-errors';
import { AuthenticatedUser, Role } from '@sis/shared-dtos';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Must run AFTER JwtAuthGuard in the guard chain (Nest runs guards in
 * declaration order), since it relies on req.user already being set.
 * Usage: @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMINISTRATOR)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no @Roles() decorator => no role restriction beyond authentication
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    const hasRole = !!user && requiredRoles.some((r) => user.roles.includes(r));
    if (!hasRole) {
      throw new InsufficientRoleException(requiredRoles);
    }
    return true;
  }
}

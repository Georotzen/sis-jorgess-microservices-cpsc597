import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InsufficientRoleException } from '@sis/shared-errors';
import { AuthenticatedUser, Role } from '@sis/shared-dtos';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Usage: @UseGuards(IntrospectionGuard, RolesGuard) @Roles(Role.ADMINISTRATOR)
 * This is the FIRST of the two RBAC checks required by the architecture
 * ("RBAC enforced at both gateway and service layers"); the corresponding
 * service (e.g. Identity) performs the second, independent check.
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
      return true;
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

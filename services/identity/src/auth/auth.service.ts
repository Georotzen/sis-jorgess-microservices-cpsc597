import { Injectable } from '@nestjs/common';
import {
  RegisterUserDto,
  LoginDto,
  TokenPairDto,
  RefreshTokenDto,
  AssignRoleDto,
  UserDto,
  Role,
  AuditEventType,
} from '@sis/shared-dtos';
import { KeycloakClient } from './keycloak-admin.client.js';
import { UsersService } from '../users/users.service.js';
import { AuditPublisherService } from '../audit/audit-publisher.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly keycloak: KeycloakClient,
    private readonly users: UsersService,
    private readonly audit: AuditPublisherService,
  ) {}

  /**
   * Public self-registration. ALWAYS creates the user with Role.STUDENT —
   * this is hardcoded here, not read from the DTO, because RegisterUserDto
   * (see @sis/shared-dtos) deliberately has no role field at all. See that
   * file's doc comment for why a client-supplied role, even one restricted
   * by a TypeScript type, is not a safe way to enforce this.
   */
  async register(dto: RegisterUserDto): Promise<UserDto> {
    const { id } = await this.keycloak.createUser({
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      role: Role.STUDENT, // hardcoded — not derived from client input
    });

    const localUser = await this.users.createLocalRecord({
      id,
      email: dto.email,
      fullName: dto.fullName,
    });

    await this.audit.publish(AuditEventType.ROLE_ASSIGNED, {
      actorUserId: id,
      subjectUserId: id,
      metadata: { role: Role.STUDENT, via: 'self-registration' },
    });

    return {
      id: localUser.id,
      email: localUser.email,
      fullName: localUser.fullName,
      roles: [Role.STUDENT],
      isActive: localUser.isActive,
      createdAt: localUser.createdAt.toISOString(),
    };
  }

  async login(dto: LoginDto): Promise<TokenPairDto> {
    try {
      const tokens = await this.keycloak.passwordGrant(dto.email, dto.password);
      await this.audit.publish(AuditEventType.LOGIN_SUCCESS, {
        actorUserId: dto.email, // token isn't decoded here; email is the best available identifier
        metadata: {},
      });
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: 'Bearer',
      };
    } catch (err) {
      await this.audit.publish(AuditEventType.LOGIN_FAILURE, {
        actorUserId: dto.email,
        metadata: {},
      });
      throw err;
    }
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPairDto> {
    const tokens = await this.keycloak.refreshGrant(dto.refreshToken);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: 'Bearer',
    };
  }

  /**
   * Revokes the caller's refresh token server-side, closing the gap where
   * Gateway introspection was revocation-aware in theory but nothing ever
   * actually revoked anything. Takes actorUserId from the validated JWT
   * (req.user.userId in the controller) rather than trusting the request
   * body, since we already know who's calling from the auth guard.
   *
   * NOTE: assumes AuditEventType.LOGOUT exists in @sis/shared-dtos — add it
   * to that enum if it isn't there yet (same shape as LOGIN_SUCCESS).
   */
  async logout(dto: RefreshTokenDto, actorUserId: string): Promise<void> {
    await this.keycloak.logout(dto.refreshToken);
    await this.audit.publish(AuditEventType.LOGOUT, {
      actorUserId,
      metadata: {},
    });
  }


  /**
   * Administrator-only role assignment. The controller enforces the
   * ADMINISTRATOR role via @Roles(Role.ADMINISTRATOR) + RolesGuard before
   * this method is ever reached — this is the ONLY path in the codebase
   * that may grant FACULTY or ADMINISTRATOR.
   */
  async assignRole(dto: AssignRoleDto, actorUserId: string): Promise<void> {
    await this.keycloak.assignRealmRole(dto.targetUserId, dto.role);
    await this.audit.publish(AuditEventType.ROLE_ASSIGNED, {
      actorUserId,
      subjectUserId: dto.targetUserId,
      metadata: { role: dto.role, via: 'admin-assignment' },
    });
  }
}

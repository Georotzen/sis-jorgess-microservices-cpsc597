import {
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Role } from '../enums/role.enum';

/**
 * Payload for POST /identity/register
 * Validated at the Gateway (shape) and re-validated inside the Identity
 * service (defense in depth) before being forwarded to Keycloak.
 *
 * IMPORTANT: this DTO deliberately has NO role field. A previous version
 * used `requestedRole!: Role.STUDENT` to try to restrict self-registration
 * to the student role via the TypeScript type system — but that type is
 * erased at compile time and class-validator's `@IsEnum(Role)` validates
 * against the *entire* Role enum at runtime, so a raw request body of
 * `{ "requestedRole": "administrator" }` would have passed validation.
 * The only reliable fix is to never accept a role from the client on this
 * path at all: the Identity service controller must hardcode `Role.STUDENT`
 * when it calls Keycloak. Elevated roles are granted exclusively through
 * `AssignRoleDto` below, behind an administrator-only, audited endpoint.
 */
export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Password must contain a special character',
  })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * Response returned by the Identity service after a successful login
 * or refresh. Access tokens are short-lived; refresh tokens rotate on use.
 */
export class TokenPairDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // seconds
  tokenType: 'Bearer' = 'Bearer';
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

/**
 * Administrator-only endpoint for assigning/revoking roles.
 * Never exposed on the self-service registration path.
 */
export class AssignRoleDto {
  @IsUUID()
  targetUserId!: string;

  @IsEnum(Role)
  role!: Role;
}

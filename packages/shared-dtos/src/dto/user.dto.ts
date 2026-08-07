import { Role } from '../enums/role.enum';

/**
 * Safe, non-sensitive user projection returned by the Identity service.
 * Never include password hashes, tokens, or MFA secrets here — those
 * never leave the Identity service / Keycloak.
 */
export class UserDto {
  id!: string;
  email!: string;
  fullName!: string;
  roles!: Role[];
  isActive!: boolean;
  createdAt!: string; // ISO 8601
}

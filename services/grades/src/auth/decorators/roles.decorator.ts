import { SetMetadata } from '@nestjs/common';
import { Role } from '@sis/shared-dtos';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

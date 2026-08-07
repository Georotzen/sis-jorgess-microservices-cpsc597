/**
 * Canonical RBAC roles for the SIS platform.
 * Must stay in sync with the Keycloak realm role definitions.
 */
export enum Role {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMINISTRATOR = 'administrator',
}

/**
 * Convenience group for endpoints that only staff (not students) may call.
 */
export const STAFF_ROLES: Role[] = [Role.FACULTY, Role.ADMINISTRATOR];

/**
 * Security-relevant event types published to the Audit & Logging Service
 * over RabbitMQ/Kafka. Keep this list append-only — do not repurpose
 * existing values, since the audit trail must remain meaningful historically.
 */
export enum AuditEventType {
  LOGIN_SUCCESS = 'login.success',
  LOGIN_FAILURE = 'login.failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token.refresh',
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REVOKED = 'role.revoked',
  PROFILE_UPDATED = 'profile.updated',
  ENROLLMENT_CREATED = 'enrollment.created',
  ENROLLMENT_DROPPED = 'enrollment.dropped',
  GRADE_ENTERED = 'grade.entered',
  GRADE_MODIFIED = 'grade.modified',
  ACCESS_DENIED = 'access.denied',
}

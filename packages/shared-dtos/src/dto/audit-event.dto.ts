import { AuditEventType } from '../enums/audit-event-type.enum';

/**
 * Canonical shape for every message published to the audit exchange/topic.
 * The Audit & Logging Service persists these as immutable records —
 * never mutate or delete a published event, even to "correct" it;
 * publish a new event instead.
 */
export class AuditEventDto {
  /** Unique id for idempotent consumption (dedupe on redelivery). */
  eventId!: string;

  eventType!: AuditEventType;

  /** User the event is about (may differ from actor, e.g. admin editing another user). */
  subjectUserId?: string;

  /** User who performed the action. */
  actorUserId!: string;

  /** Originating service, e.g. 'identity', 'grades'. */
  sourceService!: string;

  /** Free-form, non-sensitive context. Never put raw PII/grades payloads here — reference ids instead. */
  metadata?: Record<string, string | number | boolean>;

  /** Correlation id propagated from the Gateway for cross-service tracing. */
  correlationId!: string;

  occurredAt!: string; // ISO 8601, set by the publishing service
}

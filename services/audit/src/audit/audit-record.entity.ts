import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditEventType } from '@sis/shared-dtos';

/**
 * Append-only, immutable persisted copy of every AuditEventDto consumed
 * from the `sis.audit` exchange. There is deliberately no update or
 * delete path anywhere in this service (see AuditQueryService/
 * AuditConsumerService) — a "correction" is a new inbound event with a
 * new eventId, never an edit of a row already written here. Same shape
 * of guarantee as Grades' append-only GradeRecord table.
 *
 * `eventId` (the id assigned by the PUBLISHING service, not this row's
 * own primary key) is unique so that redelivery from RabbitMQ — which
 * only guarantees at-least-once delivery, not exactly-once — can be
 * deduped on insert rather than producing duplicate audit entries.
 */
@Entity({ name: 'audit_records' })
@Index(['eventType', 'occurredAt'])
@Index(['subjectUserId'])
@Index(['actorUserId'])
export class AuditRecord {
  /** This table's own row identity — distinct from the event's own eventId. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Id assigned by the publishing service; unique for redelivery dedupe. */
  @Column({ name: 'event_id', unique: true })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar' })
  eventType!: AuditEventType;

  @Column({ name: 'actor_user_id' })
  actorUserId!: string;

  @Column({ name: 'subject_user_id', type: 'varchar', nullable: true })
  subjectUserId?: string | null;

  /** Originating service, e.g. 'identity', 'grades'. */
  @Column({ name: 'source_service' })
  sourceService!: string;

  /** Free-form, non-sensitive context — never raw PII/grades payloads. */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, string | number | boolean> | null;

  @Column({ name: 'correlation_id' })
  correlationId!: string;

  /** Set by the PUBLISHING service at the moment the event occurred. */
  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  /** Set by THIS service — when the audit trail actually recorded it. */
  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt!: Date;
}

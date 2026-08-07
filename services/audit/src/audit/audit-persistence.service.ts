import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventDto, AuditEventType } from '@sis/shared-dtos';
import { AuditRecord } from './audit-record.entity';

export interface AuditQueryFilters {
  eventType?: AuditEventType;
  actorUserId?: string;
  subjectUserId?: string;
  sourceService?: string;
  occurredFrom?: Date;
  occurredTo?: Date;
  page: number;
  pageSize: number;
}

/**
 * The ONLY write path into audit_records. There is no update() or
 * delete() method here on purpose — see AuditRecord's own docstring.
 * `save()` is intentionally absent from this class's public surface so
 * nothing upstream can be tempted to "just update a field" later.
 */
@Injectable()
export class AuditPersistenceService {
  private readonly logger = new Logger(AuditPersistenceService.name);

  constructor(
    @InjectRepository(AuditRecord)
    private readonly repo: Repository<AuditRecord>,
  ) {}

  /**
   * Inserts one event. Returns `true` if a new row was written, `false`
   * if `event.eventId` had already been recorded (a RabbitMQ redelivery
   * of a message this service already processed) — the caller should
   * still ack the message either way, since "already recorded" is a
   * success outcome for an at-least-once consumer, not a failure.
   *
   * Concurrency-safe: relies on the unique constraint on `event_id`
   * (see AuditRecord) and Postgres's own conflict detection, rather
   * than a check-then-insert race (SELECT then INSERT would have a
   * window where two redeliveries processed concurrently could both
   * pass the check).
   */
  async recordIfNew(event: AuditEventDto): Promise<boolean> {
    try {
      await this.repo.insert({
        eventId: event.eventId,
        eventType: event.eventType,
        actorUserId: event.actorUserId,
        subjectUserId: event.subjectUserId ?? null,
        sourceService: event.sourceService,
        metadata: event.metadata ?? null,
        correlationId: event.correlationId,
        occurredAt: new Date(event.occurredAt),
      });
      return true;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        this.logger.debug(`Duplicate audit event ${event.eventId} — already recorded, skipping`);
        return false;
      }
      throw err;
    }
  }

  async findMany(filters: AuditQueryFilters): Promise<{ items: AuditRecord[]; total: number }> {
    const query = this.repo.createQueryBuilder('r');
    if (filters.eventType) query.andWhere('r.event_type = :eventType', { eventType: filters.eventType });
    if (filters.actorUserId) query.andWhere('r.actor_user_id = :actorUserId', { actorUserId: filters.actorUserId });
    if (filters.subjectUserId) query.andWhere('r.subject_user_id = :subjectUserId', { subjectUserId: filters.subjectUserId });
    if (filters.sourceService) query.andWhere('r.source_service = :sourceService', { sourceService: filters.sourceService });
    if (filters.occurredFrom) query.andWhere('r.occurred_at >= :from', { from: filters.occurredFrom });
    if (filters.occurredTo) query.andWhere('r.occurred_at <= :to', { to: filters.occurredTo });

    query
      .orderBy('r.occurred_at', 'DESC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findById(id: string): Promise<AuditRecord | null> {
    return this.repo.findOne({ where: { id } });
  }

  private isUniqueViolation(err: unknown): boolean {
    // Postgres unique_violation error code, surfaced by `pg` as `.code`.
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
  }
}

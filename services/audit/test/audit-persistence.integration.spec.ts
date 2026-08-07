import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventDto, AuditEventType } from '@sis/shared-dtos';
import { AuditRecord } from '../src/audit/audit-record.entity';
import { AuditPersistenceService } from '../src/audit/audit-persistence.service';

/**
 * Runs against a real Postgres instance (not mocked) — same reasoning
 * as Grades' own persistence tests: append-only/idempotency guarantees
 * are exactly the kind of thing a mocked repository can't actually
 * verify, since the guarantee lives in the interaction with Postgres's
 * own unique-constraint enforcement, not in this service's own logic.
 *
 * Expects a Postgres reachable at the env vars below. In CI/local dev
 * this is the `audit-db` container from docker-compose; here it's
 * pointed at a dedicated `audit_test` database on the `audit_svc`
 * role so it never touches real data.
 */
describe('AuditPersistenceService (integration)', () => {
  let dataSource: DataSource;
  let service: AuditPersistenceService;

  const baseEvent = (overrides: Partial<AuditEventDto> = {}): AuditEventDto => ({
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    eventType: AuditEventType.LOGIN_SUCCESS,
    actorUserId: 'user-1',
    sourceService: 'identity',
    correlationId: 'corr-1',
    occurredAt: new Date().toISOString(),
    ...overrides,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST ?? 'localhost',
          port: Number(process.env.TEST_DATABASE_PORT ?? 5436),
          username: process.env.TEST_DATABASE_USER ?? 'audit_svc',
          password: process.env.TEST_DATABASE_PASSWORD ?? 'changeme',
          database: process.env.TEST_DATABASE_NAME ?? 'audit_test',
          entities: [AuditRecord],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([AuditRecord]),
      ],
      providers: [AuditPersistenceService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(AuditPersistenceService);
  });

  afterEach(async () => {
    await dataSource.getRepository(AuditRecord).clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('persists a new event and it is retrievable', async () => {
    const event = baseEvent();
    const wasNew = await service.recordIfNew(event);
    expect(wasNew).toBe(true);

    const { items, total } = await service.findMany({ page: 1, pageSize: 10 });
    expect(total).toBe(1);
    expect(items[0].eventId).toBe(event.eventId);
    expect(items[0].eventType).toBe(AuditEventType.LOGIN_SUCCESS);
  });

  it('is idempotent: redelivering the same eventId does not create a duplicate row', async () => {
    const event = baseEvent({ eventId: 'dup-1' });

    const first = await service.recordIfNew(event);
    const second = await service.recordIfNew(event); // simulate RabbitMQ redelivery

    expect(first).toBe(true);
    expect(second).toBe(false);

    const { total } = await service.findMany({ page: 1, pageSize: 10 });
    expect(total).toBe(1);
  });

  it('is append-only: there is no method on the service that mutates an existing row', () => {
    // Static/structural assertion rather than a runtime one: the public
    // surface of AuditPersistenceService must never grow an update() or
    // delete(). If this test starts failing because someone added one,
    // that is the point of the test.
    const proto = Object.getPrototypeOf(service);
    const methodNames = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    expect(methodNames).toEqual(
      expect.arrayContaining(['recordIfNew', 'findMany', 'findById']),
    );
    expect(methodNames.some((n) => /update|delete|remove|patch/i.test(n))).toBe(false);
  });

  it('filters by eventType, actorUserId, and sourceService', async () => {
    await service.recordIfNew(baseEvent({ eventId: 'e1', eventType: AuditEventType.LOGIN_SUCCESS, actorUserId: 'alice' }));
    await service.recordIfNew(
      baseEvent({ eventId: 'e2', eventType: AuditEventType.GRADE_ENTERED, actorUserId: 'bob', sourceService: 'grades' }),
    );

    const byType = await service.findMany({ eventType: AuditEventType.GRADE_ENTERED, page: 1, pageSize: 10 });
    expect(byType.total).toBe(1);
    expect(byType.items[0].actorUserId).toBe('bob');

    const bySource = await service.findMany({ sourceService: 'grades', page: 1, pageSize: 10 });
    expect(bySource.total).toBe(1);

    const byActor = await service.findMany({ actorUserId: 'alice', page: 1, pageSize: 10 });
    expect(byActor.total).toBe(1);
  });

  it('paginates results and orders newest-first', async () => {
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) {
      await service.recordIfNew(
        baseEvent({ eventId: `page-${i}`, occurredAt: new Date(now + i * 1000).toISOString() }),
      );
    }

    const page1 = await service.findMany({ page: 1, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.items[0].eventId).toBe('page-4'); // newest first
    expect(page1.items[1].eventId).toBe('page-3');

    const page2 = await service.findMany({ page: 2, pageSize: 2 });
    expect(page2.items[0].eventId).toBe('page-2');
  });
});

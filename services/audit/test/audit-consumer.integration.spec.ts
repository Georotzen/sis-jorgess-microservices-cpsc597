import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as amqplib from 'amqplib';
import { AuditEventDto, AuditEventType } from '@sis/shared-dtos';
import { AuditRecord } from '../src/audit/audit-record.entity';
import { AuditPersistenceService } from '../src/audit/audit-persistence.service';
import { AuditConsumerService } from '../src/audit/audit-consumer.service';

/**
 * Runs against a real RabbitMQ broker and a real Postgres database —
 * this is the actual publisher -> exchange -> consumer -> persistence
 * path, not a mock of amqplib. Verifies the three things the Audit
 * service exists to guarantee: it receives what's published, it
 * dead-letters what it can't parse, and events genuinely land in the
 * database (not just "the consumer function was called").
 */
describe('AuditConsumerService (integration)', () => {
  let dataSource: DataSource;
  let persistence: AuditPersistenceService;
  let consumer: AuditConsumerService;
  let publisherConnection: amqplib.ChannelModel;
  let publisherChannel: amqplib.Channel;

  const EXCHANGE = process.env.RABBITMQ_AUDIT_EXCHANGE ?? 'sis.audit';
  const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

  const publish = (event: AuditEventDto, routingKey: string) =>
    publisherChannel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: 'application/json',
    });

  const waitUntil = async (predicate: () => Promise<boolean>, timeoutMs = 5000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Condition not met within timeout');
  };

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
      providers: [AuditPersistenceService, AuditConsumerService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    persistence = moduleRef.get(AuditPersistenceService);
    consumer = moduleRef.get(AuditConsumerService);

    // Mirrors identity's AuditPublisherService's own connect/assertExchange
    // — a real, independent publisher, not a stand-in for the consumer.
    publisherConnection = await amqplib.connect(RABBITMQ_URL);
    publisherChannel = await publisherConnection.createChannel();
    await publisherChannel.assertExchange(EXCHANGE, 'topic', { durable: true });

    await consumer.onModuleInit();
    // Give the consumer a moment to finish asserting/binding its queue
    // before the first publish — otherwise the very first message could
    // be published before the binding exists and would simply be
    // dropped by the exchange (expected AMQP behavior, not a bug).
    await new Promise((r) => setTimeout(r, 500));
  }, 20000);

  afterEach(async () => {
    await dataSource.getRepository(AuditRecord).clear();
  });

  afterAll(async () => {
    await consumer.onModuleDestroy();
    await publisherChannel.close();
    await publisherConnection.close();
    await dataSource.destroy();
  }, 20000);

  it('persists an event published to the real exchange', async () => {
    const event: AuditEventDto = {
      eventId: 'consumer-test-1',
      eventType: AuditEventType.LOGIN_SUCCESS,
      actorUserId: 'user-42',
      sourceService: 'identity',
      correlationId: 'corr-42',
      occurredAt: new Date().toISOString(),
    };

    publish(event, AuditEventType.LOGIN_SUCCESS);

    await waitUntil(async () => {
      const { total } = await persistence.findMany({ page: 1, pageSize: 10 });
      return total === 1;
    });

    const { items } = await persistence.findMany({ page: 1, pageSize: 10 });
    expect(items[0].eventId).toBe('consumer-test-1');
    expect(items[0].actorUserId).toBe('user-42');
  }, 10000);

  it('picks up events regardless of routing key, including ones not in the current enum', async () => {
    // Proves the '#' binding claim in the module docstring: a routing
    // key this consumer has never seen before still gets persisted.
    const event: AuditEventDto = {
      eventId: 'consumer-test-2',
      eventType: 'some.future.event.type' as AuditEventType,
      actorUserId: 'user-99',
      sourceService: 'future-service',
      correlationId: 'corr-99',
      occurredAt: new Date().toISOString(),
    };

    publish(event, 'some.future.event.type');

    await waitUntil(async () => {
      const { total } = await persistence.findMany({ page: 1, pageSize: 10 });
      return total === 1;
    });
  }, 10000);

  it('does not create a duplicate row if the same event is delivered twice', async () => {
    const event: AuditEventDto = {
      eventId: 'consumer-test-dup',
      eventType: AuditEventType.LOGOUT,
      actorUserId: 'user-7',
      sourceService: 'identity',
      correlationId: 'corr-7',
      occurredAt: new Date().toISOString(),
    };

    publish(event, AuditEventType.LOGOUT);
    publish(event, AuditEventType.LOGOUT); // simulate a duplicate delivery

    await waitUntil(async () => {
      const { total } = await persistence.findMany({ page: 1, pageSize: 10 });
      return total >= 1;
    });

    // Give the second (duplicate) message time to be processed too,
    // then assert it did NOT become a second row.
    await new Promise((r) => setTimeout(r, 1000));
    const { total } = await persistence.findMany({ page: 1, pageSize: 10 });
    expect(total).toBe(1);
  }, 10000);

  it('dead-letters a malformed (unparsable) message instead of retrying forever', async () => {
    const dlq = `${process.env.RABBITMQ_AUDIT_QUEUE ?? 'audit.events'}.dead-letter`;

    publisherChannel.publish(EXCHANGE, 'malformed.event', Buffer.from('not valid json'), {
      persistent: true,
    });

    await waitUntil(async () => {
      const check = await publisherChannel.checkQueue(dlq);
      return check.messageCount >= 1;
    });

    const msg = await publisherChannel.get(dlq, { noAck: true });
    expect(msg).not.toBe(false);
    expect(msg && msg.content.toString('utf8')).toBe('not valid json');
  }, 10000);
});

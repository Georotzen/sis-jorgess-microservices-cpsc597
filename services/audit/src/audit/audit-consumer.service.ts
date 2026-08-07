import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { AuditEventDto } from '@sis/shared-dtos';
import { AuditPersistenceService } from './audit-persistence.service';

/**
 * Consumes every message published to the `sis.audit` topic exchange
 * (see identity's AuditPublisherService, and grades'/enrollment's
 * copies of the same publisher) and persists it via
 * AuditPersistenceService. This is the other half of that publisher:
 * without a consumer bound to the exchange, published events would
 * simply have nowhere to go.
 *
 * Binds with routing key `#` (everything) rather than one binding per
 * AuditEventType — this service's job is to be the durable, complete
 * record of every security-relevant event in the platform, so it must
 * never fall behind the publishers' own enum as new event types are
 * added there. A publishing service adding a new AuditEventType value
 * requires zero changes here.
 */
@Injectable()
export class AuditConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditConsumerService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly exchange = process.env.RABBITMQ_AUDIT_EXCHANGE ?? 'sis.audit';
  private readonly queue = process.env.RABBITMQ_AUDIT_QUEUE ?? 'audit.events';
  private readonly dlq = `${this.queue}.dead-letter`;

  constructor(private readonly persistence: AuditPersistenceService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqplib.connect(
        process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      );
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });

      // Dead-letter queue: a message this service repeatedly fails to
      // process (malformed payload, persistent DB error) goes here
      // instead of being silently dropped or looping forever — an
      // audit gap must be visible/investigable, not invisible.
      await this.channel.assertExchange(`${this.exchange}.dlx`, 'fanout', { durable: true });
      await this.channel.assertQueue(this.dlq, { durable: true });
      await this.channel.bindQueue(this.dlq, `${this.exchange}.dlx`, '');

      await this.channel.assertQueue(this.queue, {
        durable: true,
        deadLetterExchange: `${this.exchange}.dlx`,
      });
      await this.channel.bindQueue(this.queue, this.exchange, '#');

      // Process one message at a time per consumer before acking —
      // simple backpressure so a burst of events can't be pulled into
      // memory faster than they're persisted.
      await this.channel.prefetch(1);

      await this.channel.consume(this.queue, (msg) => this.handleMessage(msg), {
        noAck: false,
      });

      this.logger.log(`Consuming audit events from '${this.exchange}' -> queue '${this.queue}'`);
    } catch (err) {
      this.logger.error('Failed to initialize RabbitMQ audit consumer', err as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(msg: amqplib.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    let event: AuditEventDto;
    try {
      event = JSON.parse(msg.content.toString('utf8')) as AuditEventDto;
      this.assertValidShape(event);
    } catch (err) {
      // Malformed payload can never become valid on retry — requeue
      // would just loop forever. Dead-letter it once and move on.
      this.logger.error('Discarding malformed audit message', err as Error);
      this.channel.nack(msg, false, false);
      return;
    }

    try {
      const wasNew = await this.persistence.recordIfNew(event);
      this.channel.ack(msg);
      if (!wasNew) {
        this.logger.debug(`Ack'd duplicate redelivery of event ${event.eventId}`);
      }
    } catch (err) {
      // A transient DB error (e.g. connection blip) SHOULD be retried,
      // but this consumer doesn't distinguish transient vs. permanent
      // failures — messages here have already passed shape validation,
      // so requeueing once is the pragmatic default; a real deployment
      // would add a bounded retry count via a header, then dead-letter.
      this.logger.error(`Failed to persist audit event ${event.eventId}, will retry once`, err as Error);
      const alreadyRedelivered = msg.fields.redelivered;
      this.channel.nack(msg, false, !alreadyRedelivered);
    }
  }

  private assertValidShape(event: AuditEventDto): void {
    if (!event.eventId || !event.eventType || !event.actorUserId || !event.sourceService || !event.occurredAt) {
      throw new Error('Audit event missing required fields');
    }
  }
}

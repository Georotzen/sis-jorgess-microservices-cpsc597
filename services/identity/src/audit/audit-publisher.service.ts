import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { randomUUID } from 'crypto';
import { AuditEventDto, AuditEventType } from '@sis/shared-dtos';

/**
 * Publishes audit events for security-relevant actions in this service
 * (login success/failure, role assignment, registration) to the shared
 * audit exchange, consumed by the Audit & Logging Service.
 *
 * Deliberately fire-and-forget with a logged warning on failure rather
 * than throwing: a RabbitMQ outage should not block a student from
 * logging in. The tradeoff (an audit gap during an outage) is accepted
 * here and should be called out explicitly in the STRIDE threat model
 * under Repudiation, with monitoring/alerting on publish failures as
 * the compensating control.
 */
@Injectable()
export class AuditPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditPublisherService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly exchange = process.env.RABBITMQ_AUDIT_EXCHANGE ?? 'sis.audit';

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqplib.connect(
        process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      );
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ for audit publishing', err as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(
    eventType: AuditEventType,
    fields: {
      actorUserId: string;
      subjectUserId?: string;
      metadata?: Record<string, string | number | boolean>;
      correlationId?: string;
    },
  ): Promise<void> {
    const event: AuditEventDto = {
      eventId: randomUUID(),
      eventType,
      actorUserId: fields.actorUserId,
      subjectUserId: fields.subjectUserId,
      sourceService: 'identity',
      metadata: fields.metadata,
      correlationId: fields.correlationId ?? randomUUID(),
      occurredAt: new Date().toISOString(),
    };

    if (!this.channel) {
      this.logger.warn(
        `Audit channel unavailable — dropped event ${eventType} (${event.eventId})`,
      );
      return;
    }

    try {
      this.channel.publish(
        this.exchange,
        eventType, // routing key = event type, e.g. "login.success"
        Buffer.from(JSON.stringify(event)),
        { persistent: true, contentType: 'application/json' },
      );
    } catch (err) {
      this.logger.error(`Failed to publish audit event ${eventType}`, err as Error);
    }
  }
}

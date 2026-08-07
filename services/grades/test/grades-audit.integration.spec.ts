import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as amqplib from 'amqplib';
import { AuditEventType, AuthenticatedUser, EnterGradeDto, Role } from '@sis/shared-dtos';
import { GradeRecord } from '../src/grades/grade-record.entity';
import { GradesService } from '../src/grades/grades.service';
import { InstructorVerificationService } from '../src/instructor-verification/instructor-verification.service';
import { AuditPublisherService } from '../src/audit/audit-publisher.service';

/**
 * Same shape as enrollment's own audit-publishing integration test:
 * proves GradesService.enterGrade actually reaches the real `sis.audit`
 * exchange, and that a first entry vs. a correction get distinct
 * event types as documented.
 */
describe('GradesService audit publishing (integration)', () => {
  let dataSource: DataSource;
  let service: GradesService;
  let listenerConnection: amqplib.ChannelModel;
  let listenerChannel: amqplib.Channel;
  let listenerQueue: string;

  const EXCHANGE = process.env.RABBITMQ_AUDIT_EXCHANGE ?? 'sis.audit';
  const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

  const administrator: AuthenticatedUser = {
    userId: 'admin-1',
    username: 'admin',
    email: 'admin@example.com',
    roles: [Role.ADMINISTRATOR],
  };

  const nextMessage = async (timeoutMs = 5000): Promise<Record<string, unknown>> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const msg = await listenerChannel.get(listenerQueue, { noAck: false });
      if (msg) {
        listenerChannel.ack(msg);
        return JSON.parse(msg.content.toString('utf8'));
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Timed out waiting for message');
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST ?? 'localhost',
          port: Number(process.env.TEST_DATABASE_PORT ?? 5432),
          username: process.env.TEST_DATABASE_USER ?? 'grades_svc',
          password: process.env.TEST_DATABASE_PASSWORD ?? 'changeme',
          database: process.env.TEST_DATABASE_NAME ?? 'grades_test',
          entities: [GradeRecord],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([GradeRecord]),
      ],
      providers: [GradesService, InstructorVerificationService, AuditPublisherService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(GradesService);
    await moduleRef.get(AuditPublisherService).onModuleInit();

    listenerConnection = await amqplib.connect(RABBITMQ_URL);
    listenerChannel = await listenerConnection.createChannel();
    await listenerChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
    const { queue } = await listenerChannel.assertQueue('', { exclusive: true });
    listenerQueue = queue;
    await listenerChannel.bindQueue(listenerQueue, EXCHANGE, '#');
  }, 20000);

  afterAll(async () => {
    await listenerChannel.close();
    await listenerConnection.close();
    await dataSource.destroy();
  }, 20000);

  it('publishes GRADE_ENTERED for a first-time entry', async () => {
    const dto: EnterGradeDto = {
      studentId: 'student-1',
      courseSectionId: 'section-1',
      letterGrade: 'B+',
    };

    const message = await Promise.all([
      service.enterGrade(dto, administrator, undefined),
      nextMessage(),
    ]).then(([, msg]) => msg);

    expect(message.eventType).toBe(AuditEventType.GRADE_ENTERED);
    expect(message.actorUserId).toBe('admin-1');
    expect(message.subjectUserId).toBe('student-1');
  }, 10000);

  it('publishes GRADE_MODIFIED for a correction to an existing grade', async () => {
    const dto: EnterGradeDto = {
      studentId: 'student-2',
      courseSectionId: 'section-2',
      letterGrade: 'C',
    };
    await service.enterGrade(dto, administrator, undefined);
    await nextMessage(); // drain the GRADE_ENTERED from the first entry

    const correction: EnterGradeDto = { ...dto, letterGrade: 'B' };
    const message = await Promise.all([
      service.enterGrade(correction, administrator, undefined),
      nextMessage(),
    ]).then(([, msg]) => msg);

    expect(message.eventType).toBe(AuditEventType.GRADE_MODIFIED);
  }, 10000);
});

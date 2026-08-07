import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

// Use require and loose typing for amqplib in tests to avoid missing
// ambient type declarations in some environments.
declare const require: any;
const amqplib: any = require('amqplib');
const process: any = require('process');
import { AuditEventType, CreateEnrollmentDto, EnrollmentStatus } from '@sis/shared-dtos';
import { Enrollment } from '../src/enrollment/enrollment.entity';
import { CourseSection } from '../src/course-section/course-section.entity';
import { EnrollmentService } from '../src/enrollment/enrollment.service';
import { AuditPublisherService } from '../src/audit/audit-publisher.service';

/**
 * Proves the gap identified during the DB-isolation/audit review is
 * actually closed: EnrollmentService now publishes real audit events
 * to the same `sis.audit` exchange the Audit service consumes from —
 * not just that AuditPublisherService.publish() was called (which a
 * mock would show), but that a message a real subscriber on that
 * exchange actually receives.
 */
describe('EnrollmentService audit publishing (integration)', () => {
  let dataSource: DataSource;
  let service: EnrollmentService;
  // Use loose typing for AMQP objects in tests to avoid needing
  // ambient amqplib type declarations in the test environment.
  let listenerConnection: any;
  let listenerChannel: any;
  let listenerQueue: string;

  const EXCHANGE = process.env.RABBITMQ_AUDIT_EXCHANGE ?? 'sis.audit';
  const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

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
          username: process.env.TEST_DATABASE_USER ?? 'enrollment_svc',
          password: process.env.TEST_DATABASE_PASSWORD ?? 'changeme',
          database: process.env.TEST_DATABASE_NAME ?? 'enrollment_test',
          entities: [Enrollment, CourseSection],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Enrollment, CourseSection]),
      ],
      providers: [EnrollmentService, AuditPublisherService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(EnrollmentService);
    await moduleRef.get(AuditPublisherService).onModuleInit();

    // Independent listener bound to the real exchange with a temporary
    // exclusive queue — same exchange the real Audit service binds to,
    // just via its own queue rather than `audit.events`.
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

  it('publishes ENROLLMENT_CREATED when a student enrolls', async () => {
    const sectionRepo = dataSource.getRepository(CourseSection);
    const section = await sectionRepo.save(
      sectionRepo.create({
        courseCode: 'CS101',
        title: 'Intro to CS',
        termId: 'fall-2026',
        instructorUserId: 'instructor-1',
        capacity: 30,
        enrolledCount: 0,
      }),
    );

    const dto: CreateEnrollmentDto = {
      studentId: 'student-1',
      courseSectionId: section.id,
      termId: 'fall-2026',
    };

    const [enrollment, message] = await Promise.all([
      service.create(dto),
      nextMessage(),
    ]);

    expect(enrollment.status).toBe(EnrollmentStatus.ENROLLED);
    expect(message.eventType).toBe(AuditEventType.ENROLLMENT_CREATED);
    expect(message.actorUserId).toBe('student-1');
    expect(message.subjectUserId).toBe('student-1');
    expect(message.sourceService).toBe('enrollment');
  }, 10000);

  it('publishes ENROLLMENT_DROPPED when a student drops', async () => {
    const sectionRepo = dataSource.getRepository(CourseSection);
    const section = await sectionRepo.save(
      sectionRepo.create({
        courseCode: 'CS102',
        title: 'Data Structures',
        termId: 'fall-2026',
        instructorUserId: 'instructor-1',
        capacity: 30,
        enrolledCount: 0,
      }),
    );

    const created = await service.create(
      { studentId: 'student-2', courseSectionId: section.id, termId: 'fall-2026' },
    );

    // Drain the ENROLLMENT_CREATED message from the shared listener
    // queue first so it isn't mistaken for the drop event below.
    await nextMessage();

    const [, message] = await Promise.all([
      service.updateStatus(created.id, { status: EnrollmentStatus.DROPPED }),
      nextMessage(),
    ]);

    expect(message.eventType).toBe(AuditEventType.ENROLLMENT_DROPPED);
    expect(message.actorUserId).toBe('student-2');
    expect(message.subjectUserId).toBe('student-2');
  }, 10000);

  it('does NOT publish an event for a status transition with no corresponding AuditEventType', async () => {
    const sectionRepo = dataSource.getRepository(CourseSection);
    const section = await sectionRepo.save(
      sectionRepo.create({
        courseCode: 'CS103',
        title: 'Algorithms',
        termId: 'fall-2026',
        instructorUserId: 'instructor-1',
        capacity: 30,
        enrolledCount: 0,
      }),
    );

    const created = await service.create(
      { studentId: 'student-3', courseSectionId: section.id, termId: 'fall-2026' },
    
    );
    await nextMessage(); // drain ENROLLMENT_CREATED

    await service.updateStatus(created.id, { status: EnrollmentStatus.COMPLETED });

    // No ENROLLMENT_* event exists for COMPLETED, so nothing should
    // arrive; confirm by racing the wait against a short timeout.
    await expect(nextMessage(1500)).rejects.toThrow('Timed out');
  }, 10000);
});

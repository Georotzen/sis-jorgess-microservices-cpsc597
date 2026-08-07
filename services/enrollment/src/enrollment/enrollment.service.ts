import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  EnrollmentAlreadyExistsException,
  EnrollmentCapacityExceededException,
  NotFoundAppException,
} from '@sis/shared-errors';
import { CreateEnrollmentDto, EnrollmentStatus, UpdateEnrollmentStatusDto } from '@sis/shared-dtos';
import { Enrollment } from './enrollment.entity';
import { CourseSection } from '../course-section/course-section.entity';

/** Statuses that count as "the student has a live claim on this section". */
const ACTIVE_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING,
  EnrollmentStatus.ENROLLED,
  EnrollmentStatus.WAITLISTED,
];

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enroll a student. No capacity error is thrown here on purpose: if
   * the section is full, the student is created as WAITLISTED instead
   * of rejected outright. EnrollmentCapacityExceededException is
   * reserved for updateStatus(), where a staff member explicitly tries
   * to force someone into ENROLLED — that action should fail loudly if
   * there's genuinely no room, whereas a plain enroll-request shouldn't.
   */
  async create(dto: CreateEnrollmentDto): Promise<Enrollment> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the section row for the rest of this transaction. Without
      // this, two concurrent requests could both read
      // enrolledCount < capacity as true and both get seats, overshooting
      // capacity — Postgres blocks the second transaction's lock
      // acquisition until the first commits or rolls back.
      const section = await manager.findOne(CourseSection, {
        where: { id: dto.courseSectionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!section) {
        throw new NotFoundAppException(`Course section ${dto.courseSectionId} not found`);
      }

      const existing = await manager.findOne(Enrollment, {
        where: { studentId: dto.studentId, courseSectionId: dto.courseSectionId },
      });
      if (existing && ACTIVE_STATUSES.includes(existing.status)) {
        throw new EnrollmentAlreadyExistsException();
      }

      const hasRoom = section.enrolledCount < section.capacity;

      if (hasRoom) {
        section.enrolledCount += 1;
        await manager.save(section);
      }

      const enrollment = manager.create(Enrollment, {
        studentId: dto.studentId,
        courseSectionId: dto.courseSectionId,
        termId: dto.termId,
        status: hasRoom ? EnrollmentStatus.ENROLLED : EnrollmentStatus.WAITLISTED,
      });
      return manager.save(enrollment);
    });
  }

  async findById(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id } });
    if (!enrollment) {
      throw new NotFoundAppException(`Enrollment ${id} not found`);
    }
    return enrollment;
  }

  findForStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepo.find({ where: { studentId } });
  }

  findForSection(courseSectionId: string): Promise<Enrollment[]> {
    return this.enrollmentRepo.find({ where: { courseSectionId } });
  }

  /**
   * Status transitions DO enforce capacity strictly. Moving a student
   * into ENROLLED (e.g. promoting them off the waitlist) locks the
   * section and throws EnrollmentCapacityExceededException if there's
   * no room; moving a student OUT of ENROLLED frees a seat. Transitions
   * that don't cross the ENROLLED boundary (e.g. PENDING -> WAITLISTED)
   * don't touch enrolledCount at all.
   */
  async updateStatus(id: string, dto: UpdateEnrollmentStatusDto): Promise<Enrollment> {
    return this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, { where: { id } });
      if (!enrollment) {
        throw new NotFoundAppException(`Enrollment ${id} not found`);
      }

      const wasEnrolled = enrollment.status === EnrollmentStatus.ENROLLED;
      const willBeEnrolled = dto.status === EnrollmentStatus.ENROLLED;

      if (wasEnrolled !== willBeEnrolled) {
        const section = await manager.findOne(CourseSection, {
          where: { id: enrollment.courseSectionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!section) {
          throw new NotFoundAppException(
            `Course section ${enrollment.courseSectionId} not found`,
          );
        }

        if (willBeEnrolled) {
          if (section.enrolledCount >= section.capacity) {
            throw new EnrollmentCapacityExceededException();
          }
          section.enrolledCount += 1;
        } else {
          section.enrolledCount = Math.max(0, section.enrolledCount - 1);
        }
        await manager.save(section);
      }

      enrollment.status = dto.status;
      return manager.save(enrollment);
    });
  }
}

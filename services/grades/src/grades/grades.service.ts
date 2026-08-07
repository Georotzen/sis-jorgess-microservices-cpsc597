import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser, EnterGradeDto, Role } from '@sis/shared-dtos';
import { GradeRecord } from './grade-record.entity';
import { InstructorVerificationService } from '../instructor-verification/instructor-verification.service';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(GradeRecord)
    private readonly repo: Repository<GradeRecord>,
    private readonly instructorVerification: InstructorVerificationService,
  ) {}

  /**
   * Administrators bypass the instructor-of-record check (an explicit
   * override capability, same shape as Student Profile/Enrollment's
   * "Administrator may act on anyone's behalf" rule) — Faculty must
   * pass it every time, since role alone doesn't prove section
   * ownership.
   */
  async enterGrade(
    dto: EnterGradeDto,
    user: AuthenticatedUser,
    authorizationHeader: string | undefined,
  ): Promise<GradeRecord> {
    if (!user.roles.includes(Role.ADMINISTRATOR)) {
      await this.instructorVerification.assertInstructorOfRecord(
        dto.courseSectionId,
        user.userId,
        authorizationHeader,
      );
    }

    const previous = await this.getLatestRecord(dto.studentId, dto.courseSectionId);

    const record = this.repo.create({
      studentId: dto.studentId,
      courseSectionId: dto.courseSectionId,
      changedByUserId: user.userId,
      previousGrade: previous?.newGrade ?? null,
      newGrade: dto.letterGrade,
      comment: dto.comment ?? null,
    });
    return this.repo.save(record);
  }

  private getLatestRecord(
    studentId: string,
    courseSectionId: string,
  ): Promise<GradeRecord | null> {
    return this.repo.findOne({
      where: { studentId, courseSectionId },
      order: { changedAt: 'DESC' },
    });
  }

  /** Current grade for one student+section, or null if never entered. */
  getCurrentGrade(studentId: string, courseSectionId: string): Promise<GradeRecord | null> {
    return this.getLatestRecord(studentId, courseSectionId);
  }

  /**
   * All of a student's current grades, one row per section they've ever
   * been graded in — computed as the latest record per courseSectionId,
   * not a raw dump of every historical row.
   */
  async getCurrentGradesForStudent(studentId: string): Promise<GradeRecord[]> {
    const all = await this.repo.find({
      where: { studentId },
      order: { changedAt: 'DESC' },
    });
    const latestPerSection = new Map<string, GradeRecord>();
    for (const record of all) {
      if (!latestPerSection.has(record.courseSectionId)) {
        latestPerSection.set(record.courseSectionId, record);
      }
    }
    return [...latestPerSection.values()];
  }

  /** Full immutable history for one student+section, oldest first. */
  getHistory(studentId: string, courseSectionId: string): Promise<GradeRecord[]> {
    return this.repo.find({
      where: { studentId, courseSectionId },
      order: { changedAt: 'ASC' },
    });
  }
}

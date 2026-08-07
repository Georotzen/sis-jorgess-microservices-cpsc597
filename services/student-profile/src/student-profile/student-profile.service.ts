import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictAppException,
  NotFoundAppException,
} from '@sis/shared-errors';
import {
  CreateStudentProfileDto,
  UpdateStudentProfileDto,
  StudentProfileSummaryDto,
} from '@sis/shared-dtos';
import { StudentProfile } from './student-profile.entity';

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly repo: Repository<StudentProfile>,
  ) {}

  async create(dto: CreateStudentProfileDto): Promise<StudentProfile> {
    const existing = await this.repo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      // One profile per Identity user — not a data-loss risk of
      // overwriting SENSITIVE fields via a duplicate create.
      throw new ConflictAppException(`A profile already exists for user ${dto.userId}`);
    }

    const profile = this.repo.create({
      userId: dto.userId,
      legalFirstName: dto.legalFirstName,
      legalLastName: dto.legalLastName,
      dateOfBirth: dto.dateOfBirth,
      phoneNumber: dto.phoneNumber ?? null,
      homeAddress: dto.homeAddress ?? null,
      studentIdNumber: dto.studentIdNumber ?? null,
    });
    return this.repo.save(profile);
  }

  async findByUserId(userId: string): Promise<StudentProfile> {
    const profile = await this.repo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundAppException(`Student profile for user ${userId} not found`);
    }
    return profile;
  }

  /**
   * Only phoneNumber/homeAddress are updatable here — see
   * UpdateStudentProfileDto's own comment in @sis/shared-dtos.
   * Legal-identity fields (name, DOB) deliberately have no update path
   * yet: changing them needs an audited, Administrator-driven
   * correction flow, not a self-service PATCH.
   */
  async update(userId: string, dto: UpdateStudentProfileDto): Promise<StudentProfile> {
    const profile = await this.findByUserId(userId); // 404s if missing
    if (dto.phoneNumber !== undefined) profile.phoneNumber = dto.phoneNumber;
    if (dto.homeAddress !== undefined) profile.homeAddress = dto.homeAddress;
    return this.repo.save(profile);
  }

  /**
   * Redacted projection — see StudentProfileSummaryDto's docstring.
   * Never include legalFirstName/legalLastName/dateOfBirth/phoneNumber/
   * homeAddress here in any form, including partial (e.g. a full
   * birth-year), since that's exactly the class of leak this DTO exists
   * to prevent for non-Administrator staff callers.
   */
  toSummary(profile: StudentProfile): StudentProfileSummaryDto {
    const initial = profile.legalFirstName.charAt(0).toUpperCase();
    return {
      userId: profile.userId,
      studentIdNumber: profile.studentIdNumber ?? undefined,
      displayName: `${initial}. ${profile.legalLastName}`,
    };
  }
}

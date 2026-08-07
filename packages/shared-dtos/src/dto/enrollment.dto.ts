import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class CreateEnrollmentDto {
  @IsString()
  studentId!: string;

  @IsString()
  courseSectionId!: string;

  @IsString()
  termId!: string;
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}

export class EnrollmentDto {
  id!: string;
  studentId!: string;
  courseSectionId!: string;
  termId!: string;
  status!: EnrollmentStatus;
  createdAt!: string;
  updatedAt!: string;
}

/**
 * Faculty/Administrator-only. Deliberately excludes `id` and
 * `enrolledCount` — the id is generated, and enrolledCount is a
 * derived/mutated-in-transaction counter (see CourseSection entity in
 * the Enrollment service), never something a client sets directly.
 */
export class CreateCourseSectionDto {
  @IsString()
  courseCode!: string;

  @IsString()
  title!: string;

  @IsString()
  termId!: string;

  @IsString()
  instructorUserId!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}


export class CourseSectionDto {
  id!: string;
  courseCode!: string;
  title!: string;
  termId!: string;
  instructorUserId!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsInt()
  @Min(0)
  enrolledCount!: number;
}

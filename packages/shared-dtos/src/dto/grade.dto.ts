import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Letter grades accepted by the platform. Adjust to your institution's scale. */
export const ALLOWED_LETTER_GRADES = [
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D',
  'F',
  'I', // Incomplete
  'W', // Withdrawn
] as const;
export type LetterGrade = (typeof ALLOWED_LETTER_GRADES)[number];

/**
 * Faculty-only endpoint. The Grades service must independently verify
 * (not just trust the Gateway) that the caller is FACULTY and is the
 * instructor of record for courseSectionId before accepting this.
 */
export class EnterGradeDto {
  @IsString()
  studentId!: string;

  @IsString()
  courseSectionId!: string;

  @IsIn(ALLOWED_LETTER_GRADES)
  letterGrade!: LetterGrade;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

/**
 * Every grade entry/modification produces one of these, which the
 * Grades service publishes to the Audit & Logging Service. Immutable —
 * corrections are new records, never in-place edits.
 */
export class GradeAuditRecordDto {
  id!: string;
  studentId!: string;
  courseSectionId!: string;
  changedByUserId!: string; // faculty member who made the change
  previousGrade?: LetterGrade;
  newGrade!: LetterGrade;
  changedAt!: string; // ISO 8601
}

/** Read model returned to students/advisors. No instructor comments unless advisor role. */
export class GradeDto {
  studentId!: string;
  courseSectionId!: string;
  letterGrade!: LetterGrade;
  updatedAt!: string;
}

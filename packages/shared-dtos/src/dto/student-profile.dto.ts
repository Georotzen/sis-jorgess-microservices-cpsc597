import {
  IsDateString,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Fields marked SENSITIVE below must be stored with field-level
 * encryption at rest in the Student Profile database, per the
 * architecture notes. They should never appear in plain form in
 * logs, audit events, or error messages.
 */
export class CreateStudentProfileDto {
  @IsString()
  userId!: string; // FK to Identity service's user id, not a local join

  @IsString()
  @MaxLength(100)
  legalFirstName!: string; // SENSITIVE

  @IsString()
  @MaxLength(100)
  legalLastName!: string; // SENSITIVE

  @IsDateString()
  dateOfBirth!: string; // SENSITIVE

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string; // SENSITIVE

  @IsOptional()
  @IsString()
  @MaxLength(255)
  homeAddress?: string; // SENSITIVE

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentIdNumber?: string;
}

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string; // SENSITIVE

  @IsOptional()
  @IsString()
  @MaxLength(255)
  homeAddress?: string; // SENSITIVE
}

/**
 * Redacted projection safe to return to advisors/faculty who need to
 * look up a student but should not see full sensitive demographic data.
 * Only Student Profile Service + Administrator role should ever see
 * the unredacted fields above.
 */
export class StudentProfileSummaryDto {
  userId!: string;
  studentIdNumber?: string;
  displayName!: string; // e.g. "J. Smith" — not full legal name
}

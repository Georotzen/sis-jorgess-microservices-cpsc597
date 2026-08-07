import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EnrollmentStatus } from '@sis/shared-dtos';

@Entity({ name: 'enrollments' })
// A student may have more than one historical row for the same section
// (e.g. drop and re-add across terms isn't possible since termId is
// fixed per section, but a DROPPED row plus a fresh attempt could still
// exist) — so this is a lookup index, not a uniqueness constraint.
// Active-enrollment uniqueness (no two non-DROPPED rows for the same
// student+section) is enforced in EnrollmentService, not the schema,
// because "active" depends on `status` and Postgres partial unique
// indexes aren't worth the added migration complexity for a capstone.
@Index(['studentId', 'courseSectionId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Keycloak sub of the enrolled student — FK to Identity, not a local join. */
  @Column({ name: 'student_id' })
  studentId!: string;

  @Column({ name: 'course_section_id' })
  courseSectionId!: string;

  @Column({ name: 'term_id' })
  termId!: string;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  status!: EnrollmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

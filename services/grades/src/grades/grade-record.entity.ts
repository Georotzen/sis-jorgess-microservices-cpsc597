import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ALLOWED_LETTER_GRADES } from '@sis/shared-dtos';

/**
 * Append-only. Every grade entry or correction inserts a NEW row here —
 * there is no update path, per GradeAuditRecordDto's own docstring in
 * @sis/shared-dtos ("Immutable — corrections are new records, never
 * in-place edits"). The "current" grade for a student+section is simply
 * the most recent row for that pair (see GradesService.getCurrentGrade),
 * derived by query rather than tracked in a separate mutable table —
 * that way there is exactly one write path and it's impossible for a
 * "current" projection to drift out of sync with the history.
 */
@Entity({ name: 'grade_records' })
@Index(['studentId', 'courseSectionId'])
export class GradeRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Keycloak sub of the graded student — FK to Identity, not a local join. */
  @Column({ name: 'student_id' })
  studentId!: string;

  @Column({ name: 'course_section_id' })
  courseSectionId!: string;

  /** Keycloak sub of the Faculty/Administrator who made this entry. */
  @Column({ name: 'changed_by_user_id' })
  changedByUserId!: string;

  @Column({
    name: 'previous_grade',
    type: 'enum',
    enum: ALLOWED_LETTER_GRADES,
    nullable: true,
  })
  previousGrade?: string | null;

  @Column({ name: 'new_grade', type: 'enum', enum: ALLOWED_LETTER_GRADES })
  newGrade!: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  /**
   * Postgres timestamp precision is microseconds, so two sequential
   * HTTP requests landing in the same instant is negligible for this
   * scale — ordering "current" by this column alone is fine without a
   * separate monotonic sequence column.
   */
  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}

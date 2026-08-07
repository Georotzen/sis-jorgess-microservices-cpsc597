import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * `enrolledCount` is a denormalized counter, not derived on read by
 * COUNT(*)-ing enrollments. It's only ever mutated inside a transaction
 * that also locks this row (`SELECT ... FOR UPDATE`, see
 * EnrollmentService), which is what makes "check capacity, then act" in
 * EnrollmentService.create/updateStatus race-safe under concurrent
 * requests instead of a classic check-then-act TOCTOU bug.
 */
@Entity({ name: 'course_sections' })
export class CourseSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'course_code' })
  courseCode!: string;

  @Column()
  title!: string;

  @Column({ name: 'term_id' })
  termId!: string;

  /** Keycloak sub of the Faculty user of record — FK to Identity, not a local join. */
  @Column({ name: 'instructor_user_id' })
  instructorUserId!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ name: 'enrolled_count', type: 'int', default: 0 })
  enrolledCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

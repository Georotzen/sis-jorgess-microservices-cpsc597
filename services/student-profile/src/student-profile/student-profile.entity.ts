import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { encryptedColumn } from '../common/crypto/field-encryption.transformer';

/**
 * Columns backed by `encryptedColumn` store ciphertext, not plaintext —
 * see common/crypto/field-encryption.ts. They're declared `text` rather
 * than a typed/length-constrained column (e.g. `date`, `varchar(20)`)
 * because ciphertext is neither a valid date literal nor a predictable
 * length, and MUST NOT be indexed or used in a WHERE clause — Postgres
 * can't do anything useful with encrypted bytes, and a query plan that
 * tried would leak access patterns anyway.
 */
@Entity({ name: 'student_profiles' })
export class StudentProfile {
  /** FK to Identity's user id (Keycloak sub) — not a local join. */
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ name: 'legal_first_name', type: 'text', transformer: encryptedColumn })
  legalFirstName!: string; // SENSITIVE — encrypted at rest

  @Column({ name: 'legal_last_name', type: 'text', transformer: encryptedColumn })
  legalLastName!: string; // SENSITIVE — encrypted at rest

  @Column({ name: 'date_of_birth', type: 'text', transformer: encryptedColumn })
  dateOfBirth!: string; // SENSITIVE — encrypted at rest, stored as an ISO date string

  @Column({
    name: 'phone_number',
    type: 'text',
    nullable: true,
    transformer: encryptedColumn,
  })
  phoneNumber?: string | null; // SENSITIVE — encrypted at rest

  @Column({
    name: 'home_address',
    type: 'text',
    nullable: true,
    transformer: encryptedColumn,
  })
  homeAddress?: string | null; // SENSITIVE — encrypted at rest

  /**
   * NOT sensitive/PII-grade on its own (it's an internal id, not a
   * legal identifier), so it's kept plain — that's also what lets it be
   * unique-indexed and looked up directly, which an encrypted column
   * can't be.
   */
  @Column({ name: 'student_id_number', type: 'varchar', nullable: true, unique: true })
  studentIdNumber?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

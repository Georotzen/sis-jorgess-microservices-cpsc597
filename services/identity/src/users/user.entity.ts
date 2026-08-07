import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

/**
 * Local metadata table in the Identity service's own database.
 * Keycloak remains the source of truth for credentials, roles, and
 * token issuance — this table exists only to store app-level metadata
 * (e.g. isActive, denormalized display name) that's expensive or
 * awkward to fetch from Keycloak on every request, plus an
 * app-controlled foreign key target for other services.
 *
 * `id` is the Keycloak subject (sub) UUID — NOT an auto-generated
 * local id — so there is exactly one identifier for a person across
 * the whole platform.
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryColumn('uuid')
  id!: string; // Keycloak sub

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

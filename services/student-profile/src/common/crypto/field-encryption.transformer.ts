import { ValueTransformer } from 'typeorm';
import { encryptField, decryptField } from './field-encryption';

/**
 * TypeORM column transformer for SENSITIVE string fields — apply to any
 * column backing a field marked `// SENSITIVE` in
 * @sis/shared-dtos's student-profile.dto.ts. Encryption/decryption
 * happens transparently on save/load; nothing outside this file and
 * field-encryption.ts should ever import the crypto primitives directly.
 *
 * Passes null/undefined straight through so optional SENSITIVE fields
 * (e.g. phoneNumber, homeAddress) still work without special-casing at
 * every call site.
 */
export const encryptedColumn: ValueTransformer = {
  to: (value?: string | null): string | null | undefined =>
    value == null ? value : encryptField(value),
  from: (value?: string | null): string | null | undefined =>
    value == null ? value : decryptField(value),
};

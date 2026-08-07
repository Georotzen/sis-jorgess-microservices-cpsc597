import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ProfileFieldEncryptionException } from '@sis/shared-errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // NIST-recommended IV length for GCM

/**
 * Loaded once at process start (first encrypt/decrypt call), not per
 * field — so a missing/malformed key fails the service at boot-adjacent
 * time with a clear message, rather than failing confusingly on the
 * first profile write, or worse, silently storing plaintext.
 */
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.STUDENT_PROFILE_FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'STUDENT_PROFILE_FIELD_ENCRYPTION_KEY is not set. Refusing to start ' +
        'with student PII fields unencryptable. Generate one with ' +
        '`openssl rand -base64 32` (pulled from Vault in real deploys, ' +
        'same as every other secret in this service).',
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `STUDENT_PROFILE_FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes ` +
        `for AES-256 (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`,
    );
  }

  cachedKey = key;
  return cachedKey;
}

/**
 * Encrypts a single field value for at-rest storage.
 *
 * Output format: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
 * — self-contained per value (own random IV each time) so a stolen
 * database dump is useless without the key, which never leaves
 * env/Vault, and so each field can be decrypted independently.
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/**
 * Decrypts a value produced by encryptField(). Throws
 * ProfileFieldEncryptionException (never a raw crypto error) on any
 * failure — wrong key, tampered ciphertext, or a corrupted/legacy row —
 * so AllExceptionsFilter turns it into the standard error envelope
 * instead of leaking crypto internals to the client.
 */
export function decryptField(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new ProfileFieldEncryptionException(
      'Stored value is not in the expected encrypted format',
    );
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    throw new ProfileFieldEncryptionException('Failed to decrypt a protected profile field');
  }
}

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encryption utility for securing sensitive data like access tokens.
 * Uses AES-256-GCM for authenticated encryption.
 * 
 * The encryption key is derived from the ENCRYPTION_KEY environment variable
 * using scrypt key derivation function.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Get the encryption key from environment variable.
 * The key is derived using scrypt for added security.
 */
function getEncryptionKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  
  if (!secret) {
    throw new Error(
      'Missing ENCRYPTION_KEY environment variable. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  
  // Derive a proper key from the secret using scrypt
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string.
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted string (format: salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key from secret using the salt
  const key = getEncryptionKey(salt);
  
  // Create cipher and encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  // Get the auth tag for GCM
  const authTag = cipher.getAuthTag();
  
  // Combine all parts: salt:iv:authTag:ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string.
 * 
 * @param encryptedData - Base64-encoded encrypted string
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract parts
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH, 
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  // Derive the same key using the extracted salt
  const key = getEncryptionKey(salt);
  
  // Create decipher and decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Verify that the encryption key is configured.
 * Call this at startup to fail fast if misconfigured.
 */
export function verifyEncryptionConfig(): void {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'Missing ENCRYPTION_KEY environment variable. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  
  // Test encryption/decryption works
  const testValue = 'encryption-test-' + Date.now();
  const encrypted = encrypt(testValue);
  const decrypted = decrypt(encrypted);
  
  if (decrypted !== testValue) {
    throw new Error('Encryption self-test failed');
  }
}

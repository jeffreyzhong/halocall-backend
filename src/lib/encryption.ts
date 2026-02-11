import crypto from 'crypto';

/**
 * Encryption utility for securing sensitive data like access tokens.
 * 
 * Uses AES-256-GCM with the ENCRYPTION_KEY environment variable.
 * Format: hex-encoded iv:authTag:ciphertext (colon-separated)
 */

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'Missing ENCRYPTION_KEY environment variable. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  return key;
}

/**
 * Encrypt a plaintext string.
 * 
 * @param text - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (hex-encoded)
 */
export function encrypt(text: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * Decrypt an encrypted string.
 * 
 * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext (hex-encoded)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
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

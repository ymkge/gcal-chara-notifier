import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// The algorithm to use for encryption. AES-256-GCM is a secure choice.
const algorithm = 'aes-256-gcm';
const ivLength = 16; // For GCM, this is 12, but 16 is common for other modes. Let's stick to 16 for simplicity.
const tagLength = 16;

// Get the encryption key from environment variables.
const secretKey = process.env.ENCRYPTION_KEY;

// Ensure the key is valid. It must be a 64-character hex string (32 bytes).
if (!secretKey || !/^[a-fA-F0-9]{64}$/.test(secretKey)) {
  throw new Error('ENCRYPTION_KEY is not defined or is not a 64-character hex string.');
}

const key = Buffer.from(secretKey, 'hex');

/**
 * Encrypts a string using AES-256-GCM.
 * @param text The string to encrypt.
 * @returns A hex-encoded string containing the iv, auth tag, and encrypted text.
 */
export function encrypt(text: string): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv, encrypted data, and auth tag into a single hex string
  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

/**
 * Decrypts a string encrypted with AES-256-GCM.
 * @param encryptedText The hex-encoded string to decrypt.
 * @returns The original decrypted string.
 */
export function decrypt(encryptedText: string): string {
  const data = Buffer.from(encryptedText, 'hex');
  
  // Extract the iv, auth tag, and encrypted text from the combined string
  const iv = data.slice(0, ivLength);
  const tag = data.slice(ivLength, ivLength + tagLength);
  const encrypted = data.slice(ivLength + tagLength);

  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  
  return decrypted.toString('utf8');
}

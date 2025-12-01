import argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Argon2id configuration for password hashing
 * Memory: 64MB, Time: 3 iterations, Parallelism: 4 threads
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64MB
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS as argon2.Options & { raw?: false });
}

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

/**
 * Generate a secure random password
 * Generates a password with uppercase, lowercase, numbers, and special characters
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercaseChars[crypto.randomInt(0, uppercaseChars.length)];
  password += lowercaseChars[crypto.randomInt(0, lowercaseChars.length)];
  password += numberChars[crypto.randomInt(0, numberChars.length)];
  password += specialChars[crypto.randomInt(0, specialChars.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 2) - 0.5)
    .join('');
}


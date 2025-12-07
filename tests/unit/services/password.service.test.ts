import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../src/services/password.service';

describe('Password Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
      expect(hash).not.toBe(password);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(hash, wrongPassword);
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format gracefully', async () => {
      const invalidHash = 'invalid-hash-format';
      const password = 'TestPassword123!';
      
      const isValid = await verifyPassword(invalidHash, password);
      expect(isValid).toBe(false);
    });

    it('should have constant-time verification (timing attack protection)', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const wrongPassword = 'WrongPassword123!';
      
      // Measure time for both operations
      const startCorrect = Date.now();
      await verifyPassword(hash, password);
      const timeCorrect = Date.now() - startCorrect;
      
      const startWrong = Date.now();
      await verifyPassword(hash, wrongPassword);
      const timeWrong = Date.now() - startWrong;
      
      // Times should be similar (within 100ms tolerance)
      // This is a basic check - real timing attack tests would be more sophisticated
      const timeDiff = Math.abs(timeCorrect - timeWrong);
      expect(timeDiff).toBeLessThan(100);
    });
  });
});


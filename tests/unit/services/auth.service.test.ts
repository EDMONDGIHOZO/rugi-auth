import { describe, it, expect, beforeEach } from 'vitest';
import { TestDB, TestAuth } from '../../test-utils';
import { register, login, refresh, revoke } from '../../../src/services/auth.service';
import { AuthError, ConflictError } from '../../../src/utils/errors';

describe('Auth Service', () => {
  beforeEach(async () => {
    await TestDB.clean();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const app = await TestDB.createTestApp();
      
      const result = await register({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        client_id: app.clientId,
        client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
      });

      expect(result.email).toBe('newuser@example.com');
      expect(result.id).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const app = await TestDB.createTestApp();
      const user = await TestDB.createTestUser({ email: 'existing@example.com' });
      
      // Link user to app
      await TestDB.client.user.update({
        where: { id: user.id },
        data: { optedInApps: [app.id] },
      });

      await expect(
        register({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          client_id: app.clientId,
          client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject registration with invalid client credentials', async () => {
      await expect(
        register({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          client_id: 'invalid-client',
          client_secret: 'invalid-secret',
        })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const { app, user } = await TestAuth.createTestSetup();
      const password = 'TestPassword123!';
      
      // Update user with known password
      const { hashPassword } = await import('../../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      const result = await login({
        email: user.email,
        password,
        client_id: app.clientId,
        client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
      });

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBeGreaterThan(0);
    });

    it('should reject login with incorrect password', async () => {
      const { app, user } = await TestAuth.createTestSetup();
      const password = 'TestPassword123!';
      
      const { hashPassword } = await import('../../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await expect(
        login({
          email: user.email,
          password: 'WrongPassword123!',
          client_id: app.clientId,
          client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
        })
      ).rejects.toThrow(AuthError);
    });

    it('should reject login with non-existent user (timing attack protection)', async () => {
      const app = await TestDB.createTestApp();

      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
          client_id: app.clientId,
          client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
        })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { app, user } = await TestAuth.createTestSetup();
      const password = 'TestPassword123!';
      
      const { hashPassword } = await import('../../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Login first to get refresh token
      const loginResult = await login({
        email: user.email,
        password,
        client_id: app.clientId,
        client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
      });

      // Refresh token
      const refreshResult = await refresh({
        refresh_token: loginResult.refresh_token,
        client_id: app.clientId,
      });

      expect(refreshResult.access_token).toBeDefined();
      expect(refreshResult.refresh_token).toBeDefined();
      expect(refreshResult.refresh_token).not.toBe(loginResult.refresh_token); // Token rotation
    });

    it('should reject refresh with invalid refresh token', async () => {
      const app = await TestDB.createTestApp();

      await expect(
        refresh({
          refresh_token: 'invalid-refresh-token',
          client_id: app.clientId,
        })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('revoke', () => {
    it('should revoke a refresh token', async () => {
      const { app, user } = await TestAuth.createTestSetup();
      const password = 'TestPassword123!';
      
      const { hashPassword } = await import('../../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      const loginResult = await login({
        email: user.email,
        password,
        client_id: app.clientId,
        client_secret: 'test-secret-123456789012345678901234567890123456789012345678901234567890',
      });

      const result = await revoke(loginResult.refresh_token);
      expect(result.revoked).toBe(true);

      // Try to refresh with revoked token
      await expect(
        refresh({
          refresh_token: loginResult.refresh_token,
          client_id: app.clientId,
        })
      ).rejects.toThrow(AuthError);
    });
  });
});


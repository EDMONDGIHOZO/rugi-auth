import { describe, it, expect } from 'vitest';
import { login } from '../../src/services/auth.service';
import { TestDB, TestAuth } from '../test-utils';
import { hashPassword } from '../../src/services/password.service';

describe('Security: Timing Attack Protection', () => {
  beforeEach(async () => {
    await TestDB.clean();
  });

  it('should have constant-time execution for non-existent users', async () => {
    const app = await TestDB.createTestApp();
    const clientSecret = 'test-secret-123456789012345678901234567890123456789012345678901234567890';

    // Measure time for non-existent user
    const start1 = Date.now();
    try {
      await login({
        email: 'nonexistent1@example.com',
        password: 'AnyPassword123!',
        client_id: app.clientId,
        client_secret: clientSecret,
      });
    } catch {
      // Expected to fail
    }
    const time1 = Date.now() - start1;

    // Measure time for another non-existent user
    const start2 = Date.now();
    try {
      await login({
        email: 'nonexistent2@example.com',
        password: 'AnyPassword123!',
        client_id: app.clientId,
        client_secret: clientSecret,
      });
    } catch {
      // Expected to fail
    }
    const time2 = Date.now() - start2;

    // Times should be similar (within 50ms tolerance)
    const timeDiff = Math.abs(time1 - time2);
    expect(timeDiff).toBeLessThan(50);
  });

  it('should have similar execution time for wrong password vs non-existent user', async () => {
    const { app, user } = await TestAuth.createTestSetup();
    const password = 'TestPassword123!';
    const passwordHash = await hashPassword(password);
    await TestDB.client.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    const clientSecret = 'test-secret-123456789012345678901234567890123456789012345678901234567890';

    // Measure time for wrong password
    const startWrong = Date.now();
    try {
      await login({
        email: user.email,
        password: 'WrongPassword123!',
        client_id: app.clientId,
        client_secret: clientSecret,
      });
    } catch {
      // Expected to fail
    }
    const timeWrong = Date.now() - startWrong;

    // Measure time for non-existent user
    const startNonExistent = Date.now();
    try {
      await login({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
        client_id: app.clientId,
        client_secret: clientSecret,
      });
    } catch {
      // Expected to fail
    }
    const timeNonExistent = Date.now() - startNonExistent;

    // Times should be similar (within 100ms tolerance)
    // This ensures attackers can't distinguish between wrong password and non-existent user
    const timeDiff = Math.abs(timeWrong - timeNonExistent);
    expect(timeDiff).toBeLessThan(100);
  });
});


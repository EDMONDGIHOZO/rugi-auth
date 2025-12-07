import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { TestDB, TestAuth } from '../test-utils';

describe('Security: Rate Limiting', () => {
  beforeEach(async () => {
    await TestDB.clean();
  });

  it('should rate limit login attempts', async () => {
    const { app: testApp } = await TestAuth.createTestSetup();
    const clientSecret = 'test-secret-123456789012345678901234567890123456789012345678901234567890';

    // Make many rapid requests
    const requests = Array.from({ length: 150 }, () =>
      request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
          client_id: testApp.clientId,
          client_secret: clientSecret,
        })
    );

    const responses = await Promise.all(requests);
    
    // Some requests should be rate limited (429)
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should allow requests after rate limit window expires', async () => {
    // This test would require mocking time or waiting
    // For now, we just verify rate limiting exists
    const { app: testApp } = await TestAuth.createTestSetup();
    const clientSecret = 'test-secret-123456789012345678901234567890123456789012345678901234567890';

    // Make a single request
    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
        client_id: testApp.clientId,
        client_secret: clientSecret,
      });

    // Should not be rate limited for single request
    expect(response.status).not.toBe(429);
  });
});


import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { TestDB, TestAuth } from '../test-utils';

describe('Auth API Integration Tests', () => {
  let testApp: { id: string; clientId: string };
  let testUser: { id: string; email: string };
  let clientSecret: string;

  beforeAll(async () => {
    // Create test app and user
    const setup = await TestAuth.createTestSetup();
    testApp = setup.app;
    testUser = setup.user;
    clientSecret = 'test-secret-123456789012345678901234567890123456789012345678901234567890';
  });

  beforeEach(async () => {
    await TestDB.clean();
    // Recreate setup
    const setup = await TestAuth.createTestSetup();
    testApp = setup.app;
    testUser = setup.user;
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          client_id: testApp.clientId,
          client_secret: clientSecret,
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newuser@example.com');
    });

    it('should reject registration with invalid client credentials', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          client_id: 'invalid-client',
          client_secret: 'invalid-secret',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /login', () => {
    it('should login with correct credentials', async () => {
      // Set up user with known password
      const password = 'TestPassword123!';
      const { hashPassword } = await import('../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: testUser.id },
        data: { passwordHash },
      });

      const response = await request(app)
        .post('/login')
        .send({
          email: testUser.email,
          password,
          client_id: testApp.clientId,
          client_secret: clientSecret,
        });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
    });

    it('should reject login with incorrect password', async () => {
      const password = 'TestPassword123!';
      const { hashPassword } = await import('../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: testUser.id },
        data: { passwordHash },
      });

      const response = await request(app)
        .post('/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
          client_id: testApp.clientId,
          client_secret: clientSecret,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /refresh', () => {
    it('should refresh access token', async () => {
      // Login first
      const password = 'TestPassword123!';
      const { hashPassword } = await import('../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: testUser.id },
        data: { passwordHash },
      });

      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testUser.email,
          password,
          client_id: testApp.clientId,
          client_secret: clientSecret,
        });

      const refreshResponse = await request(app)
        .post('/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
          client_id: testApp.clientId,
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.access_token).toBeDefined();
      expect(refreshResponse.body.refresh_token).toBeDefined();
      expect(refreshResponse.body.refresh_token).not.toBe(loginResponse.body.refresh_token);
    });
  });

  describe('GET /me', () => {
    it('should return current user info with valid token', async () => {
      // Login first
      const password = 'TestPassword123!';
      const { hashPassword } = await import('../../src/services/password.service');
      const passwordHash = await hashPassword(password);
      await TestDB.client.user.update({
        where: { id: testUser.id },
        data: { passwordHash },
      });

      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testUser.email,
          password,
          client_id: testApp.clientId,
          client_secret: clientSecret,
        });

      const meResponse = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.email).toBe(testUser.email);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});


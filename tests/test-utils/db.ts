import { PrismaClient } from '@prisma/client';

// Import prisma from setup - will be initialized there
let prismaInstance: PrismaClient;

// Lazy getter to avoid circular dependency
function getPrisma() {
  if (!prismaInstance) {
    // Dynamic import to avoid circular dependency
    const setup = require('../setup');
    prismaInstance = setup.prisma;
  }
  return prismaInstance;
}

/**
 * Test database utilities
 */
export class TestDB {
  private static get instance(): PrismaClient {
    return getPrisma();
  }

  static get client(): PrismaClient {
    return this.instance;
  }

  /**
   * Create a test application with client credentials
   */
  static async createTestApp(data?: {
    name?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    const { hashPassword } = await import('../../src/services/password.service');
    
    const clientSecret = data?.clientSecret || 'test-secret-123456789012345678901234567890123456789012345678901234567890';
    const clientSecretHash = await hashPassword(clientSecret);

    return this.instance.app.create({
      data: {
        name: data?.name || 'Test App',
        clientId: data?.clientId || 'test-app',
        clientSecretHash,
        type: 'CONFIDENTIAL',
      },
    });
  }

  /**
   * Create a test user
   */
  static async createTestUser(data?: {
    email?: string;
    password?: string;
    passwordHash?: string;
  }) {
    const { hashPassword } = await import('../../src/services/password.service');
    
    const passwordHash = data?.passwordHash || await hashPassword(data?.password || 'TestPassword123!');

    return this.instance.user.create({
      data: {
        email: data?.email || 'test@example.com',
        passwordHash,
        registrationMethod: 'EMAIL_PASSWORD',
        optedInApps: [],
      },
    });
  }

  /**
   * Create a superadmin user
   */
  static async createSuperAdmin(data?: {
    email?: string;
    password?: string;
  }) {
    const user = await this.createTestUser(data);
    
    await this.instance.superAdmin.create({
      data: {
        userId: user.id,
      },
    });

    return user;
  }

  /**
   * Clean all test data
   */
  static async clean() {
    const tablenames = await this.instance.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.instance.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }
}


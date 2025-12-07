import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/rugi_auth_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ISSUER = 'rugi-auth-test';
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6381'; // Different port for tests
process.env.REDIS_PASSWORD = '';

let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Export prisma to test utilities
  const { setTestPrisma } = await import('./test-utils/db');
  setTestPrisma(prisma);

  // Run migrations for test database
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'ignore',
    });
  } catch (error) {
    console.warn('Migration failed, continuing anyway:', error);
  }
});

afterAll(async () => {
  // Cleanup: Truncate all tables
  if (prisma) {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        } catch (error) {
          console.warn(`Error truncating ${tablename}:`, error);
        }
      }
    }

    await prisma.$disconnect();
  }
});

export { prisma };

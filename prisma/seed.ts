import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/password.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create default roles
  console.log('Creating default roles...');
  const roles = ['user', 'admin', 'owner'];
  
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log(`✓ Role "${roleName}" created/verified`);
  }

  // Create example apps
  console.log('\nCreating example apps...');

  // E-commerce app (confidential)
  const ecommerceClientSecret = 'ecommerce-secret-' + Date.now();
  const ecommerceClientSecretHash = await hashPassword(ecommerceClientSecret);

  const ecommerceApp = await prisma.app.upsert({
    where: { clientId: 'ecommerce-app-id' },
    update: {},
    create: {
      name: 'E-commerce App',
      clientId: 'ecommerce-app-id',
      clientSecretHash: ecommerceClientSecretHash,
      type: 'CONFIDENTIAL',
      redirectUris: ['http://localhost:3001/callback'],
    },
  });

  console.log(`✓ E-commerce app created`);
  console.log(`  Client ID: ${ecommerceApp.clientId}`);
  console.log(`  Client Secret: ${ecommerceClientSecret}`);
  console.log(`  ⚠️  Save this secret - it won't be shown again!`);

  // Chat app (public)
  const chatApp = await prisma.app.upsert({
    where: { clientId: 'chat-app-id' },
    update: {},
    create: {
      name: 'Chat App',
      clientId: 'chat-app-id',
      clientSecretHash: null,
      type: 'PUBLIC',
      redirectUris: ['http://localhost:3002/callback'],
    },
  });

  console.log(`✓ Chat app created`);
  console.log(`  Client ID: ${chatApp.clientId}`);
  console.log(`  Type: PUBLIC (no secret required)`);

  // Create a test user (optional, for development)
  if (process.env.CREATE_TEST_USER === 'true') {
    console.log('\nCreating test user...');
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    const testPasswordHash = await hashPassword(testPassword);

    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        passwordHash: testPasswordHash,
        isEmailVerified: true,
      },
    });

    console.log(`✓ Test user created`);
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ${testPassword}`);

    // Assign roles to test user
    const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } });

    if (userRole && ownerRole) {
      // User role in chat app
      await prisma.userAppRole.upsert({
        where: {
          userId_appId_roleId: {
            userId: testUser.id,
            appId: chatApp.id,
            roleId: userRole.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          appId: chatApp.id,
          roleId: userRole.id,
        },
      });

      // Owner role in ecommerce app
      await prisma.userAppRole.upsert({
        where: {
          userId_appId_roleId: {
            userId: testUser.id,
            appId: ecommerceApp.id,
            roleId: ownerRole.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          appId: ecommerceApp.id,
          roleId: ownerRole.id,
        },
      });

      console.log(`✓ Roles assigned to test user`);
      console.log(`  - "user" role in Chat App`);
      console.log(`  - "owner" role in E-commerce App`);
    }
  }

  console.log('\n✓ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


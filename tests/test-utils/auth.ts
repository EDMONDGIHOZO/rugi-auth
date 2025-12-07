import { TestDB } from './db';
import { generateAccessToken } from '../../../src/services/token.service';

/**
 * Authentication test utilities
 */
export class TestAuth {
  /**
   * Generate a valid access token for testing
   */
  static async generateTestToken(userId: string, appId: string, roles: string[] = []) {
    const app = await TestDB.client.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw new Error('App not found');
    }

    return generateAccessToken(userId, app.clientId, appId, roles);
  }

  /**
   * Create a complete test setup: app, user, and link them
   */
  static async createTestSetup() {
    const app = await TestDB.createTestApp();
    const user = await TestDB.createTestUser();
    
    // Link user to app
    await TestDB.client.user.update({
      where: { id: user.id },
      data: {
        optedInApps: [app.id],
      },
    });

    return { app, user };
  }

  /**
   * Create test setup with roles
   */
  static async createTestSetupWithRoles(roles: string[] = ['user']) {
    const { app, user } = await this.createTestSetup();

    // Create roles for the app
    const createdRoles = await Promise.all(
      roles.map(roleName =>
        TestDB.client.role.create({
          data: {
            name: roleName,
            appId: app.id,
          },
        })
      )
    );

    // Assign roles to user
    await Promise.all(
      createdRoles.map(role =>
        TestDB.client.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        })
      )
    );

    return { app, user, roles: createdRoles };
  }
}


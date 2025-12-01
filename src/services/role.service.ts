import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';

/**
 * Find or create a role by name for a specific app
 */
export async function findOrCreateRole(appId: string, roleName: string) {
  let role = await prisma.role.findUnique({
    where: {
      appId_name: {
        appId,
        name: roleName,
      },
    },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        appId,
        name: roleName,
      },
    });
  }

  return role;
}

/**
 * Assign a role to a user for a specific app
 */
export async function assignUserRole(
  userId: string,
  appId: string,
  roleName: string,
  assignedBy?: string
) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify app exists
  const app = await prisma.app.findUnique({
    where: { id: appId },
  });
  if (!app) {
    throw new NotFoundError('Application not found');
  }

  // Find or create role for this app
  const role = await findOrCreateRole(appId, roleName);

  // Check if role already assigned
  const existing = await prisma.userAppRole.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id,
      },
    },
  });

  if (existing) {
    throw new ConflictError('Role already assigned to user for this app');
  }

  // Assign role
  const userAppRole = await prisma.userAppRole.create({
    data: {
      userId,
      roleId: role.id,
      assignedBy: assignedBy || null,
    },
    include: {
      role: {
        include: {
          app: {
            select: {
              id: true,
              name: true,
              clientId: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return userAppRole;
}

/**
 * Get all roles for a user in a specific app
 */
export async function getUserRoles(userId: string, appId: string) {
  const userAppRoles = await prisma.userAppRole.findMany({
    where: {
      userId,
      role: {
        appId,
      },
    },
    include: {
      role: true,
    },
  });

  return userAppRoles.map((uar) => uar.role.name);
}

/**
 * Get all roles for a user across all apps
 */
export async function getUserRolesByApp(userId: string) {
  const userAppRoles = await prisma.userAppRole.findMany({
    where: {
      userId,
    },
    include: {
      role: {
        include: {
          app: {
            select: {
              id: true,
              name: true,
              clientId: true,
            },
          },
        },
      },
    },
  });

  return userAppRoles;
}

/**
 * Check if a user is a superadmin
 * A user is considered a superadmin if they have 'owner' or 'admin' role in any app
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const superAdminRoles = await prisma.userAppRole.findFirst({
    where: {
      userId,
      role: {
        name: {
          in: ['owner', 'admin'],
        },
      },
    },
    include: {
      role: true,
    },
  });

  return superAdminRoles !== null;
}


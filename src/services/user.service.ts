import { prisma } from "../config/database";
import { generateSecurePassword, hashPassword } from "./password.service";
import { findOrCreateRole, isSuperAdmin } from "./role.service";
import { ConflictError, NotFoundError, AuthError } from "../utils/errors";
import { AuditAction } from "@prisma/client";

export interface InviteUserInput {
  email: string;
  app_ids: string[];
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  isEmailVerified?: boolean;
  mfaEnabled?: boolean;
}

/**
 * Invite a new user to one or more apps
 * - Generates a secure password for new users
 * - Adds the apps to optedInApps
 * - Assigns the default 'public' role for each app
 */
export async function inviteUser(input: InviteUserInput) {
  const { email, app_ids } = input;

  if (!app_ids || app_ids.length === 0) {
    throw new ConflictError("At least one app_id is required");
  }

  // Verify all apps exist
  const apps = await prisma.app.findMany({
    where: { id: { in: app_ids } },
  });

  if (apps.length !== app_ids.length) {
    const foundIds = apps.map((app) => app.id);
    const missingIds = app_ids.filter((id) => !foundIds.includes(id));
    throw new NotFoundError(
      `Application(s) not found: ${missingIds.join(", ")}`
    );
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  let isNewUser = false;
  let generatedPassword: string | null = null;

  if (!user) {
    // Create new user with generated password
    isNewUser = true;
    generatedPassword = generateSecurePassword(16);
    const passwordHash = await hashPassword(generatedPassword);

    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        optedInApps: app_ids,
      },
    });
  } else {
    // User exists - check which apps they're not already opted into
    const newAppIds = app_ids.filter(
      (appId) => !user!.optedInApps.includes(appId)
    );

    if (newAppIds.length === 0) {
      throw new ConflictError(
        "User is already opted into all specified applications"
      );
    }

    // Add new apps to optedInApps
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        optedInApps: {
          push: newAppIds,
        },
      },
    });
  }

  // Assign default 'public' role for each app
  const publicRole = await findOrCreateRole("public");

  // Get existing roles to avoid duplicates
  const existingRoles = await prisma.userAppRole.findMany({
    where: {
      userId: user.id,
      appId: { in: app_ids },
      roleId: publicRole.id,
    },
  });

  const existingAppIds = existingRoles.map((role) => role.appId);
  const appsNeedingRole = app_ids.filter(
    (appId) => !existingAppIds.includes(appId)
  );

  // Create roles for apps that don't have them
  if (appsNeedingRole.length > 0) {
    await prisma.userAppRole.createMany({
      data: appsNeedingRole.map((appId) => ({
        userId: user!.id,
        appId,
        roleId: publicRole.id,
      })),
    });
  }

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.USER_INVITE,
      metadata: {
        email: user.email,
        app_ids,
        app_names: apps.map((app) => app.name),
        is_new_user: isNewUser,
      },
    },
  });

  return {
    id: user.id,
    email: user.email,
    is_new_user: isNewUser,
    generated_password: generatedPassword,
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
    })),
    role: "public",
    opted_in_apps: user.optedInApps,
  };
}

/**
 * Find a user by ID
 */
export async function findUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      mfaEnabled: true,
      optedInApps: true,
      createdAt: true,
      userAppRoles: {
        include: {
          role: true,
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

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

/**
 * Update a user
 * Only the user themselves or app owner can update user info
 * Role updates are excluded if the user is updating themselves
 */
export async function updateUser(
  userId: string,
  updateData: UpdateUserInput,
  requestingUserId: string,
  appId?: string
) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check permissions
  const isSelf = userId === requestingUserId;
  const isRequesterSuperAdmin = await isSuperAdmin(requestingUserId);
  
  // Check if requester is owner of the app (if appId provided)
  let isAppOwner = false;
  if (appId) {
    const ownerRole = await prisma.userAppRole.findFirst({
      where: {
        userId: requestingUserId,
        appId,
        role: {
          name: "owner",
        },
      },
    });
    isAppOwner = ownerRole !== null;
  }

  // Authorization: must be self, app owner, or superadmin
  if (!isSelf && !isAppOwner && !isRequesterSuperAdmin) {
    throw new AuthError("You do not have permission to update this user");
  }

  // Prepare update data
  const dataToUpdate: any = {};

  if (updateData.email !== undefined) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: updateData.email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError("Email already in use by another user");
    }

    dataToUpdate.email = updateData.email;
    // Reset email verification if email changed
    if (updateData.email !== user.email) {
      dataToUpdate.isEmailVerified = false;
    }
  }

  if (updateData.password !== undefined) {
    dataToUpdate.passwordHash = await hashPassword(updateData.password);
  }

  // Only allow non-self updates for these fields
  if (!isSelf && (isAppOwner || isRequesterSuperAdmin)) {
    if (updateData.isEmailVerified !== undefined) {
      dataToUpdate.isEmailVerified = updateData.isEmailVerified;
    }
    if (updateData.mfaEnabled !== undefined) {
      dataToUpdate.mfaEnabled = updateData.mfaEnabled;
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      mfaEnabled: true,
      optedInApps: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

/**
 * Delete a user
 * Only superadmins can delete users
 */
export async function deleteUser(userId: string, requestingUserId: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if requesting user is superadmin
  const isRequesterSuperAdmin = await isSuperAdmin(requestingUserId);

  if (!isRequesterSuperAdmin) {
    throw new AuthError("Only superadmins can delete users");
  }

  // Prevent self-deletion
  if (userId === requestingUserId) {
    throw new ConflictError("You cannot delete your own account");
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id: userId },
  });

  return {
    success: true,
    message: "User deleted successfully",
  };
}

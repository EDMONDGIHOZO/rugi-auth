import { prisma } from "../config/database";
import { generateSecurePassword, hashPassword } from "./password.service";
import { findOrCreateRole, isSuperAdmin } from "./role.service";
import { ConflictError, NotFoundError, AuthError } from "../utils/errors";
import { AuditAction } from "@prisma/client";
import { logger } from "../utils/logger";

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

  // Assign default 'user' role for each app
  for (const appId of app_ids) {
    const userRole = await findOrCreateRole(appId, "user");

    // Check if user already has this role
    const existingRole = await prisma.userAppRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRole.id,
        },
      },
    });

    // Only create if doesn't exist
    if (!existingRole) {
      await prisma.userAppRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });
    }
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

  // Send invite / welcome email
  // Use the first app's email config (or global if not configured)
  const firstAppId = app_ids[0];
  const { isEmailConfigured } = await import("./email-config.service");
  const { sendEmailWithAppConfig } = await import("./email.service");
  const { env } = await import("../config/env");
  
  const hasAppEmailConfig = await isEmailConfigured(firstAppId);
  const isDevEnvironment = env.nodeEnv === "development";

  if (hasAppEmailConfig) {
    try {
      // Use app-specific email config
      const htmlContent = (await import("./email.service")).generateUserInviteEmail({
        email: user.email,
        apps: apps.map((app) => ({
          id: app.id,
          name: app.name,
        })),
        generatedPassword: generatedPassword,
        isNewUser,
      });

      const subject = isNewUser
        ? "Welcome to Rugi Auth - Your Account Details"
        : "You have been granted access to new applications";

      await sendEmailWithAppConfig(
        firstAppId,
        user.email,
        subject,
        htmlContent
      );
    } catch (error) {
      // In dev, log but don't fail the invite
      if (isDevEnvironment) {
        logger.warn({ error, appId: firstAppId }, "Failed to send invite email in dev, continuing anyway");
      } else {
        logger.error({ error, appId: firstAppId }, "Failed to send user invite email");
        throw new Error("Failed to send user invite email");
      }
    }
  } else if (isDevEnvironment) {
    // In dev, skip email if not configured
    logger.info(
      { email: user.email, appIds: app_ids },
      "Skipping email send in dev environment (email not configured)"
    );
  } else {
    // In production, warn but don't fail
    logger.warn(
      { email: user.email, appIds: app_ids },
      "Email not configured for app, invite email not sent"
    );
  }

  return {
    id: user.id,
    email: user.email,
    is_new_user: isNewUser,
    generated_password: generatedPassword,
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
    })),
    role: "user",
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
        role: {
          appId,
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

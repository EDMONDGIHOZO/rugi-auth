import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

const prisma = new PrismaClient();

export interface CreateEmailConfigInput {
  appId: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName?: string;
  enabled?: boolean;
}

export interface UpdateEmailConfigInput {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
  enabled?: boolean;
}

/**
 * Get email configuration for an app
 */
export async function getEmailConfig(appId: string) {
  const config = await prisma.appEmailConfig.findUnique({
    where: { appId },
    include: { app: true },
  });

  return config;
}

/**
 * Check if email is configured and enabled for an app
 */
export async function isEmailConfigured(appId: string): Promise<boolean> {
  const config = await prisma.appEmailConfig.findUnique({
    where: { appId },
    select: { enabled: true, smtpHost: true, fromEmail: true },
  });

  return !!(config?.enabled && config.smtpHost && config.fromEmail);
}

/**
 * Create email configuration for an app
 */
export async function createEmailConfig(input: CreateEmailConfigInput) {
  // Verify app exists
  const app = await prisma.app.findUnique({
    where: { id: input.appId },
  });

  if (!app) {
    throw new NotFoundError(`App with id ${input.appId} not found`);
  }

  // Check if config already exists
  const existing = await prisma.appEmailConfig.findUnique({
    where: { appId: input.appId },
  });

  if (existing) {
    throw new Error("Email configuration already exists for this app");
  }

  const config = await prisma.appEmailConfig.create({
    data: {
      appId: input.appId,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure ?? false,
      smtpUser: input.smtpUser,
      smtpPassword: input.smtpPassword,
      fromEmail: input.fromEmail,
      fromName: input.fromName ?? "Rugi Auth",
      enabled: input.enabled ?? true,
    },
    include: { app: true },
  });

  return config;
}

/**
 * Update email configuration for an app
 */
export async function updateEmailConfig(
  appId: string,
  input: UpdateEmailConfigInput
) {
  const existing = await prisma.appEmailConfig.findUnique({
    where: { appId },
  });

  if (!existing) {
    throw new NotFoundError("Email configuration not found for this app");
  }

  const config = await prisma.appEmailConfig.update({
    where: { appId },
    data: {
      ...(input.smtpHost && { smtpHost: input.smtpHost }),
      ...(input.smtpPort && { smtpPort: input.smtpPort }),
      ...(input.smtpSecure !== undefined && { smtpSecure: input.smtpSecure }),
      ...(input.smtpUser && { smtpUser: input.smtpUser }),
      ...(input.smtpPassword && { smtpPassword: input.smtpPassword }),
      ...(input.fromEmail && { fromEmail: input.fromEmail }),
      ...(input.fromName && { fromName: input.fromName }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
    },
    include: { app: true },
  });

  return config;
}

/**
 * Delete email configuration for an app
 */
export async function deleteEmailConfig(appId: string) {
  const existing = await prisma.appEmailConfig.findUnique({
    where: { appId },
  });

  if (!existing) {
    throw new NotFoundError("Email configuration not found for this app");
  }

  await prisma.appEmailConfig.delete({
    where: { appId },
  });
}


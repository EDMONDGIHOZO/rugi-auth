import { Request, Response } from "express";
import {
  getEmailConfig,
  createEmailConfig,
  updateEmailConfig,
  deleteEmailConfig,
} from "../services/email-config.service";
import { NotFoundError } from "../utils/errors";

/**
 * GET /apps/:appId/email-config
 * Get email configuration for an app
 */
export async function getEmailConfigController(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = req.params;

  const config = await getEmailConfig(appId);

  if (!config) {
    throw new NotFoundError("Email configuration not found for this app");
  }

  // Don't send password in response
  const { smtpPassword, ...safeConfig } = config;

  res.json({
    ...safeConfig,
    smtpPassword: smtpPassword ? "***" : null,
  });
}

/**
 * POST /apps/:appId/email-config
 * Create email configuration for an app
 */
export async function createEmailConfigController(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = req.params;
  const {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    fromEmail,
    fromName,
    enabled,
  } = req.body;

  const config = await createEmailConfig({
    appId,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    fromEmail,
    fromName,
    enabled,
  });

  // Don't send password in response
  const { smtpPassword: _, ...safeConfig } = config;

  res.status(201).json({
    ...safeConfig,
    smtpPassword: "***",
  });
}

/**
 * PATCH /apps/:appId/email-config
 * Update email configuration for an app
 */
export async function updateEmailConfigController(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = req.params;
  const {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    fromEmail,
    fromName,
    enabled,
  } = req.body;

  const config = await updateEmailConfig(appId, {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    fromEmail,
    fromName,
    enabled,
  });

  // Don't send password in response
  const { smtpPassword: _, ...safeConfig } = config;

  res.json({
    ...safeConfig,
    smtpPassword: "***",
  });
}

/**
 * DELETE /apps/:appId/email-config
 * Delete email configuration for an app
 */
export async function deleteEmailConfigController(
  req: Request,
  res: Response
): Promise<void> {
  const { appId } = req.params;

  await deleteEmailConfig(appId);

  res.status(204).send();
}


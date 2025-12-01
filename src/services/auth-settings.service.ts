import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { findAppById } from './app.service';
import { AppAuthSettings } from '@prisma/client';

export interface AuthSettingsInput {
  email_password_enabled?: boolean;
  email_otp_enabled?: boolean;
  google_auth_enabled?: boolean;
  google_client_id?: string;
  google_client_secret?: string;
  github_auth_enabled?: boolean;
  github_client_id?: string;
  github_client_secret?: string;
  microsoft_auth_enabled?: boolean;
  microsoft_client_id?: string;
  microsoft_client_secret?: string;
  facebook_auth_enabled?: boolean;
  facebook_client_id?: string;
  facebook_client_secret?: string;
  require_email_verification?: boolean;
  allow_registration?: boolean;
}

export interface AuthSettingsResponse {
  id: string;
  app_id: string;
  email_password_enabled: boolean;
  email_otp_enabled: boolean;
  google_auth_enabled: boolean;
  google_client_id?: string | null;
  github_auth_enabled: boolean;
  github_client_id?: string | null;
  microsoft_auth_enabled: boolean;
  microsoft_client_id?: string | null;
  facebook_auth_enabled: boolean;
  facebook_client_id?: string | null;
  require_email_verification: boolean;
  allow_registration: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get authentication settings for an app
 */
export async function getAuthSettings(appId: string): Promise<AuthSettingsResponse> {
  // Verify app exists
  await findAppById(appId);

  const settings = await prisma.appAuthSettings.findUnique({
    where: { appId },
  });

  if (!settings) {
    throw new NotFoundError('Authentication settings not found for this app');
  }

  return formatAuthSettings(settings);
}

/**
 * Create authentication settings for an app
 */
export async function createAuthSettings(
  appId: string,
  input: AuthSettingsInput
): Promise<AuthSettingsResponse> {
  // Verify app exists
  await findAppById(appId);

  // Check if settings already exist
  const existing = await prisma.appAuthSettings.findUnique({
    where: { appId },
  });

  if (existing) {
    throw new ConflictError('Authentication settings already exist for this app');
  }

  // Validate OAuth settings
  validateOAuthSettings(input);

  const settings = await prisma.appAuthSettings.create({
    data: {
      appId,
      emailPasswordEnabled: input.email_password_enabled ?? true,
      emailOtpEnabled: input.email_otp_enabled ?? false,
      googleAuthEnabled: input.google_auth_enabled ?? false,
      googleClientId: input.google_client_id || null,
      googleClientSecret: input.google_client_secret || null,
      githubAuthEnabled: input.github_auth_enabled ?? false,
      githubClientId: input.github_client_id || null,
      githubClientSecret: input.github_client_secret || null,
      microsoftAuthEnabled: input.microsoft_auth_enabled ?? false,
      microsoftClientId: input.microsoft_client_id || null,
      microsoftClientSecret: input.microsoft_client_secret || null,
      facebookAuthEnabled: input.facebook_auth_enabled ?? false,
      facebookClientId: input.facebook_client_id || null,
      facebookClientSecret: input.facebook_client_secret || null,
      requireEmailVerification: input.require_email_verification ?? true,
      allowRegistration: input.allow_registration ?? true,
    },
  });

  return formatAuthSettings(settings);
}

/**
 * Update authentication settings for an app
 */
export async function updateAuthSettings(
  appId: string,
  input: AuthSettingsInput
): Promise<AuthSettingsResponse> {
  // Verify app exists
  await findAppById(appId);

  // Check if settings exist
  const existing = await prisma.appAuthSettings.findUnique({
    where: { appId },
  });

  if (!existing) {
    throw new NotFoundError('Authentication settings not found for this app');
  }

  // Validate OAuth settings
  validateOAuthSettings(input);

  // Build update data object
  const updateData: any = {};

  if (input.email_password_enabled !== undefined) {
    updateData.emailPasswordEnabled = input.email_password_enabled;
  }
  if (input.email_otp_enabled !== undefined) {
    updateData.emailOtpEnabled = input.email_otp_enabled;
  }
  if (input.google_auth_enabled !== undefined) {
    updateData.googleAuthEnabled = input.google_auth_enabled;
  }
  if (input.google_client_id !== undefined) {
    updateData.googleClientId = input.google_client_id || null;
  }
  if (input.google_client_secret !== undefined) {
    updateData.googleClientSecret = input.google_client_secret || null;
  }
  if (input.github_auth_enabled !== undefined) {
    updateData.githubAuthEnabled = input.github_auth_enabled;
  }
  if (input.github_client_id !== undefined) {
    updateData.githubClientId = input.github_client_id || null;
  }
  if (input.github_client_secret !== undefined) {
    updateData.githubClientSecret = input.github_client_secret || null;
  }
  if (input.microsoft_auth_enabled !== undefined) {
    updateData.microsoftAuthEnabled = input.microsoft_auth_enabled;
  }
  if (input.microsoft_client_id !== undefined) {
    updateData.microsoftClientId = input.microsoft_client_id || null;
  }
  if (input.microsoft_client_secret !== undefined) {
    updateData.microsoftClientSecret = input.microsoft_client_secret || null;
  }
  if (input.facebook_auth_enabled !== undefined) {
    updateData.facebookAuthEnabled = input.facebook_auth_enabled;
  }
  if (input.facebook_client_id !== undefined) {
    updateData.facebookClientId = input.facebook_client_id || null;
  }
  if (input.facebook_client_secret !== undefined) {
    updateData.facebookClientSecret = input.facebook_client_secret || null;
  }
  if (input.require_email_verification !== undefined) {
    updateData.requireEmailVerification = input.require_email_verification;
  }
  if (input.allow_registration !== undefined) {
    updateData.allowRegistration = input.allow_registration;
  }

  const settings = await prisma.appAuthSettings.update({
    where: { appId },
    data: updateData,
  });

  return formatAuthSettings(settings);
}

/**
 * Delete authentication settings for an app
 */
export async function deleteAuthSettings(appId: string): Promise<void> {
  // Verify app exists
  await findAppById(appId);

  const settings = await prisma.appAuthSettings.findUnique({
    where: { appId },
  });

  if (!settings) {
    throw new NotFoundError('Authentication settings not found for this app');
  }

  await prisma.appAuthSettings.delete({
    where: { appId },
  });
}

/**
 * Get authentication settings for multiple apps
 */
export async function listAuthSettings(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: AuthSettingsResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const skip = (page - 1) * limit;

  const [settings, total] = await Promise.all([
    prisma.appAuthSettings.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            clientId: true,
          },
        },
      },
    }),
    prisma.appAuthSettings.count(),
  ]);

  return {
    data: settings.map((s) => formatAuthSettings(s)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Check if a specific authentication method is enabled for an app
 */
export async function isAuthMethodEnabled(
  appId: string,
  method: 'email_password' | 'email_otp' | 'google' | 'github' | 'microsoft' | 'facebook'
): Promise<boolean> {
  const settings = await prisma.appAuthSettings.findUnique({
    where: { appId },
  });

  if (!settings) {
    // Default to email_password enabled if no settings exist
    return method === 'email_password';
  }

  switch (method) {
    case 'email_password':
      return settings.emailPasswordEnabled;
    case 'email_otp':
      return settings.emailOtpEnabled;
    case 'google':
      return settings.googleAuthEnabled;
    case 'github':
      return settings.githubAuthEnabled;
    case 'microsoft':
      return settings.microsoftAuthEnabled;
    case 'facebook':
      return settings.facebookAuthEnabled;
    default:
      return false;
  }
}

/**
 * Validate OAuth settings
 */
function validateOAuthSettings(input: AuthSettingsInput): void {
  // Google OAuth validation
  if (input.google_auth_enabled) {
    if (!input.google_client_id && !input.google_client_secret) {
      throw new ValidationError(
        'Google client ID and client secret are required when Google auth is enabled'
      );
    }
  }

  // GitHub OAuth validation
  if (input.github_auth_enabled) {
    if (!input.github_client_id && !input.github_client_secret) {
      throw new ValidationError(
        'GitHub client ID and client secret are required when GitHub auth is enabled'
      );
    }
  }

  // Microsoft OAuth validation
  if (input.microsoft_auth_enabled) {
    if (!input.microsoft_client_id && !input.microsoft_client_secret) {
      throw new ValidationError(
        'Microsoft client ID and client secret are required when Microsoft auth is enabled'
      );
    }
  }

  // Facebook OAuth validation
  if (input.facebook_auth_enabled) {
    if (!input.facebook_client_id && !input.facebook_client_secret) {
      throw new ValidationError(
        'Facebook client ID and client secret are required when Facebook auth is enabled'
      );
    }
  }

  // Ensure at least one auth method is enabled
  const hasAtLeastOneMethod =
    input.email_password_enabled ||
    input.email_otp_enabled ||
    input.google_auth_enabled ||
    input.github_auth_enabled ||
    input.microsoft_auth_enabled ||
    input.facebook_auth_enabled;

  if (hasAtLeastOneMethod === false) {
    throw new ValidationError('At least one authentication method must be enabled');
  }
}

/**
 * Format auth settings for API response
 */
function formatAuthSettings(settings: AppAuthSettings): AuthSettingsResponse {
  return {
    id: settings.id,
    app_id: settings.appId,
    email_password_enabled: settings.emailPasswordEnabled,
    email_otp_enabled: settings.emailOtpEnabled,
    google_auth_enabled: settings.googleAuthEnabled,
    google_client_id: settings.googleClientId,
    github_auth_enabled: settings.githubAuthEnabled,
    github_client_id: settings.githubClientId,
    microsoft_auth_enabled: settings.microsoftAuthEnabled,
    microsoft_client_id: settings.microsoftClientId,
    facebook_auth_enabled: settings.facebookAuthEnabled,
    facebook_client_id: settings.facebookClientId,
    require_email_verification: settings.requireEmailVerification,
    allow_registration: settings.allowRegistration,
    created_at: settings.createdAt,
    updated_at: settings.updatedAt,
  };
}


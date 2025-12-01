import { Request, Response, NextFunction } from 'express';
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  findOrCreateUserFromGoogle,
} from '../services/oauth.service';
import { generateAccessToken } from '../services/token.service';
import { getUserRoles } from '../services/role.service';
import { verifyClientCredentials } from '../services/app.service';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { AuditAction } from '@prisma/client';

/**
 * Initiate Google OAuth flow
 * GET /oauth/google
 */
export async function initiateGoogleOAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { client_id, redirect_uri, state } = req.query as {
      client_id: string;
      redirect_uri: string;
      state?: string;
    };

    if (!client_id || !redirect_uri) {
      return res.status(400).json({
        error: 'client_id and redirect_uri are required',
      });
    }

    // Verify client exists and get app
    const app = await verifyClientCredentials(client_id);

    // Generate Google authorization URL
    const authUrl = await getGoogleAuthUrl(app.id, redirect_uri, state);

    res.json({
      auth_url: authUrl,
      provider: 'google',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle Google OAuth callback
 * POST /oauth/google/callback
 */
export async function handleGoogleCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { code, client_id, client_secret, redirect_uri, device_info } = req.body;

    if (!code || !client_id || !redirect_uri) {
      return res.status(400).json({
        error: 'code, client_id, and redirect_uri are required',
      });
    }

    // Verify client credentials
    const app = await verifyClientCredentials(client_id, client_secret);

    // Exchange authorization code for access token
    const tokenResponse = await exchangeGoogleCode(app.id, code, redirect_uri);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);

    // Find or create user
    const user = await findOrCreateUserFromGoogle(googleUser, app.id);

    // Get user roles for this app
    const roles = await getUserRoles(user.id, app.id);

    // Generate access token
    const accessToken = generateAccessToken(
      user.id,
      app.clientId,
      app.id,
      roles
    );

    // Generate refresh token
    const refreshToken = uuidv4();
    const expiresIn = 7 * 24 * 60 * 60; // 7 days
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        appId: app.id,
        expiresAt,
        deviceInfo: device_info || null,
      },
    });

    // Audit log
    await prisma.authAudit.create({
      data: {
        userId: user.id,
        action: user.createdAt.getTime() > Date.now() - 60000 
          ? AuditAction.REGISTER 
          : AuditAction.LOGIN,
        metadata: {
          app_id: app.id,
          client_id: app.clientId,
          provider: 'google',
          device_info,
        },
      },
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user: {
        id: user.id,
        email: user.email,
        registration_method: user.registrationMethod,
        is_email_verified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get available OAuth providers for an app
 * GET /oauth/providers
 */
export async function getAvailableProviders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { client_id } = req.query as { client_id: string };

    if (!client_id) {
      return res.status(400).json({
        error: 'client_id is required',
      });
    }

    // Verify client and get app
    const app = await verifyClientCredentials(client_id);

    // Get auth settings
    const settings = await prisma.appAuthSettings.findUnique({
      where: { appId: app.id },
    });

    const providers: Record<string, boolean> = {
      email_password: settings?.emailPasswordEnabled ?? true,
      email_otp: settings?.emailOtpEnabled ?? false,
    };

    // Add OAuth providers
    if (settings) {
      if (settings.googleAuthEnabled) {
        providers.google = true;
      }
      if (settings.githubAuthEnabled) {
        providers.github = true;
      }
      if (settings.microsoftAuthEnabled) {
        providers.microsoft = true;
      }
      if (settings.facebookAuthEnabled) {
        providers.facebook = true;
      }
    }

    res.json({
      app_id: app.id,
      app_name: app.name,
      client_id: app.clientId,
      providers,
      allow_registration: settings?.allowRegistration ?? true,
      require_email_verification: settings?.requireEmailVerification ?? true,
    });
  } catch (error) {
    next(error);
  }
}


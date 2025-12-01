import axios from 'axios';
import { prisma } from '../config/database';
import { AuthError, ValidationError } from '../utils/errors';
import { getAuthSettings } from './auth-settings.service';
import { RegistrationMethod } from '@prisma/client';

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

/**
 * Generate Google OAuth authorization URL
 */
export async function getGoogleAuthUrl(
  appId: string,
  redirectUri: string,
  state?: string
): Promise<string> {
  // Get auth settings for the app
  const settings = await getAuthSettings(appId);

  if (!settings.google_auth_enabled) {
    throw new AuthError('Google authentication is not enabled for this app');
  }

  if (!settings.google_client_id) {
    throw new AuthError('Google OAuth is not properly configured');
  }

  const params = new URLSearchParams({
    client_id: settings.google_client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange Google authorization code for access token
 */
export async function exchangeGoogleCode(
  appId: string,
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const settings = await getAuthSettings(appId);

  if (!settings.google_auth_enabled || !settings.google_client_id) {
    throw new AuthError('Google authentication is not enabled');
  }

  try {
    const response = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: settings.google_client_id,
        client_secret: settings.google_client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } };
    // eslint-disable-next-line no-console
    console.error('Google token exchange error:', err.response?.data);
    throw new AuthError('Failed to exchange Google authorization code');
  }
}

/**
 * Get Google user info from access token
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  try {
    const response = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } };
    // eslint-disable-next-line no-console
    console.error('Google user info error:', err.response?.data);
    throw new AuthError('Failed to get Google user information');
  }
}

/**
 * Find or create user from Google OAuth data
 */
export async function findOrCreateUserFromGoogle(
  googleUser: GoogleUserInfo,
  appId: string
): Promise<any> {
  // Check if user exists with this Google ID
  let user = await prisma.user.findFirst({
    where: {
      oauthProvider: 'google',
      oauthProviderId: googleUser.id,
    },
  });

  if (user) {
    // User exists, check if they've opted into this app
    if (!user.optedInApps.includes(appId)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          optedInApps: {
            push: appId,
          },
        },
      });
    }
    return user;
  }

  // Check if user exists with this email
  user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (user) {
    // User exists with email but not linked to Google
    // Link the Google account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        oauthProvider: 'google',
        oauthProviderId: googleUser.id,
        isEmailVerified: googleUser.verified_email,
        optedInApps: user.optedInApps.includes(appId)
          ? user.optedInApps
          : [...user.optedInApps, appId],
      },
    });

    return await prisma.user.findUnique({
      where: { id: user.id },
    });
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email: googleUser.email,
      passwordHash: null, // No password for OAuth users
      isEmailVerified: googleUser.verified_email,
      registrationMethod: RegistrationMethod.GOOGLE,
      oauthProvider: 'google',
      oauthProviderId: googleUser.id,
      optedInApps: [appId],
    },
  });

  return newUser;
}

/**
 * Generic OAuth provider info getter (for future providers)
 */
export interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export const oauthProviders: Record<string, OAuthProviderConfig> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'user:email',
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    scope: 'email',
  },
};


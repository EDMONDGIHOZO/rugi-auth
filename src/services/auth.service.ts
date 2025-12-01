import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { hashPassword, verifyPassword } from './password.service';
import { generateAccessToken } from './token.service';
import { getUserRoles, isSuperAdmin } from './role.service';
import { verifyClientCredentials } from './app.service';
import { isAuthMethodEnabled } from './auth-settings.service';
import {
  AuthError,
  ConflictError,
  NotFoundError,
} from '../utils/errors';
import { AuditAction, RegistrationMethod } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password: string;
  client_id: string;
  client_secret?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  client_id: string;
  client_secret?: string;
  device_info?: Record<string, unknown>;
}

export interface RefreshInput {
  refresh_token: string;
  client_id: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput) {
  // Verify client credentials
  const app = await verifyClientCredentials(
    input.client_id,
    input.client_secret
  );

  // Check if registration is allowed for this app
  const settings = await prisma.appAuthSettings.findUnique({
    where: { appId: app.id },
  });

  if (settings && !settings.allowRegistration) {
    throw new AuthError('Registration is not allowed for this application');
  }

  // Check if email+password authentication is enabled
  const isPasswordAuthEnabled = await isAuthMethodEnabled(app.id, 'email_password');
  if (!isPasswordAuthEnabled) {
    throw new AuthError('Email/password registration is not enabled for this application');
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      registrationMethod: RegistrationMethod.EMAIL_PASSWORD,
      optedInApps: [app.id],
    },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.REGISTER,
      metadata: {
        email: user.email,
        app_id: app.id,
        client_id: app.clientId,
        registration_method: 'EMAIL_PASSWORD',
      },
    },
  });

  return {
    id: user.id,
    email: user.email,
    registration_method: 'EMAIL_PASSWORD',
    created_at: user.createdAt,
  };
}

/**
 * Login a user and issue tokens
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  // Verify client credentials first
  const app = await verifyClientCredentials(
    input.client_id,
    input.client_secret
  );

  // Check if email+password authentication is enabled
  const isPasswordAuthEnabled = await isAuthMethodEnabled(app.id, 'email_password');
  if (!isPasswordAuthEnabled) {
    throw new AuthError('Email/password authentication is not enabled for this application');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Don't reveal if user exists
    throw new AuthError('Invalid credentials');
  }

  // Verify password
  if (!user.passwordHash) {
    throw new AuthError('Invalid credentials');
  }
  
  const isValid = await verifyPassword(user.passwordHash, input.password);
  if (!isValid) {
    throw new AuthError('Invalid credentials');
  }

  // Check if user is a superadmin
  const isUserSuperAdmin = await isSuperAdmin(user.id);

  // Check if user has opted into this app (skip for superadmins)
  if (!isUserSuperAdmin && !user.optedInApps.includes(app.id)) {
    throw new AuthError('User does not have access to this application');
  }

  // Get user roles for this app
  const roles = await getUserRoles(user.id, app.id);

  // Generate access token
  const accessToken = generateAccessToken(
    user.id,
    app.clientId,
    app.id,
    roles
  );

  // Generate refresh token (opaque UUID)
  const refreshToken = uuidv4();

  // Calculate expiry (7 days default)
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      appId: app.id,
      expiresAt,
      deviceInfo: input.device_info ? (input.device_info as any) : null,
    },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.LOGIN,
      metadata: {
        app_id: app.id,
        client_id: app.clientId,
        device_info: input.device_info,
      } as any,
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
  };
}

/**
 * Refresh access token using refresh token
 * Implements token rotation for security
 */
export async function refresh(input: RefreshInput): Promise<AuthResponse> {
  // Find refresh token
  const refreshTokenRecord = await prisma.refreshToken.findUnique({
    where: { token: input.refresh_token },
    include: {
      user: true,
      app: true,
    },
  });

  if (!refreshTokenRecord) {
    throw new AuthError('Invalid refresh token');
  }

  // Check if revoked
  if (refreshTokenRecord.revoked) {
    throw new AuthError('Refresh token has been revoked');
  }

  // Check if expired
  if (refreshTokenRecord.expiresAt < new Date()) {
    throw new AuthError('Refresh token expired');
  }

  // Verify client_id matches
  if (refreshTokenRecord.app.clientId !== input.client_id) {
    throw new AuthError('Invalid client for refresh token');
  }

  // Check if user is a superadmin
  const isUserSuperAdmin = await isSuperAdmin(refreshTokenRecord.userId);

  // Check if user still has access to this app (skip for superadmins)
  if (!isUserSuperAdmin && !refreshTokenRecord.user.optedInApps.includes(refreshTokenRecord.appId)) {
    throw new AuthError('User no longer has access to this application');
  }

  // Revoke old refresh token (token rotation)
  await prisma.refreshToken.update({
    where: { token: input.refresh_token },
    data: { revoked: true },
  });

  // Get user roles for this app
  const roles = await getUserRoles(
    refreshTokenRecord.userId,
    refreshTokenRecord.appId
  );

  // Generate new access token
  const accessToken = generateAccessToken(
    refreshTokenRecord.userId,
    refreshTokenRecord.app.clientId,
    refreshTokenRecord.appId,
    roles
  );

  // Generate new refresh token
  const newRefreshToken = uuidv4();
  const expiresIn = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  // Store new refresh token
  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: refreshTokenRecord.userId,
      appId: refreshTokenRecord.appId,
      expiresAt,
      deviceInfo: refreshTokenRecord.deviceInfo as any,
    },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: refreshTokenRecord.userId,
      action: AuditAction.REFRESH,
      metadata: {
        app_id: refreshTokenRecord.appId,
        client_id: refreshTokenRecord.app.clientId,
      },
    },
  });

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
  };
}

/**
 * Revoke a refresh token
 */
export async function revoke(refreshToken: string) {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!tokenRecord) {
    throw new NotFoundError('Refresh token not found');
  }

  if (tokenRecord.revoked) {
    // Already revoked, return success
    return { revoked: true };
  }

  // Revoke token
  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: { revoked: true },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: tokenRecord.userId,
      action: AuditAction.REVOKE,
      metadata: {
        app_id: tokenRecord.appId,
      },
    },
  });

  return { revoked: true };
}

/**
 * Get current user information
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}


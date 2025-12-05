import { prisma } from '../config/database';
import { sendOTPEmail } from './email.service';
import { getExpiryDate } from '../utils/time';
import { env } from '../config/env';
import { AuthError } from '../utils/errors';
import { AuditAction } from '@prisma/client';
import { verifyClientCredentials } from './app.service';
import { getUserRoles } from './role.service';
import { generateAccessToken } from './token.service';
import { v4 as uuidv4 } from 'uuid';

import crypto from "crypto";

/**
 * Generate a cryptographically secure random OTP code
 */
function generateOTPCode(length: number = env.otp.length): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(crypto.randomInt(0, digits.length));
  }
  return code;
}

/**
 * Request OTP for email login
 */
export async function requestOTP(
  email: string,
  client_id: string,
  client_secret?: string
): Promise<void> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Don't reveal if user exists (security best practice)
  if (!user) {
    // Still return success to prevent email enumeration
    return;
  }

  // Verify client credentials
  await verifyClientCredentials(client_id, client_secret);

  // Invalidate any existing unused OTPs for this user
  await prisma.emailOTP.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Generate OTP code
  const code = generateOTPCode();
  const expiresAt = getExpiryDate(env.otp.expiry);

  // Create OTP record
  await prisma.emailOTP.create({
    data: {
      userId: user.id,
      code,
      expiresAt,
    },
  });

  // Calculate expiry in minutes for email
  const expiresInMinutes = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (60 * 1000)
  );

  // Send email
  try {
    await sendOTPEmail(user.email, code, expiresInMinutes);
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to send OTP email:', error);
    throw new Error('Failed to send OTP email');
  }

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.OTP_REQUEST,
      metadata: {
        email: user.email,
        client_id,
      },
    },
  });
}

/**
 * Verify OTP and login
 */
export async function verifyOTPAndLogin(
  email: string,
  code: string,
  client_id: string,
  client_secret?: string,
  device_info?: Record<string, unknown>
): Promise<{
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AuthError('Invalid credentials');
  }

  // Find OTP
  const otp = await prisma.emailOTP.findFirst({
    where: {
      userId: user.id,
      code,
      used: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    throw new AuthError('Invalid or expired OTP code');
  }

  // Check if expired
  if (otp.expiresAt < new Date()) {
    throw new AuthError('OTP code has expired');
  }

  // Mark OTP as used
  await prisma.emailOTP.update({
    where: { id: otp.id },
    data: { used: true },
  });

  // Verify client credentials
  const app = await verifyClientCredentials(client_id, client_secret);

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
      deviceInfo: device_info ? (device_info as any) : null,
    },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.OTP_LOGIN,
      metadata: {
        app_id: app.id,
        client_id: app.clientId,
        device_info: device_info,
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


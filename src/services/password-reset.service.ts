import crypto from "crypto";
import { prisma } from "../config/database";
import { hashPassword } from "./password.service";
import { sendPasswordResetEmail } from "./email.service";
import { getExpiryDate } from "../utils/time";
import { env } from "../config/env";
import { AuthError } from "../utils/errors";
import { AuditAction } from "@prisma/client";

/**
 * Generate a cryptographically secure random OTP code for password reset
 */
function generatePasswordResetOTP(length: number = env.otp.length): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits.charAt(crypto.randomInt(0, digits.length));
  }
  return code;
}

/**
 * Request a password reset
 * Generates a token and sends reset email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Don't reveal if user exists (security best practice)
  if (!user) {
    // Still return success to prevent email enumeration
    return;
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Generate reset OTP code
  const token = generatePasswordResetOTP();
  const expiresAt = getExpiryDate(env.passwordReset.tokenExpiry);

  // Create reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const expiresInMinutes = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (60 * 1000)
  );

  // Send email
  try {
    await sendPasswordResetEmail(user.email, token, expiresInMinutes);
  } catch (error) {
    // Log error but don't fail the request
    // Token is already created, user can request again if needed
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUEST,
      metadata: {
        email: user.email,
      },
    },
  });
}

/**
 * Reset password using token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  // Find token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new AuthError("Invalid or expired reset token");
  }

  // Check if already used
  if (resetToken.used) {
    throw new AuthError("Reset token has already been used");
  }

  // Check if expired
  if (resetToken.expiresAt < new Date()) {
    throw new AuthError("Reset token has expired");
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  // Invalidate all refresh tokens for this user (security best practice)
  await prisma.refreshToken.updateMany({
    where: {
      userId: resetToken.userId,
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });

  // Audit log
  await prisma.authAudit.create({
    data: {
      userId: resetToken.userId,
      action: AuditAction.PASSWORD_RESET_COMPLETE,
      metadata: {
        email: resetToken.user.email,
      },
    },
  });
}

/**
 * Verify if a reset token is valid
 */
export async function verifyResetToken(token: string): Promise<boolean> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return false;
  }

  if (resetToken.used) {
    return false;
  }

  if (resetToken.expiresAt < new Date()) {
    return false;
  }

  return true;
}

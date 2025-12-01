import { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  refresh,
  revoke,
  getCurrentUser,
} from '../services/auth.service';
import { requestPasswordReset, resetPassword, verifyResetToken } from '../services/password-reset.service';
import { requestOTP, verifyOTPAndLogin } from '../services/otp.service';
// Controller functions only

/**
 * Register a new user
 */
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await register(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user and issue tokens
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokens = await login(req.body);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 */
export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokens = await refresh(req.body);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke refresh token
 */
export async function revokeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await revoke(req.body.refresh_token);
    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user information
 */
export async function meController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getCurrentUser(req.user.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

/**
 * Request password reset
 */
export async function requestPasswordResetController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await requestPasswordReset(req.body.email);
    // Always return success to prevent email enumeration
    res.json({
      message:
        'If an account with that email exists, a password reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await resetPassword(req.body.token, req.body.new_password);
    res.json({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify reset token
 */
export async function verifyResetTokenController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isValid = await verifyResetToken(req.body.token);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
      });
    }
    res.json({
      valid: true,
      message: 'Reset token is valid',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request OTP for email login
 */
export async function requestOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await requestOTP(
      req.body.email,
      req.body.client_id,
      req.body.client_secret
    );
    // Always return success to prevent email enumeration
    res.json({
      message:
        'If an account with that email exists, an OTP code has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP and login
 */
export async function verifyOTPController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokens = await verifyOTPAndLogin(
      req.body.email,
      req.body.code,
      req.body.client_id,
      req.body.client_secret,
      req.body.device_info
    );
    res.json(tokens);
  } catch (error) {
    next(error);
  }
}


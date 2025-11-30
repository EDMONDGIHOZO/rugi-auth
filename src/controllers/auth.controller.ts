import { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  refresh,
  revoke,
  getCurrentUser,
} from '../services/auth.service';
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


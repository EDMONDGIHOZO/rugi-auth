import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../utils/errors';
import { isSuperAdmin } from '../services/role.service';

/**
 * Middleware to check if the authenticated user is a superadmin
 * Must be used after authMiddleware
 */
export async function superAdminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // User should be attached by authMiddleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AuthError('Authentication required');
    }

    const isAdmin = await isSuperAdmin(userId);

    if (!isAdmin) {
      throw new AuthError('Access denied. Superadmin privileges required.');
    }

    next();
  } catch (error) {
    next(error);
  }
}


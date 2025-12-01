import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Middleware to check if user has required role in current app
 * Must be used after authMiddleware
 */
export function roleMiddleware(requiredRole: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!req.user.roles.includes(requiredRole)) {
      throw new ForbiddenError(
        `Required role: ${requiredRole}. User roles: ${req.user.roles.join(', ')}`
      );
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the required roles
 */
export function anyRoleMiddleware(...requiredRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const hasRole = requiredRoles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenError(
        `Required one of roles: ${requiredRoles.join(', ')}. User roles: ${req.user.roles.join(', ')}`
      );
    }

    next();
  };
}


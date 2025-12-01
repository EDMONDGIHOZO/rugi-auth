import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from "../services/token.service";
import { AuthError } from '../utils/errors';

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        clientId: string;
        appId: string;
        roles: string[];
      };
    }
  }
}

/**
 * Middleware to verify JWT access token
 * Extracts user context and attaches to request
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user context to request
    req.user = {
      userId: payload.sub,
      clientId: payload.aud,
      appId: payload.tid,
      roles: payload.roles,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      next(new AuthError('Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware
 * Doesn't fail if token is missing, but attaches user if present
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      req.user = {
        userId: payload.sub,
        clientId: payload.aud,
        appId: payload.tid,
        roles: payload.roles,
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}


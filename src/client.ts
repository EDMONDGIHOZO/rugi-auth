/**
 * Lightweight client exports for consuming applications.
 *
 * Use this entry point when you only need to verify tokens
 * in your Express app without the full auth service dependencies.
 *
 * @example
 * ```typescript
 * import { createAuthMiddleware, requireRole } from 'rugi-auth/client';
 *
 * const auth = createAuthMiddleware({
 *   jwksUri: 'https://auth.example.com/.well-known/jwks.json',
 *   issuer: 'rugi-auth',
 *   audience: 'your-client-id',
 * });
 *
 * app.get('/protected', auth, (req, res) => {
 *   res.json({ userId: req.user.userId });
 * });
 * ```
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-rsa";

// ============================================================================
// Types
// ============================================================================

export interface TokenPayload extends JwtPayload {
  sub: string; // User ID
  aud: string; // Client ID
  tid: string; // App ID
  roles: string[]; // User roles for this app
}

export interface AuthUser {
  userId: string;
  clientId: string;
  appId: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthMiddlewareOptions {
  /** JWKS URI for fetching public keys (e.g., 'https://auth.example.com/.well-known/jwks.json') */
  jwksUri: string;
  /** Expected token issuer (default: 'rugi-auth') */
  issuer?: string;
  /** Expected audience/client_id (optional, validates aud claim if provided) */
  audience?: string;
  /** Cache JWKS keys (default: true) */
  cache?: boolean;
  /** Cache max age in ms (default: 600000 = 10 minutes) */
  cacheMaxAge?: number;
}

// ============================================================================
// Error Classes
// ============================================================================

export class AuthError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = "Authentication failed", statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ForbiddenError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Auth Middleware Factory
// ============================================================================

/**
 * Creates an authentication middleware that verifies JWT tokens via JWKS.
 *
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const {
    jwksUri,
    issuer = "rugi-auth",
    audience,
    cache = true,
    cacheMaxAge = 600000,
  } = options;

  const client: JwksClient = jwksClient({
    jwksUri,
    cache,
    cacheMaxAge,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  function getSigningKey(
    header: JwtHeader,
    callback: SigningKeyCallback
  ): void {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  return function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"],
      issuer,
    };

    if (audience) {
      verifyOptions.audience = audience;
    }

    jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          res.status(401).json({ error: "Token expired" });
          return;
        }
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const payload = decoded as TokenPayload;
      req.user = {
        userId: payload.sub,
        clientId: payload.aud as string,
        appId: payload.tid,
        roles: payload.roles || [],
      };

      next();
    });
  };
}

/**
 * Creates an optional authentication middleware.
 * Attaches user if token is valid, continues without error if not.
 */
export function createOptionalAuthMiddleware(options: AuthMiddlewareOptions) {
  const {
    jwksUri,
    issuer = "rugi-auth",
    audience,
    cache = true,
    cacheMaxAge = 600000,
  } = options;

  const client: JwksClient = jwksClient({
    jwksUri,
    cache,
    cacheMaxAge,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  function getSigningKey(
    header: JwtHeader,
    callback: SigningKeyCallback
  ): void {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  return function optionalAuthMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"],
      issuer,
    };

    if (audience) {
      verifyOptions.audience = audience;
    }

    jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
      if (!err && decoded) {
        const payload = decoded as TokenPayload;
        req.user = {
          userId: payload.sub,
          clientId: payload.aud as string,
          appId: payload.tid,
          roles: payload.roles || [],
        };
      }
      next();
    });
  };
}

// ============================================================================
// Role Middleware
// ============================================================================

/**
 * Middleware to require a specific role.
 * Must be used after auth middleware.
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!req.user.roles.includes(role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: role,
        userRoles: req.user.roles,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require any of the specified roles.
 */
export function requireAnyRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: roles,
        userRoles: req.user.roles,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require all of the specified roles.
 */
export function requireAllRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const hasAllRoles = roles.every((role) => req.user!.roles.includes(role));

    if (!hasAllRoles) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: roles,
        userRoles: req.user.roles,
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Error Middleware
// ============================================================================

/**
 * Error handling middleware for auth errors.
 */
export function authErrorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AuthError || error instanceof ForbiddenError) {
    res.status((error as any).statusCode).json({ error: error.message });
    return;
  }

  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  next(error);
}

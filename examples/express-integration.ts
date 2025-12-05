/**
 * Example: Integrating rugi-auth with an Express application
 *
 * This is a complete, copy-paste ready example showing how to:
 * 1. Verify JWT tokens from rugi-auth using JWKS
 * 2. Protect routes with authentication
 * 3. Implement role-based access control
 */

import express, { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// ============================================================================
// Configuration
// ============================================================================

const config = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:7100",
  clientId: process.env.CLIENT_ID || "your-client-id",
  port: process.env.PORT || 4000,
};

// ============================================================================
// Type Definitions
// ============================================================================

interface TokenPayload extends JwtPayload {
  sub: string; // User ID
  aud: string; // Client ID
  tid: string; // App ID
  roles: string[]; // User roles for this app
}

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

// ============================================================================
// JWKS Client Setup
// ============================================================================

const jwks = jwksClient({
  jwksUri: `${config.authServiceUrl}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Middleware that requires a valid JWT token
 * Attaches user info to req.user
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: config.clientId,
      issuer: "rugi-auth",
      algorithms: ["RS256"],
    },
    (err, decoded) => {
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
        clientId: payload.aud,
        appId: payload.tid,
        roles: payload.roles || [],
      };

      next();
    }
  );
}

/**
 * Optional auth middleware - doesn't fail if no token
 * Attaches user info if token is valid, continues otherwise
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: config.clientId,
      issuer: "rugi-auth",
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (!err && decoded) {
        const payload = decoded as TokenPayload;
        req.user = {
          userId: payload.sub,
          clientId: payload.aud,
          appId: payload.tid,
          roles: payload.roles || [],
        };
      }
      next();
    }
  );
}

// ============================================================================
// Role-Based Access Control Middleware
// ============================================================================

/**
 * Requires user to have a specific role
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
 * Requires user to have at least one of the specified roles
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
 * Requires user to have ALL of the specified roles
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
// Example Express Application
// ============================================================================

const app = express();
app.use(express.json());

// Health check (public)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public endpoint with optional user context
app.get("/products", optionalAuthMiddleware, (req, res) => {
  const products = [
    { id: 1, name: "Widget", price: 9.99 },
    { id: 2, name: "Gadget", price: 19.99 },
  ];

  res.json({
    products,
    // Show personalized pricing for logged-in users
    personalizedPricing: req.user ? true : false,
  });
});

// Protected endpoint - requires authentication
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    userId: req.user!.userId,
    roles: req.user!.roles,
    appId: req.user!.appId,
  });
});

// Protected endpoint - requires 'customer' role
app.get("/orders", authMiddleware, requireRole("customer"), (req, res) => {
  res.json({
    orders: [
      { id: 1, total: 99.99, status: "delivered" },
      { id: 2, total: 49.99, status: "pending" },
    ],
  });
});

// Admin endpoint - requires 'admin' or 'superadmin' role
app.get(
  "/admin/users",
  authMiddleware,
  requireAnyRole("admin", "superadmin"),
  (req, res) => {
    res.json({
      users: [
        { id: 1, email: "user1@example.com" },
        { id: 2, email: "user2@example.com" },
      ],
    });
  }
);

// Superadmin only endpoint
app.delete(
  "/admin/users/:id",
  authMiddleware,
  requireRole("superadmin"),
  (req, res) => {
    res.json({ message: `User ${req.params.id} deleted` });
  }
);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📡 Auth service: ${config.authServiceUrl}`);
  console.log(`🔑 Client ID: ${config.clientId}`);
});

export default app;

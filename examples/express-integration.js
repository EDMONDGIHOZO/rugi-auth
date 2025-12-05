/**
 * Example: Integrating rugi-auth with an Express application (JavaScript)
 * 
 * This is a complete, copy-paste ready example showing how to:
 * 1. Verify JWT tokens from rugi-auth using JWKS
 * 2. Protect routes with authentication
 * 3. Implement role-based access control
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// ============================================================================
// Configuration
// ============================================================================

const config = {
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:7100',
  clientId: process.env.CLIENT_ID || 'your-client-id',
  port: process.env.PORT || 4000,
};

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

function getSigningKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
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
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: config.clientId,
      issuer: 'rugi-auth',
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        userId: decoded.sub,
        clientId: decoded.aud,
        appId: decoded.tid,
        roles: decoded.roles || [],
      };

      next();
    }
  );
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: config.clientId,
      issuer: 'rugi-auth',
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (!err && decoded) {
        req.user = {
          userId: decoded.sub,
          clientId: decoded.aud,
          appId: decoded.tid,
          roles: decoded.roles || [],
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
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: role,
        userRoles: req.user.roles,
      });
    }

    next();
  };
}

/**
 * Requires user to have at least one of the specified roles
 */
function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = roles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        userRoles: req.user.roles,
      });
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public endpoint with optional user context
app.get('/products', optionalAuthMiddleware, (req, res) => {
  const products = [
    { id: 1, name: 'Widget', price: 9.99 },
    { id: 2, name: 'Gadget', price: 19.99 },
  ];

  res.json({
    products,
    personalizedPricing: req.user ? true : false,
  });
});

// Protected endpoint - requires authentication
app.get('/profile', authMiddleware, (req, res) => {
  res.json({
    userId: req.user.userId,
    roles: req.user.roles,
    appId: req.user.appId,
  });
});

// Protected endpoint - requires 'customer' role
app.get('/orders', authMiddleware, requireRole('customer'), (req, res) => {
  res.json({
    orders: [
      { id: 1, total: 99.99, status: 'delivered' },
      { id: 2, total: 49.99, status: 'pending' },
    ],
  });
});

// Admin endpoint - requires 'admin' or 'superadmin' role
app.get(
  '/admin/users',
  authMiddleware,
  requireAnyRole('admin', 'superadmin'),
  (req, res) => {
    res.json({
      users: [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
      ],
    });
  }
);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📡 Auth service: ${config.authServiceUrl}`);
  console.log(`🔑 Client ID: ${config.clientId}`);
});

module.exports = { app, authMiddleware, optionalAuthMiddleware, requireRole, requireAnyRole };

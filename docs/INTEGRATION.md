# Integrating rugi-auth with Your Express Application

This guide explains how to use `rugi-auth` for authentication in your Express applications.

## Table of Contents

- [Overview](#overview)
- [Option 1: Standalone Auth Service](#option-1-standalone-auth-service-recommended-for-microservices)
- [Option 2: Direct Package Import](#option-2-direct-package-import)
- [API Reference](#api-reference)
- [Authentication Flows](#authentication-flow-examples)
- [Role-Based Access Control](#role-based-access-control-rbac)
- [Complete Example](#complete-example-e-commerce-api)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Overview

`rugi-auth` can be used in two ways:

| Approach               | Best For      | Description                               |
| ---------------------- | ------------- | ----------------------------------------- |
| **Standalone Service** | Microservices | Deploy separately, verify tokens via JWKS |
| **Package Import**     | Monoliths     | Import middleware directly into your app  |

---

## Option 1: Standalone Auth Service (Recommended for Microservices)

Deploy `rugi-auth` as a centralized authentication service, and verify tokens in your app using the lightweight client.

### Step 1: Deploy the Auth Service

```bash
# Clone and set up rugi-auth
git clone https://github.com/EDMONDGIHOZO/rugi-auth.git
cd rugi-auth
npm install
npm run generate:keys
npm run prisma:generate
npm run prisma:migrate
npm run start
```

Your auth service is now running at `http://localhost:3000` (or your configured port).

### Step 2: Register Your Application

Create a client application in `rugi-auth`:

```bash
curl -X POST http://localhost:3000/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "name": "My Express App",
    "type": "CONFIDENTIAL",
    "redirect_uris": ["http://localhost:4000/callback"]
  }'
```

Save the returned `client_id` and `client_secret`.

### Step 3: Install the Package

```bash
npm install rugi-auth
```

### Step 4: Use the Lightweight Client (Recommended)

The `rugi-auth/client` import has only **2 dependencies** and is perfect for consumer apps:

```typescript
// app.ts
import express from "express";
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireRole,
  requireAnyRole,
  authErrorMiddleware,
} from "rugi-auth/client";

const app = express();

// Create auth middleware
const auth = createAuthMiddleware({
  jwksUri: process.env.AUTH_SERVICE_URL + "/.well-known/jwks.json",
  issuer: "rugi-auth",
  audience: process.env.CLIENT_ID, // optional
});

const optionalAuth = createOptionalAuthMiddleware({
  jwksUri: process.env.AUTH_SERVICE_URL + "/.well-known/jwks.json",
  issuer: "rugi-auth",
});

// Public route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected route
app.get("/profile", auth, (req, res) => {
  res.json({
    userId: req.user!.userId,
    roles: req.user!.roles,
  });
});

// Optional auth - user available if logged in
app.get("/products", optionalAuth, (req, res) => {
  res.json({
    products: [...],
    personalized: !!req.user,
  });
});

// Role-protected routes
app.get("/admin", auth, requireRole("admin"), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

app.get("/dashboard", auth, requireAnyRole("admin", "manager"), (req, res) => {
  res.json({ data: "..." });
});

// Error handler
app.use(authErrorMiddleware);

app.listen(4000);
```

### Alternative: Manual JWT Verification

If you prefer not to use the package, you can verify tokens manually:

### Step 4 (Alternative): Create Auth Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// Configure JWKS client
const client = jwksClient({
  jwksUri: process.env.AUTH_SERVICE_URL + "/.well-known/jwks.json",
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
});

// Extend Express Request
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

interface TokenPayload extends JwtPayload {
  sub: string;
  aud: string;
  tid: string;
  roles: string[];
}

function getSigningKey(
  header: jwt.JwtHeader,
  callback: jwt.SigningKeyCallback
) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: process.env.CLIENT_ID, // Your app's client_id
      issuer: "rugi-auth",
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const payload = decoded as TokenPayload;
      req.user = {
        userId: payload.sub,
        clientId: payload.aud,
        appId: payload.tid,
        roles: payload.roles,
      };

      next();
    }
  );
}

// Role checking middleware
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        error: `Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
}
```

### Step 5: Use in Your Express App

```typescript
// app.ts
import express from "express";
import { authMiddleware, requireRole } from "./middleware/auth";

const app = express();

// Public routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected routes
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    userId: req.user!.userId,
    roles: req.user!.roles,
  });
});

// Role-protected routes
app.get(
  "/admin/dashboard",
  authMiddleware,
  requireRole("admin", "superadmin"),
  (req, res) => {
    res.json({ message: "Welcome, admin!" });
  }
);

app.listen(4000, () => {
  console.log("App running on port 4000");
});
```

### Step 6: Client-Side Login Flow

Your frontend should authenticate against the auth service:

```typescript
// Login request
const response = await fetch("http://auth-service.com/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
    client_id: "your-client-id",
    client_secret: "your-client-secret", // For CONFIDENTIAL apps
  }),
});

const { access_token, refresh_token } = await response.json();

// Use access_token for API calls to your app
const apiResponse = await fetch("http://your-app.com/profile", {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});
```

---

## Option 2: Direct Package Import

Import `rugi-auth` middleware and services directly into your Express app.

### Step 1: Install the Package

```bash
# From npm (when published)
npm install rugi-auth

# Or link locally during development
cd /path/to/rugi-auth
npm link

cd /path/to/your-app
npm link rugi-auth
```

### Step 2: Set Up Environment

Your app needs access to the same configuration as `rugi-auth`:

```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/rugi_auth"
JWT_ISSUER="rugi-auth"
JWT_ACCESS_TOKEN_EXPIRY="7d"
PRIVATE_KEY_PATH="./keys/private.pem"
PUBLIC_KEY_PATH="./keys/public.pem"
```

### Step 3: Use Middleware Directly

```typescript
// app.ts
import express from "express";
import {
  authMiddleware,
  optionalAuthMiddleware,
  roleMiddleware,
  anyRoleMiddleware,
  errorMiddleware,
} from "rugi-auth";

const app = express();
app.use(express.json());

// Public routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected routes - require authentication
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    userId: req.user!.userId,
    roles: req.user!.roles,
  });
});

// Optional auth - user info available if logged in
app.get("/products", optionalAuthMiddleware, (req, res) => {
  const products = getProducts();

  if (req.user) {
    // Show personalized content for logged-in users
    return res.json({ products, personalized: true });
  }

  res.json({ products });
});

// Role-based routes
app.get(
  "/admin/users",
  authMiddleware,
  roleMiddleware("admin"), // Requires exact role
  (req, res) => {
    res.json({ users: [] });
  }
);

app.get(
  "/dashboard",
  authMiddleware,
  anyRoleMiddleware("admin", "manager", "moderator"), // Any of these roles
  (req, res) => {
    res.json({ dashboard: {} });
  }
);

// Error handling (should be last)
app.use(errorMiddleware);

app.listen(4000);
```

### Step 4: Use Services Directly

```typescript
import {
  verifyAccessToken,
  generateAccessToken,
  TokenPayload,
} from "rugi-auth";

// Verify a token manually
try {
  const payload: TokenPayload = verifyAccessToken(token);
  console.log("User ID:", payload.sub);
  console.log("Roles:", payload.roles);
} catch (error) {
  console.log("Invalid token");
}

// Generate a token (if you have access to private key)
const token = generateAccessToken("user-id", "client-id", "app-id", [
  "user",
  "admin",
]);
```

---

## API Reference

### Middleware

| Middleware                    | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `authMiddleware`              | Requires valid JWT, attaches `req.user`                |
| `optionalAuthMiddleware`      | Attaches `req.user` if token present, continues if not |
| `roleMiddleware(role)`        | Requires user to have specific role                    |
| `anyRoleMiddleware(...roles)` | Requires user to have any of the specified roles       |
| `errorMiddleware`             | Global error handler for auth errors                   |

### Request User Object

After `authMiddleware`, `req.user` contains:

```typescript
interface User {
  userId: string; // User's unique ID
  clientId: string; // Application's client_id
  appId: string; // Application's internal ID
  roles: string[]; // User's roles for this application
}
```

### Token Payload (JWT Claims)

```typescript
interface TokenPayload {
  sub: string; // User ID
  aud: string; // Client ID (audience)
  tid: string; // App ID (tenant)
  roles: string[]; // User roles
  iss: string; // Issuer (rugi-auth)
  iat: number; // Issued at
  exp: number; // Expires at
}
```

---

## Authentication Flow Examples

### Login Flow

```
┌─────────┐      ┌─────────────┐      ┌───────────┐
│ Client  │      │  Your App   │      │ rugi-auth │
└────┬────┘      └──────┬──────┘      └─────┬─────┘
     │                  │                   │
     │ 1. Login Request │                   │
     │ ─────────────────────────────────────>
     │                  │                   │
     │ 2. access_token + refresh_token      │
     │ <─────────────────────────────────────
     │                  │                   │
     │ 3. API Request   │                   │
     │  (Bearer token)  │                   │
     │ ─────────────────>                   │
     │                  │                   │
     │                  │ 4. Verify token   │
     │                  │    (via JWKS)     │
     │                  │ ──────────────────>
     │                  │                   │
     │                  │ 5. Public key     │
     │                  │ <──────────────────
     │                  │                   │
     │ 6. Response      │                   │
     │ <─────────────────                   │
```

### Token Refresh Flow

```typescript
// When access token expires, use refresh token
const response = await fetch("http://auth-service.com/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refresh_token: storedRefreshToken,
    client_id: "your-client-id",
  }),
});

const { access_token, refresh_token } = await response.json();
// Note: refresh_token is rotated - save the new one!
```

---

## Role-Based Access Control (RBAC)

### Understanding App-Specific Roles

Each user can have different roles in different applications:

```
User: john@example.com
├── App: E-commerce    → roles: ['customer', 'reviewer']
├── App: Admin Panel   → roles: ['admin']
└── App: Blog          → roles: ['author', 'editor']
```

### Assigning Roles

```bash
# Via API
curl -X POST http://auth-service.com/users/{userId}/roles \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app-uuid",
    "role_name": "admin"
  }'
```

### Checking Roles in Code

```typescript
// Single role check
if (req.user.roles.includes("admin")) {
  // User is admin
}

// Multiple roles check
const isPrivileged = ["admin", "moderator", "superadmin"].some((role) =>
  req.user.roles.includes(role)
);

// Using middleware
app.delete(
  "/posts/:id",
  authMiddleware,
  anyRoleMiddleware("admin", "moderator"),
  deletePost
);
```

---

## Complete Example: E-commerce API

```typescript
// app.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const app = express();
app.use(express.json());

// JWKS client for token verification
const client = jwksClient({
  jwksUri: process.env.AUTH_SERVICE_URL + '/.well-known/jwks.json',
  cache: true,
});

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.substring(7);
  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      callback(err, key?.getPublicKey());
    });
  }, { algorithms: ['RS256'], issuer: 'rugi-auth' }, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// Role middleware
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.some(r => req.user.roles.includes(r))) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Routes
app.get('/products', (req, res) => {
  res.json({ products: [...] });
});

app.post('/products', authenticate, requireRole('admin', 'seller'), (req, res) => {
  // Create product
});

app.get('/orders', authenticate, (req, res) => {
  // Return user's orders
  const orders = getOrdersForUser(req.user.sub);
  res.json({ orders });
});

app.get('/admin/orders', authenticate, requireRole('admin'), (req, res) => {
  // Return all orders (admin only)
  res.json({ orders: getAllOrders() });
});

app.listen(4000);
```

---

## Environment Variables Reference

| Variable           | Description                      | Default                 |
| ------------------ | -------------------------------- | ----------------------- |
| `AUTH_SERVICE_URL` | URL of rugi-auth service         | `http://localhost:3000` |
| `CLIENT_ID`        | Your application's client ID     | -                       |
| `CLIENT_SECRET`    | Your application's client secret | -                       |

---

## Troubleshooting

### "Invalid token" errors

1. Check that the token hasn't expired
2. Verify the `issuer` matches (default: `rugi-auth`)
3. Ensure the `audience` (client_id) matches your app
4. Confirm the JWKS endpoint is accessible

### "Missing authorization header"

Ensure you're sending the header correctly:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Token not refreshing

- Refresh tokens are rotated on each use
- Always save the new refresh token from the response
- Old refresh tokens become invalid immediately

### CORS issues

Configure `CORS_ORIGIN` in the auth service to include your app's origin:

```env
CORS_ORIGIN="http://localhost:4000,https://myapp.com"
```

---

## Security Best Practices

1. **Store tokens securely** - Use httpOnly cookies or secure storage
2. **Validate audience** - Always verify the token's `aud` matches your client_id
3. **Handle token refresh** - Implement automatic token refresh before expiry
4. **Log authentication events** - The auth service logs all events for auditing
5. **Use HTTPS** - Always use HTTPS in production
6. **Rotate secrets** - Periodically rotate client secrets

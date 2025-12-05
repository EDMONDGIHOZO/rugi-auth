# Rugi Auth

[![npm version](https://img.shields.io/npm/v/rugi-auth.svg)](https://www.npmjs.com/package/rugi-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org)

A production-ready, centralized authentication service that enables multiple applications to share a single user base with app-specific role-based access control.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage in Your App](#usage-in-your-app)
- [API Reference](#api-reference)
- [JWT Token Structure](#jwt-token-structure)
- [Deployment](#deployment)
- [Security](#security)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 **Centralized Auth** | Single user account across all your applications |
| 👥 **Multi-App Roles** | Different roles per user per application |
| 🔑 **RS256 JWT** | Asymmetric key signing for secure token verification |
| 🔄 **Token Rotation** | Refresh tokens are rotated on each use |
| 🛡️ **Argon2id Hashing** | Industry-standard password security |
| 📝 **Audit Logging** | Track all authentication events |
| ⚡ **Rate Limiting** | Built-in brute force protection |
| 🌐 **OAuth Support** | Google, GitHub, and more |

---

## Installation

### As a Standalone Service

```bash
git clone https://github.com/your-org/rugi-auth.git
cd rugi-auth
npm install
```

### As an npm Package

```bash
npm install rugi-auth
```

---

## Quick Start

### 1. Setup Environment

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://rugi:rugi_password@localhost:5432/rugi_auth"
JWT_ISSUER="rugi-auth"
PORT=3000
```

### 2. Start Database

```bash
docker-compose up -d postgres
```

### 3. Initialize

```bash
npm run generate:keys      # Generate RSA keys
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed default data
```

### 4. Run

```bash
npm run dev                # Development
npm run start              # Production
```

🚀 Server running at `http://localhost:3000`

---

## Usage in Your App

### Option 1: Verify Tokens via JWKS (Recommended)

Install dependencies in your Express app:

```bash
npm install jsonwebtoken jwks-rsa
```

Create auth middleware:

```javascript
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: "https://your-auth-server.com/.well-known/jwks.json",
  cache: true,
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.substring(7);
  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(
    token,
    (header, cb) => {
      client.getSigningKey(header.kid, (err, key) => {
        cb(err, key?.getPublicKey());
      });
    },
    { algorithms: ["RS256"], issuer: "rugi-auth" },
    (err, decoded) => {
      if (err) return res.status(401).json({ error: "Invalid token" });
      req.user = { userId: decoded.sub, roles: decoded.roles };
      next();
    }
  );
}

// Protect your routes
app.get("/profile", authMiddleware, (req, res) => {
  res.json({ userId: req.user.userId, roles: req.user.roles });
});
```

### Option 2: Import Package Directly

```javascript
import { authMiddleware, roleMiddleware, errorMiddleware } from "rugi-auth";

// Require authentication
app.get("/profile", authMiddleware, (req, res) => {
  res.json({ userId: req.user.userId });
});

// Require specific role
app.get("/admin", authMiddleware, roleMiddleware("admin"), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

// Error handler (add last)
app.use(errorMiddleware);
```

### Available Middleware

| Middleware | Description |
|------------|-------------|
| `authMiddleware` | Requires valid JWT, attaches `req.user` |
| `optionalAuthMiddleware` | Attaches user if token present, continues if not |
| `roleMiddleware(role)` | Requires user to have specific role |
| `anyRoleMiddleware(...roles)` | Requires any of the specified roles |

📖 **[Full Integration Guide →](docs/INTEGRATION.md)**

📁 **[Working Examples →](examples/)**

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register new user |
| `POST` | `/login` | Login, get tokens |
| `POST` | `/refresh` | Refresh access token |
| `POST` | `/revoke` | Revoke refresh token |
| `GET` | `/me` | Get current user |
| `GET` | `/.well-known/jwks.json` | Public keys (JWKS) |

### Example: Login

**Request:**

```bash
curl -X POST https://auth.example.com/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "client_id": "your-app-client-id"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apps` | Register client app |
| `POST` | `/apps/:id/roles` | Create app role |
| `POST` | `/users/:id/roles` | Assign user role |
| `GET` | `/audit` | View audit logs |

---

## JWT Token Structure

Access tokens contain these claims:

```json
{
  "sub": "user-uuid",
  "aud": "client-id",
  "tid": "app-uuid",
  "roles": ["admin", "user"],
  "iss": "rugi-auth",
  "iat": 1704067200,
  "exp": 1704672000
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `aud` | Client ID (audience) |
| `tid` | App ID (tenant) |
| `roles` | User's roles for this app |
| `iss` | Issuer |
| `iat` / `exp` | Issued at / Expires at |

---

## Deployment

### With PM2 (Recommended)

```bash
npm run build
npm run prisma:generate
npm run start:pm2
```

### PM2 Commands

```bash
npm run start:pm2      # Start
npm run stop:pm2       # Stop
npm run restart:pm2    # Restart
npm run logs:pm2       # View logs
```

### With Docker

```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL` for production database
- [ ] Generate and secure RSA keys
- [ ] Set `CORS_ORIGIN` to allowed domains
- [ ] Use HTTPS (via reverse proxy)
- [ ] Configure rate limits for your traffic
- [ ] Set up log rotation
- [ ] Enable database backups

---

## Security

### Built-in Protections

- **RS256 JWT** - Asymmetric keys, verify without secret
- **Argon2id** - Memory-hard password hashing (64MB, time: 3)
- **Token Rotation** - Refresh tokens invalidated on use
- **Rate Limiting** - Configurable per-endpoint limits
- **Helmet.js** - Security headers
- **Joi Validation** - Input sanitization
- **Prisma** - SQL injection prevention

### Best Practices

1. Never commit `keys/private.pem`
2. Use different secrets per environment
3. Rotate client secrets periodically
4. Always use HTTPS in production
5. Monitor audit logs regularly

---

## Project Structure

```
src/
├── config/          # Environment, database, keys
├── controllers/     # Request handlers
├── middleware/      # Auth, rate limit, validation
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Logger, errors, validators
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run generate:keys` | Generate RSA key pair |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open database GUI |

---

## License

MIT © [edmondgi](https://github.com/edmondgi)

---

## Links

- 📖 [Integration Guide](docs/INTEGRATION.md)
- 📁 [Examples](examples/)
- 🐛 [Report Issue](https://github.com/your-org/rugi-auth/issues)

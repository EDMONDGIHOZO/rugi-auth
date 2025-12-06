# Rugi Auth

<div align="center">

[![npm version](https://img.shields.io/npm/v/rugi-auth.svg?style=flat-square)](https://www.npmjs.com/package/rugi-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**A production-ready, centralized authentication service for all your applications.**

[Quick Start](#-quick-start-guide) · [Features](#-features) · [Documentation](#-documentation) · [API Reference](#-api-reference)

</div>

---

## 📖 Quick Start Guide

Rugi Auth offers flexibility for any setup. Whether you want to spin up a standalone auth server in minutes or integrate authentication into an existing Express app, we've got you covered.

_Estimated completion time: 5-10 minutes_

### Prerequisites

Before getting started, ensure you have:

- **Node.js** `v18` or higher (LTS recommended)
- **npm**, **yarn**, or **pnpm**
- **Docker** (for PostgreSQL) or an existing PostgreSQL database
- **Git** (for version control)

---

## 🚀 Part A: Create a New Project

We'll create a new Rugi Auth project using our CLI tool. This sets up everything you need automatically — including an optional admin dashboard!

<details>
<summary><strong>Step 1: Run the installation command</strong></summary>

Open your terminal and run:

```bash
npx rugi-auth init my-auth-server
```

You'll be guided through a quick setup process:

```
╦═╗╦ ╦╔═╗╦  ╔═╗╦ ╦╔╦╗╦ ╦
╠╦╝║ ║║ ╦║  ╠═╣║ ║ ║ ╠═╣
╩╚═╚═╝╚═╝╩  ╩ ╩╚═╝ ╩ ╩ ╩

  Centralized Authentication Service v2.2.0

  Welcome to Rugi Auth! Let's set up your project.

? What is your project name? my-auth-server
? Include admin dashboard? (React frontend for managing users, apps, roles) Yes
```

The CLI will:

- ✅ Create your project structure
- ✅ Generate RSA keys for JWT signing
- ✅ Set up your Prisma schema
- ✅ Install backend dependencies
- ✅ Clone and configure the admin dashboard (optional)
- ✅ Auto-configure dashboard with your credentials

**Output:**

```
✓ Project structure created
✓ RSA keys generated
✓ Prisma schema configured
✓ Backend dependencies installed
✓ Admin dashboard cloned
✓ Dashboard dependencies installed

  ✓ Project created successfully!

  Next steps:

  1. cd my-auth-server
  2. docker-compose up -d        # Start PostgreSQL
  3. npm run prisma:migrate      # Run migrations
  4. npm run setup               # Initialize app + superadmin
  5. npm run dev:all             # Start backend + dashboard

  Backend:   http://localhost:7100
  Dashboard: http://localhost:5173
```

</details>

<details>
<summary><strong>Step 2: Start your database</strong></summary>

Navigate to your project and start PostgreSQL:

```bash
cd my-auth-server
docker-compose up -d
```

This starts a PostgreSQL container configured for Rugi Auth.

> **Tip:** If you prefer to use an existing database, update the `DATABASE_URL` in your `.env` file.

</details>

<details>
<summary><strong>Step 3: Run database migrations</strong></summary>

Apply the database schema:

```bash
npm run prisma:migrate
```

When prompted, enter a name for your migration (e.g., `init`).

</details>

<details>
<summary><strong>Step 4: Complete the setup</strong></summary>

Run the interactive setup wizard:

```bash
npm run setup
```

This will:
1. Generate RSA keys (if not already done)
2. Create a default application with client credentials
3. Create your first superadmin account

**Output:**

```
  📱 App Credentials

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  App Name:      Rugi Dashboard
  Client ID:     rugi-dashboard-dev
  Client Secret: [your-64-character-secret]
  Type:          CONFIDENTIAL
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💾 Save these credentials - the secret won't be shown again!
```

> ⚠️ **Important:** Save your client credentials securely. You'll need them for API requests.

</details>

<details>
<summary><strong>Step 5: Start the server</strong></summary>

```bash
npm run dev
```

🎉 **Congratulations!** Your Rugi Auth server is now running at:

- **API:** http://localhost:7100
- **Docs:** http://localhost:7100/docs
- **JWKS:** http://localhost:7100/.well-known/jwks.json

</details>

---

## 🔧 Part B: Use as a Client Library

If you just want to protect routes in your Express app (without running a full auth server), use the lightweight client:

```bash
npm install rugi-auth
```

```typescript
import express from 'express';
import {
  createAuthMiddleware,
  requireRole,
  requireAnyRole,
} from 'rugi-auth/client';

const app = express();

// Create auth middleware pointing to your Rugi Auth server
const auth = createAuthMiddleware({
  jwksUri: 'https://auth.yourcompany.com/.well-known/jwks.json',
  issuer: 'rugi-auth',
  audience: 'your-client-id', // optional
});

// Protect routes
app.get('/profile', auth, (req, res) => {
  res.json({ userId: req.user.userId, roles: req.user.roles });
});

// Require specific role
app.get('/admin', auth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});

// Require any of multiple roles
app.get('/dashboard', auth, requireAnyRole('admin', 'manager'), (req, res) => {
  res.json({ data: '...' });
});

app.listen(4000);
```

**The client has only 2 dependencies:** `jsonwebtoken` and `jwks-rsa` — perfect for microservices.

---

## 🖥️ Admin Dashboard

Rugi Auth comes with an optional admin dashboard for managing your authentication service visually.

<div align="center">

| Feature | Description |
|---------|-------------|
| 👥 **User Management** | List, invite, and manage users |
| 📱 **App Management** | Create and configure client applications |
| 🎭 **Role Management** | Define app-specific roles and assign them |
| 📊 **Audit Logs** | View all authentication events |
| ⚙️ **Auth Settings** | Configure OAuth providers, email settings |

</div>

The dashboard is automatically configured during setup with your app credentials — just log in with your superadmin account!

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Centralized Auth** | Single user account across all your applications |
| 👥 **Multi-App Roles** | Different roles per user per application |
| 🔑 **RS256 JWT** | Asymmetric key signing for secure token verification |
| 🔄 **Token Rotation** | Refresh tokens are rotated on each use |
| 🛡️ **Argon2id Hashing** | Industry-standard password security |
| 📝 **Audit Logging** | Track all authentication events |
| ⚡ **Rate Limiting** | Built-in brute force protection |
| 🌐 **OAuth Support** | Google, GitHub, and more providers |
| 📧 **Email OTP** | Passwordless authentication option |
| 🎨 **Swagger Docs** | Auto-generated API documentation |
| 🖥️ **Admin Dashboard** | React frontend for visual management |

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [**Integration Guide**](docs/INTEGRATION.md) | Detailed guide for using Rugi Auth in your apps |
| [**Standalone Setup**](docs/STANDALONE_SETUP.md) | Advanced server configuration and deployment |

---

## 🔌 API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and receive tokens |
| `POST` | `/refresh` | Refresh your access token |
| `POST` | `/revoke` | Revoke a refresh token |
| `GET` | `/me` | Get current user info |
| `GET` | `/.well-known/jwks.json` | Public keys (JWKS) |

### Example: Login

**Request:**

```bash
curl -X POST http://localhost:7100/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "client_id": "rugi-dashboard-dev",
    "client_secret": "your-client-secret"
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
| `POST` | `/apps` | Register a new client application |
| `GET` | `/apps` | List all applications |
| `POST` | `/apps/:id/roles` | Create an app-specific role |
| `POST` | `/users/:id/roles` | Assign a role to a user |
| `GET` | `/audit` | View audit logs |

---

## 🔑 JWT Token Structure

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
| `iss` | Token issuer |
| `iat` / `exp` | Issued at / Expires at |

---

## 🚢 Deployment

### Production with PM2

```bash
npm run build
npm run start:pm2
```

### With Docker

```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production `DATABASE_URL`
- [ ] Generate and secure RSA keys
- [ ] Set `CORS_ORIGIN` to allowed domains
- [ ] Use HTTPS (via reverse proxy)
- [ ] Configure rate limits for your traffic
- [ ] Set up log rotation
- [ ] Enable database backups

---

## 🛡️ Security

### Built-in Protections

- **RS256 JWT** — Asymmetric keys, verify without sharing secrets
- **Argon2id** — Memory-hard password hashing (64MB, time: 3)
- **Token Rotation** — Refresh tokens invalidated on use
- **Rate Limiting** — Configurable per-endpoint limits
- **Helmet.js** — Security headers
- **Joi Validation** — Input sanitization
- **Prisma** — SQL injection prevention

### Best Practices

1. Never commit `keys/private.pem` to version control
2. Use different secrets per environment
3. Rotate client secrets periodically
4. Always use HTTPS in production
5. Monitor audit logs regularly

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `npx rugi-auth init [name]` | Create a new Rugi Auth project (with optional dashboard) |
| `npx rugi-auth generate-keys` | Generate RSA key pair |
| `npx rugi-auth init-app` | Initialize default application |
| `npx rugi-auth create-superadmin` | Create a superadmin user |
| `npx rugi-auth setup` | Run complete setup wizard |

### Project Scripts (after init)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend server |
| `npm run dev:all` | Start backend + dashboard together |
| `npm run dashboard:dev` | Start dashboard only |
| `npm run setup` | Initialize app + create superadmin |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open database GUI |

---

## 📁 Project Structure

```
my-auth-server/
├── src/
│   └── server.ts         # Server entry point
├── dashboard/            # Admin dashboard (optional)
│   ├── src/
│   │   ├── pages/        # Dashboard pages
│   │   ├── components/   # UI components
│   │   └── lib/          # API client
│   └── .env              # Dashboard config (auto-generated)
├── keys/
│   ├── private.pem       # JWT signing key (keep secret!)
│   └── public.pem        # JWT verification key
├── prisma/
│   └── schema.prisma     # Database schema
├── .env                  # Backend configuration
├── docker-compose.yml    # PostgreSQL container
└── package.json
```

---

## 🆘 Troubleshooting

### "Database connection failed"

```bash
# Ensure PostgreSQL is running
docker-compose up -d

# Check your DATABASE_URL in .env
```

### "Invalid token" errors

1. Check that the token hasn't expired
2. Verify the `issuer` matches (default: `rugi-auth`)
3. Ensure the `audience` (client_id) matches your app
4. Confirm the JWKS endpoint is accessible

### "Keys not found"

```bash
npx rugi-auth generate-keys
```

---

## 📄 License

MIT © [EDMONDGIHOZO](https://github.com/EDMONDGIHOZO)

---

## 🔗 Links

- 📖 [Full Documentation](docs/INTEGRATION.md)
- 📁 [Examples](examples/)
- 🐛 [Report an Issue](https://github.com/EDMONDGIHOZO/rugi-auth/issues)
- 💬 [Discussions](https://github.com/EDMONDGIHOZO/rugi-auth/discussions)

---

<div align="center">

**Made with ❤️ for developers who value security**

[⬆ Back to top](#rugi-auth)

</div>

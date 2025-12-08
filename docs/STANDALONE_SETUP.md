# Standalone Server Setup Guide

This guide walks you through deploying Rugi Auth as a **standalone authentication service** for your organization.

_Estimated completion time: 10-15 minutes_

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Option 1: Quick Setup (Recommended)](#-option-1-quick-setup-recommended)
- [Option 2: Manual Setup](#-option-2-manual-setup)
- [Configuration](#-configuration)
- [First Login](#-first-login)
- [Managing Your Server](#-managing-your-server)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 📦 Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Notes |
|------------|---------|-------|
| Node.js | 18+ | LTS version recommended |
| npm/yarn/pnpm | Latest | Package manager |
| Docker | Latest | For PostgreSQL (or use existing database) |
| PostgreSQL | 14+ | If not using Docker |

---

## 🚀 Option 1: Quick Setup (Recommended)

The fastest way to get started. One command creates everything you need.

### Step 1: Create Your Project

```bash
npx rugi-auth init my-auth-server
```

This command:
- Creates a new project directory
- Sets up the folder structure
- Generates RSA keys for JWT signing
- Installs all dependencies
- Configures Prisma schema

### Step 2: Start the Database

```bash
cd my-auth-server
docker-compose up -d
```

Wait a few seconds for PostgreSQL to initialize.

### Step 3: Run Migrations

```bash
npm run prisma:migrate
```

Enter a migration name when prompted (e.g., `init`).

### Step 4: Complete Setup

Run the interactive setup wizard:

```bash
npm run setup
```

You'll be guided to:
1. Create the default application (with client credentials)
2. Create your first superadmin account

**Save the credentials displayed!** You'll need them for API requests.

### Step 5: Start Your Server

```bash
npm run dev
```

🎉 **Your server is running!**

- **API:** http://localhost:7100
- **Swagger Docs:** http://localhost:7100/docs
- **JWKS Endpoint:** http://localhost:7100/.well-known/jwks.json

---

## 🔧 Option 2: Manual Setup

For more control over the setup process, follow these steps:

### Step 1: Create Project Structure

```bash
mkdir my-auth-server && cd my-auth-server
npm init -y
npm install rugi-auth dotenv
npm install -D typescript tsx @types/node prisma
```

### Step 2: Create Server Entry Point

Create `src/server.ts`:

```typescript
import 'dotenv/config';
import { app } from 'rugi-auth';

const PORT = process.env.PORT || 7100;

app.listen(PORT, () => {
  console.log(`🚀 Rugi Auth running on http://localhost:${PORT}`);
});
```

### Step 3: Configure Environment

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://rugi:rugi_password@localhost:5433/rugi_auth"

# Server
PORT=7100
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# JWT
JWT_ISSUER="rugi-auth"
JWT_ACCESS_TOKEN_EXPIRY="7d"
JWT_REFRESH_TOKEN_EXPIRY="30d"

# Keys
PRIVATE_KEY_PATH="./keys/private.pem"
PUBLIC_KEY_PATH="./keys/public.pem"
```

### Step 4: Generate RSA Keys

```bash
npx rugi-auth generate-keys
```

### Step 5: Setup Database

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: rugi
      POSTGRES_PASSWORD: rugi_password
      POSTGRES_DB: rugi_auth
    ports:
      - "5433:5432"
    volumes:
      - rugi_auth_data:/var/lib/postgresql/data

volumes:
  rugi_auth_data:
```

Start the database:

```bash
docker-compose up -d
```

### Step 6: Initialize Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Step 7: Initialize Application

```bash
npx rugi-auth init-app
```

Save the displayed client credentials!

### Step 8: Create Superadmin

```bash
npx rugi-auth create-superadmin
```

Follow the prompts to create your admin account.

### Step 9: Start Server

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

Start the server:

```bash
npm run dev
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | `7100` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `*` |
| `JWT_ISSUER` | Token issuer name | `rugi-auth` |
| `JWT_ACCESS_TOKEN_EXPIRY` | Access token lifetime | `7d` |
| `JWT_REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | `30d` |
| `PRIVATE_KEY_PATH` | Path to RSA private key | `./keys/private.pem` |
| `PUBLIC_KEY_PATH` | Path to RSA public key | `./keys/public.pem` |

### Email Configuration (Optional)

For password resets and OTP authentication:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM="Rugi Auth <noreply@example.com>"
```

---

## 🔐 First Login

Test your setup with a login request:

```bash
curl -X POST http://localhost:7100/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-password",
    "client_id": "rugi-dashboard-dev",
    "client_secret": "your-64-char-secret"
  }'
```

**Successful Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

### Verify Your Token

```bash
# Get user info
curl http://localhost:7100/me \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### Test Admin Access

```bash
# List all users (superadmin only)
curl http://localhost:7100/users \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# List all apps
curl http://localhost:7100/apps \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

---

## 🛠️ Managing Your Server

### CLI Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npx rugi-auth generate-keys` | Generate new RSA keys |
| `npx rugi-auth init-app` | Reset/create default app credentials |
| `npx rugi-auth create-superadmin` | Create another superadmin |
| `npm run prisma:studio` | Open database GUI |

### Prisma Commands

```bash
# Open database GUI
npm run prisma:studio

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Creating Additional Apps

```bash
curl -X POST http://localhost:7100/apps \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My New App",
    "type": "CONFIDENTIAL",
    "redirect_uris": ["http://localhost:4000/callback"]
  }'
```

---

## 🚢 Production Deployment

### With PM2 (Recommended)

```bash
# Build the project
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/server.js --name rugi-auth

# Save PM2 config
pm2 save
pm2 startup
```

### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'rugi-auth',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 7100
    }
  }]
};
```

### With Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma
COPY keys ./keys

RUN npx prisma generate

EXPOSE 7100

CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t rugi-auth .
docker run -d -p 7100:7100 --env-file .env rugi-auth
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a production PostgreSQL database
- [ ] Configure `CORS_ORIGIN` to specific domains
- [ ] Set up HTTPS (via nginx/Caddy)
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Enable monitoring (PM2, Prometheus, etc.)
- [ ] Review rate limit settings
- [ ] Secure your RSA private key

---

## 🆘 Troubleshooting

### "Database connection failed"

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart the database
docker-compose restart postgres

# Check connection string in .env
echo $DATABASE_URL
```

### "Keys not found"

```bash
# Generate new keys
npx rugi-auth generate-keys

# Verify keys exist
ls -la keys/
```

### "Default app not found"

```bash
# Initialize the default app
npx rugi-auth init-app
```

### "Superadmin already exists"

The create-superadmin command will prompt you to confirm if a superadmin already exists. Answer "yes" to create another.

For non-interactive mode:

```bash
FORCE_CREATE=true \
SUPERADMIN_EMAIL=new-admin@example.com \
SUPERADMIN_PASSWORD=SecurePass123! \
npx rugi-auth create-superadmin
```

### Reset Everything

```bash
# WARNING: This deletes all data!
npx prisma migrate reset
npm run setup
```

---

## 📊 What Gets Created

After setup, your system has:

| Component | Description |
|-----------|-------------|
| **Default App** | "Rugi Dashboard" with known client credentials |
| **Superadmin User** | Full system access with `superadmin` and `owner` roles |
| **RSA Keys** | 2048-bit key pair for JWT signing |
| **Database** | PostgreSQL with all auth tables |

---

## 🎉 Next Steps

1. **Register Your Apps** — Create client credentials for each of your applications
2. **Set Up Roles** — Define app-specific roles for authorization
3. **Integrate** — Use the [Integration Guide](./INTEGRATION.md) to connect your apps
4. **Deploy** — Follow the production deployment steps above

---

<div align="center">

**Need help?** [Open an Issue](https://github.com/EDMONDGIHOZO/rugi-auth/issues) · [Discussions](https://github.com/EDMONDGIHOZO/rugi-auth/discussions)

</div>

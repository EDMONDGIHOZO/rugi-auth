# Initial Setup Guide

Quick guide to set up your authentication system for the first time.

## 🚀 First Time Setup

### Step 1: Reset Default App

Creates or resets the default "Rugi Dashboard" app with consistent credentials.

```bash
npm run dev:reset-app
```

**Output:**
```
✅ Credentials reset successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 App Name:      Rugi Dashboard
🆔 Client ID:     rugi-dashboard-dev
🔑 Client Secret: [64-character secret]
📋 Type:          CONFIDENTIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Save the client_id and client_secret** - you'll need them for API requests.

---

### Step 2: Create First Superadmin

Creates the first superadmin user with full system access.

#### Interactive Mode (Terminal prompts):

```bash
npm run dev:create-superadmin
```

**You'll be prompted for:**
- Email address
- Password (min 8 characters)
- Password confirmation

#### Non-Interactive Mode (CI/CD or scripts):

```bash
SUPERADMIN_EMAIL=admin@example.com \
SUPERADMIN_PASSWORD=SecurePassword123! \
npm run dev:create-superadmin
```

**Output:**
```
🎉 Superadmin created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    admin@example.com
🆔 User ID:  [user-uuid]
📱 App:      Rugi Dashboard
👑 Roles:    superadmin, owner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 What Happens

### Default App Creation

- **App Name:** `Rugi Dashboard`
- **Client ID:** `rugi-dashboard-dev` (consistent)
- **Type:** `CONFIDENTIAL`
- **Redirect URIs:**
  - `http://localhost:3000/callback`
  - `http://localhost:3001/callback`
  - `http://localhost:5173/callback`

### Superadmin User Creation

The first superadmin user gets:

1. ✅ **Email verified** automatically
2. ✅ **Opted into** the default app
3. ✅ **Two roles:**
   - `superadmin` - For system-wide management
   - `owner` - For app ownership

**Roles created if not exist:**
- `superadmin` role for the default app
- `owner` role for the default app

---

## 🔐 First Login

After setup, test your login:

```bash
curl -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "your-password",
    "client_id": "rugi-dashboard-dev",
    "client_secret": "your-64-char-secret"
  }'
```

**Response:**
```json
{
  "access_token": "jwt-token...",
  "refresh_token": "uuid...",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

---

## 🔄 Creating Additional Superadmins

If you already have a superadmin and want to create another:

### Interactive Mode:
```bash
npm run dev:create-superadmin
# Will prompt: "Do you want to create another superadmin? (yes/no)"
```

### Non-Interactive Mode:
```bash
FORCE_CREATE=true \
SUPERADMIN_EMAIL=admin2@example.com \
SUPERADMIN_PASSWORD=Password123! \
npm run dev:create-superadmin
```

---

## ⚙️ Quick Setup Script

Create a setup script for your team:

```bash
#!/bin/bash
# setup.sh

echo "🚀 Setting up Rugi Auth..."

# Step 1: Reset app
echo "Step 1: Creating default app..."
npm run dev:reset-app

# Step 2: Create superadmin
echo "Step 2: Creating superadmin..."
SUPERADMIN_EMAIL=${ADMIN_EMAIL:-admin@rugi.app} \
SUPERADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin123!} \
npm run dev:create-superadmin

echo "✅ Setup complete!"
```

**Usage:**
```bash
chmod +x setup.sh
./setup.sh
```

Or with custom credentials:
```bash
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=MyPassword! ./setup.sh
```

---

## 🧪 Testing Superadmin Access

### 1. Login
```bash
curl -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@rugi.app",
    "password": "Admin123!",
    "client_id": "rugi-dashboard-dev",
    "client_secret": "your-secret"
  }'
```

### 2. Test Superadmin Endpoints

```bash
# List all users
curl http://localhost:3000/users \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# List all apps
curl http://localhost:3000/apps \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# Manage auth settings (superadmin only)
curl http://localhost:3000/auth-settings \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

---

## 📋 Checklist

- [ ] Run `npm run dev:reset-app`
- [ ] Save client_id and client_secret
- [ ] Run `npm run dev:create-superadmin`
- [ ] Test login with superadmin credentials
- [ ] Verify superadmin has access to protected endpoints

---

## ⚠️ Important Notes

### Security
- **Superadmin** has full system access - protect these credentials!
- Change default passwords in production
- Use strong passwords (min 8 chars, mix of upper/lower/numbers/symbols)

### Roles Created
- `superadmin` - System-wide management
- `owner` - App ownership and management

Both roles grant access to superadmin-only endpoints.

### Environment
- These commands are for **development** only
- In production, create superadmins through a secure process
- Never commit credentials to git

---

## 🆘 Troubleshooting

### "Default app not found"
```bash
# Run this first:
npm run dev:reset-app
```

### "User with this email already exists"
```bash
# Use a different email or delete the existing user
```

### "Superadmin already exists"
**Interactive:** Answer "yes" to create another
**Non-interactive:** Add `FORCE_CREATE=true`

### Want to start fresh?
```bash
# Reset everything (WARNING: deletes all data)
npx prisma migrate reset
npm run dev:reset-app
npm run dev:create-superadmin
```

---

## 🎉 You're Ready!

Your system now has:
- ✅ Default app with known credentials
- ✅ Superadmin user with full access
- ✅ Superadmin and owner roles
- ✅ Ready for dashboard development

Start building! 🚀


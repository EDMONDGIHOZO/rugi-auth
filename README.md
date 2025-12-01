# YebaLabs Authentication Service

A production-grade, centralized authentication service that enables multiple applications to share a single user base while maintaining separate role-based access control per application.

## Features

- **Centralized Authentication**: Single user account across all applications
- **Multi-App Role Management**: Different roles per user per application
- **JWT with RS256**: Asymmetric key signing for secure token verification
- **Token Rotation**: Refresh tokens are rotated on each use for enhanced security
- **Argon2id Password Hashing**: Industry-standard password security
- **Comprehensive Audit Logging**: Track all authentication events
- **Rate Limiting**: Protection against brute force attacks
- **Production-Ready**: Security headers, CORS, input validation, error handling

## Architecture

### Database Schema

- **users**: User accounts with email, password hash, MFA support
- **apps**: Client applications (PUBLIC or CONFIDENTIAL)
- **roles**: Reusable role definitions
- **user_app_roles**: Many-to-many relationship between users, apps, and roles
- **refresh_tokens**: Server-side refresh token storage with rotation
- **auth_audit**: Comprehensive audit trail of all auth events

### Security Features

- RS256 JWT signing (asymmetric keys)
- Argon2id password hashing (memory: 64MB, time: 3, parallelism: 4)
- Refresh token rotation (prevents replay attacks)
- Rate limiting on authentication endpoints
- Helmet.js security headers
- CORS configuration
- Input validation with Joi
- SQL injection prevention (Prisma parameterized queries)

## Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 15+
- npm or yarn

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd yebalabs-auth
npm install
```

### 2. Set Up Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database connection for the application
DATABASE_URL="postgresql://user:password@localhost:5432/yebalabs_auth?schema=public"

# PostgreSQL container configuration (required for docker-compose)
POSTGRES_USER=yebalabs
POSTGRES_PASSWORD=yebalabs_password
POSTGRES_DB=yebalabs_auth

# Application configuration
JWT_ISSUER="yebalabs-auth"
PORT=3000
```

**Note**: If using Docker Compose, you must set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in your `.env` file. The `DATABASE_URL` should match these values (or point to your own PostgreSQL instance).

### 3. Start PostgreSQL

Using Docker Compose:

```bash
docker-compose up -d postgres
```

The Docker Compose file will read `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` from your `.env` file to configure the PostgreSQL container.

Or use your own PostgreSQL instance and update `DATABASE_URL` in `.env` accordingly.

### 4. Generate RSA Keys

```bash
npm run generate:keys
```

This creates `keys/private.pem` and `keys/public.pem` (gitignored).

### 5. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (creates default roles and example apps)
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

### Public Endpoints

#### POST /register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /login
Login and receive access + refresh tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "client_id": "ecommerce-app-id",
  "client_secret": "ecommerce-secret-123" // Required for CONFIDENTIAL apps
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "uuid-opaque-token",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

#### POST /refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "uuid-opaque-token",
  "client_id": "ecommerce-app-id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "new-uuid-opaque-token", // Rotated
  "token_type": "Bearer",
  "expires_in": 604800
}
```

#### POST /revoke
Revoke a refresh token.

**Request:**
```json
{
  "refresh_token": "uuid-opaque-token"
}
```

#### GET /.well-known/jwks.json
Get public key in JWKS format for token verification.

**Response:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "1",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

#### GET /me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "isEmailVerified": false,
  "mfaEnabled": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Admin Endpoints

All admin endpoints require authentication via `Authorization: Bearer <access_token>` header.

#### POST /apps
Register a new client application.

**Request:**
```json
{
  "name": "My App",
  "type": "CONFIDENTIAL", // or "PUBLIC"
  "redirect_uris": ["https://myapp.com/callback"]
}
```

**Response:**
```json
{
  "message": "Application created successfully",
  "app": {
    "id": "uuid",
    "name": "My App",
    "client_id": "uuid",
    "client_secret": "uuid-uuid", // Only shown once!
    "type": "CONFIDENTIAL",
    "redirect_uris": ["https://myapp.com/callback"],
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /apps/:appId/roles
Create or verify a role for an app.

**Request:**
```json
{
  "role_name": "moderator"
}
```

#### POST /users/:userId/roles
Assign a role to a user for a specific app.

**Request:**
```json
{
  "app_id": "uuid",
  "role_name": "owner"
}
```

#### GET /audit
List audit logs with filtering and pagination.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `action` (optional): Filter by action (LOGIN, REFRESH, REVOKE, ROLE_ASSIGN, REGISTER)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter

## JWT Token Structure

Access tokens contain the following claims:

- `sub`: User ID
- `aud`: Client ID (application identifier)
- `tid`: App ID (application UUID)
- `roles`: Array of role names for this user in this app
- `iss`: Issuer (from `JWT_ISSUER` env var)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

**Example:**
```json
{
  "sub": "user-uuid",
  "aud": "ecommerce-app-id",
  "tid": "app-uuid",
  "roles": ["owner", "admin"],
  "iss": "yebalabs-auth",
  "iat": 1704067200,
  "exp": 1704070800
}
```

## Integration Guide

### Verifying Tokens in External Applications

1. **Fetch Public Key**: GET `https://auth-service.com/.well-known/jwks.json`

2. **Verify Token**: Use a JWT library with RS256 support:

```javascript
// Node.js example
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://auth-service.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

jwt.verify(token, getKey, {
  audience: 'your-client-id',
  issuer: 'yebalabs-auth',
  algorithms: ['RS256']
}, (err, decoded) => {
  if (err) {
    // Token invalid
  } else {
    // Token valid
    // decoded.roles contains user roles for this app
    // decoded.sub contains user ID
  }
});
```

3. **Check Roles**: Verify the user has required roles in `decoded.roles` array.

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm run start`: Start production server
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Open Prisma Studio (database GUI)
- `npm run prisma:seed`: Seed database with default data
- `npm run generate:keys`: Generate RSA key pair
- `npm run type-check`: Type check without building

### Project Structure

```
src/
├── config/          # Configuration (env, database, keys)
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── utils/           # Utilities (logger, errors, validators)
└── app.ts          # Express app setup
```

### Database Migrations

Create a new migration:

```bash
npm run prisma:migrate -- --name migration_name
```

## Security Considerations

1. **Private Keys**: Never commit `keys/private.pem` to version control
2. **Environment Variables**: Keep `.env` secure and use different values in production
3. **Client Secrets**: Store securely and rotate periodically
4. **Rate Limiting**: Adjust limits based on your traffic patterns
5. **CORS**: Configure allowed origins for production
6. **HTTPS**: Always use HTTPS in production
7. **Token Expiry**: Access tokens expire in 10 minutes (configurable)
8. **Refresh Token Rotation**: Old refresh tokens are revoked on use

## Production Deployment

### Prerequisites

- Node.js 18+ installed on production server
- PM2 installed globally: `npm install -g pm2`
- PostgreSQL database (managed or self-hosted)
- RSA keys generated and securely stored

### Deployment Steps

1. **Build the application:**
   ```bash
   npm install --production
   npm run build
   npm run prisma:generate
   ```

2. **Set up environment variables:**
   Create a `.env` file with production values:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
   JWT_ISSUER="yebalabs-auth"
   CORS_ORIGIN="https://yourdomain.com"
   # ... other required variables
   ```

3. **Run database migrations:**
   ```bash
   npm run prisma:migrate deploy
   ```

4. **Start with PM2:**
   ```bash
   npm run start:pm2
   ```

   Or manually:
   ```bash
   pm2 start ecosystem.config.js
   ```

5. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start on reboot
   ```

### PM2 Management Commands

- **Start:** `npm run start:pm2` or `pm2 start ecosystem.config.js`
- **Stop:** `npm run stop:pm2` or `pm2 stop yebalabs-auth`
- **Restart:** `npm run restart:pm2` or `pm2 restart yebalabs-auth`
- **Reload (zero-downtime):** `npm run reload:pm2` or `pm2 reload yebalabs-auth`
- **View logs:** `npm run logs:pm2` or `pm2 logs yebalabs-auth`
- **Monitor:** `npm run monitor:pm2` or `pm2 monit`
- **Delete:** `npm run delete:pm2` or `pm2 delete yebalabs-auth`

### PM2 Configuration

The `ecosystem.config.js` file is configured with:
- **Cluster mode**: Uses all available CPU cores for load balancing
- **Auto-restart**: Automatically restarts on crashes
- **Memory limit**: Restarts if memory exceeds 1GB
- **Logging**: Logs stored in `./logs/` directory
- **Graceful shutdown**: Handles SIGTERM/SIGINT signals

### Additional Production Considerations

1. **Reverse Proxy**: Use nginx or similar to handle HTTPS and route traffic
2. **Monitoring**: Set up PM2 monitoring or integrate with external monitoring services
3. **Log Rotation**: Configure log rotation for PM2 logs
4. **Database**: Use a managed PostgreSQL service or configure connection pooling
5. **RSA Keys**: Store keys securely (environment variables, secret management, or encrypted storage)
6. **Backups**: Set up automated database backups
7. **Health Checks**: Monitor `/health` endpoint
8. **Rate Limiting**: Adjust rate limits based on production traffic
9. **CORS**: Configure allowed origins for your frontend domains
10. **HTTPS**: Always use HTTPS in production (configure at reverse proxy level)

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name auth.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## License

MIT

## Support

For issues and questions, please open an issue on the repository.


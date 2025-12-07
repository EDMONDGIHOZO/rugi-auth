# Rugi Auth

A secure, centralized authentication service with multi-app role management. Built with Express, TypeScript, and Prisma.

## 🚀 Quick Start

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (Running)

### 1. Create New Project
Use the CLI to scaffold a new authentication server. This sets up the project structure, keys, and configuration for you.
```bash
npx rugi-auth init <your-project-name>
```
*Follow the interactive prompts to configure your project.*

### 2. Start Services
Navigate to your new project directory and start the infrastructure (PostgreSQL & Redis).
```bash
cd <your-project-name>
docker-compose up -d
```
*Note: Redis is auto-configured on port 6380 to avoid conflicts.*

### 3. Initialize
Run the setup script to migrate the database, generate keys, and create your superadmin account.
```bash
# Run database migrations
npm run prisma:migrate

# Complete setup (Keys, Default App, Superadmin)
npm run setup
```

### 4. Run Server
```bash
npm run dev
```
The API will be available at `http://localhost:7100`.

---

## 🔑 Key Features

-   **Centralized Auth**: Single user identity across multiple applications.
-   **Security First**:
    -   **RSA Keys**: RS256 JWT signing.
    -   **Argon2id**: Memory-hard password hashing.
    -   **Rate Limiting**: Redis-backed distributed rate limiting.
    -   **Protection**: Patched against timing attacks and IP spoofing.
-   **Role Management**: Granular, app-specific roles.
-   **OTP Support**: Secure email-based one-time passwords.
-   **Audit Logs**: detailed tracking of all security events.

---

## 🔌 API Reference

Full documentation is available at `/docs` (Swagger UI) when the server is running.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login with email/password |
| `POST` | `/refresh` | Refresh access token |
| `POST` | `/revoke` | Revoke refresh token |
| `GET` | `/me` | Get current user profile |
| `GET` | `/.well-known/jwks.json` | Public keys (JWKS) |

---

## 🛠 Project Structure

-   `src/` - Source code
-   `prisma/` - Database schema
-   `keys/` - Generated RSA keys (Do not commit!)
-   `docker/` - Docker configuration

---

## ⚙️ Configuration

Copy `.env.example` to `.env` to customize settings.

**Key Variables:**
-   `DATABASE_URL`: Postgres connection string.
-   `REDIS_HOST` / `REDIS_PORT`: Redis connection (defaults to Docker values).
-   `JWT_ACCESS_TOKEN_EXPIRY`: Duration of access tokens (default: 10m).

---

## 🛡️ deployment

For production:
1.  **Keys**: Ensure `keys/` directory is secure and persistent.
2.  **Redis**: Configure a persistent Redis instance for rate limiting in `.env`.
3.  **Process Manager**: Use PM2 (`npm run start:pm2`) or Docker.

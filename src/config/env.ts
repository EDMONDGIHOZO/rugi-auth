import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().port().default(7100),
  DATABASE_URL: Joi.string().required(),
  JWT_ISSUER: Joi.string().default("rugi-auth"),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default("10m"),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default("7d"),
  PRIVATE_KEY_PATH: Joi.string().default("./keys/private.pem"),
  PUBLIC_KEY_PATH: Joi.string().default("./keys/public.pem"),
  CORS_ORIGIN: Joi.string().required(),
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),
  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace")
    .default("info"),
  // SMTP Email Configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional().default(587),
  SMTP_SECURE: Joi.boolean().optional().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM_EMAIL: Joi.string().email().optional(),
  SMTP_FROM_NAME: Joi.string().optional().default("Rugi Auth"),
  // Frontend URLs for email links
  FRONTEND_URL: Joi.string().uri().default("http://localhost:3000"),
  PASSWORD_RESET_TOKEN_EXPIRY: Joi.string().default("1h"),
  OTP_EXPIRY: Joi.string().default("10m"),
  OTP_LENGTH: Joi.number().integer().min(4).max(8).default(6),
  // Redis Configuration (Auto-configured with Docker on port 6380)
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().port().default(6380),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  // Trust proxy setting for Express (required when behind reverse proxy/load balancer)
  // Set to "1" for single proxy, "true" for all, or specific IP/subnet
  TRUST_PROXY: Joi.string().optional(),
}).unknown();

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const env = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  databaseUrl: value.DATABASE_URL,
  jwt: {
    issuer: value.JWT_ISSUER,
    accessTokenExpiry: value.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: value.JWT_REFRESH_TOKEN_EXPIRY,
  },
  keys: {
    privateKeyPath: value.PRIVATE_KEY_PATH,
    publicKeyPath: value.PUBLIC_KEY_PATH,
  },
  cors: {
    origin: value.CORS_ORIGIN,
  },
  rateLimit: {
    windowMs: value.RATE_LIMIT_WINDOW_MS,
    maxRequests: value.RATE_LIMIT_MAX_REQUESTS,
  },
  logLevel: value.LOG_LEVEL,
  email: {
    smtp: {
      host: value.SMTP_HOST,
      port: value.SMTP_PORT,
      secure: value.SMTP_SECURE,
      user: value.SMTP_USER,
      password: value.SMTP_PASSWORD,
    },
    from: {
      email: value.SMTP_FROM_EMAIL,
      name: value.SMTP_FROM_NAME,
    },
  },
  frontendUrl: value.FRONTEND_URL,
  passwordReset: {
    tokenExpiry: value.PASSWORD_RESET_TOKEN_EXPIRY,
  },
  otp: {
    expiry: value.OTP_EXPIRY,
    length: value.OTP_LENGTH,
  },
    redis: {
        host: value.REDIS_HOST,
        port: value.REDIS_PORT,
        password: value.REDIS_PASSWORD,
    },
} as const;


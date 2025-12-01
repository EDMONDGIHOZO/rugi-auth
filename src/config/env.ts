import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_ISSUER: Joi.string().default('yebalabs-auth'),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default('10m'),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default('7d'),
  PRIVATE_KEY_PATH: Joi.string().default('./keys/private.pem'),
  PUBLIC_KEY_PATH: Joi.string().default('./keys/public.pem'),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(5),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  // Azure Communication Services Email
  AZURE_COMMUNICATION_CONNECTION_STRING: Joi.string().optional(),
  AZURE_COMMUNICATION_SENDER_EMAIL: Joi.string().email().optional(),
  // Frontend URLs for email links
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  PASSWORD_RESET_TOKEN_EXPIRY: Joi.string().default('1h'),
  OTP_EXPIRY: Joi.string().default('10m'),
  OTP_LENGTH: Joi.number().integer().min(4).max(8).default(6),
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
    azureConnectionString: value.AZURE_COMMUNICATION_CONNECTION_STRING,
    senderEmail: value.AZURE_COMMUNICATION_SENDER_EMAIL,
  },
  frontendUrl: value.FRONTEND_URL,
  passwordReset: {
    tokenExpiry: value.PASSWORD_RESET_TOKEN_EXPIRY,
  },
  otp: {
    expiry: value.OTP_EXPIRY,
    length: value.OTP_LENGTH,
  },
} as const;


import app from './app';

// Export the Express app
export { app };

// Export middleware
export * from './middleware/auth.middleware';
export * from './middleware/client.middleware';
export * from './middleware/error.middleware';
export * from './middleware/rateLimit.middleware';
export * from './middleware/role.middleware';
export * from './middleware/superadmin.middleware';
export * from './middleware/validation.middleware';

// Export services
export * from './services/app.service';
export * from './services/auth.service';
export * from './services/auth-settings.service';
export * from './services/email.service';
export * from './services/oauth.service';
export * from './services/otp.service';
export * from './services/password.service';
export * from './services/password-reset.service';
export * from './services/role.service';
export * from './services/token.service';
export * from './services/user.service';

// Export utils
export * from './utils/logger';
export * from "./utils/errors";

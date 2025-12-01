import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */
export const authValidators = {
  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).required().max(128),
    client_id: Joi.string().required(),
    client_secret: Joi.string().when('$requireSecret', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    client_id: Joi.string().required(),
    client_secret: Joi.string().when('$requireSecret', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    device_info: Joi.object().optional(),
  }),

  refresh: Joi.object({
    refresh_token: Joi.string().required(),
    client_id: Joi.string().required(),
  }),

  revoke: Joi.object({
    refresh_token: Joi.string().required(),
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string().email().required().max(255),
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .pattern(/^\d+$/)
      .length(6)
      .required(),
    new_password: Joi.string().min(8).required().max(128),
  }),

  requestOTP: Joi.object({
    email: Joi.string().email().required().max(255),
    client_id: Joi.string().required(),
    client_secret: Joi.string().when('$requireSecret', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),

  verifyOTP: Joi.object({
    email: Joi.string().email().required().max(255),
    code: Joi.string()
      .pattern(/^\d+$/)
      .length(6)
      .required(),
    client_id: Joi.string().required(),
    client_secret: Joi.string().when('$requireSecret', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    device_info: Joi.object().optional(),
  }),
};

/**
 * Validation schemas for app management endpoints
 */
export const appValidators = {
  createApp: Joi.object({
    name: Joi.string().required().max(255),
    type: Joi.string().valid('PUBLIC', 'CONFIDENTIAL').required(),
    redirect_uris: Joi.array().items(Joi.string().uri()).min(1).required(),
  }),

  updateApp: Joi.object({
    name: Joi.string().max(255).optional(),
    type: Joi.string().valid('PUBLIC', 'CONFIDENTIAL').optional(),
    redirect_uris: Joi.array().items(Joi.string().uri()).min(1).optional(),
  }).min(1),

  assignRole: Joi.object({
    role_name: Joi.string().required().max(100),
  }),

  list: Joi.object({
    search: Joi.string().max(255).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validation schemas for user role assignment
 */
export const userValidators = {
  assignRole: Joi.object({
    app_id: Joi.string().uuid().required(),
    role_name: Joi.string().required().max(100),
  }),

  list: Joi.object({
    search: Joi.string().max(255).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  invite: Joi.object({
    email: Joi.string().email().required().max(255),
    app_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),

  update: Joi.object({
    email: Joi.string().email().max(255).optional(),
    password: Joi.string().min(8).max(128).optional(),
    isEmailVerified: Joi.boolean().optional(),
    mfaEnabled: Joi.boolean().optional(),
    app_id: Joi.string().uuid().optional(),
  }).min(1),
};

/**
 * Validation schemas for role endpoints
 */
export const roleValidators = {
  list: Joi.object({
    search: Joi.string().max(255).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(100),
  }),
};

/**
 * Validation schemas for audit endpoints
 */
export const auditValidators = {
  list: Joi.object({
    user_id: Joi.string().uuid().optional(),
    action: Joi.string()
      .valid(
        'LOGIN',
        'REFRESH',
        'REVOKE',
        'ROLE_ASSIGN',
        'REGISTER',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_COMPLETE',
        'OTP_REQUEST',
        'OTP_LOGIN'
      )
      .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
  }),
};

/**
 * Validation schemas for UUID parameters
 */
export const paramValidators = {
  uuid: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  appId: Joi.object({
    appId: Joi.string().uuid().required(),
  }),

  userId: Joi.object({
    userId: Joi.string().uuid().required(),
  }),

  authMethod: Joi.object({
    appId: Joi.string().uuid().required(),
    method: Joi.string()
      .valid('email_password', 'email_otp', 'google', 'github', 'microsoft', 'facebook')
      .required(),
  }),
};

/**
 * Validation schemas for auth settings endpoints
 */
export const authSettingsValidators = {
  create: Joi.object({
    email_password_enabled: Joi.boolean().optional(),
    email_otp_enabled: Joi.boolean().optional(),
    google_auth_enabled: Joi.boolean().optional(),
    google_client_id: Joi.string().max(255).optional().allow(null, ''),
    google_client_secret: Joi.string().optional().allow(null, ''),
    github_auth_enabled: Joi.boolean().optional(),
    github_client_id: Joi.string().max(255).optional().allow(null, ''),
    github_client_secret: Joi.string().optional().allow(null, ''),
    microsoft_auth_enabled: Joi.boolean().optional(),
    microsoft_client_id: Joi.string().max(255).optional().allow(null, ''),
    microsoft_client_secret: Joi.string().optional().allow(null, ''),
    facebook_auth_enabled: Joi.boolean().optional(),
    facebook_client_id: Joi.string().max(255).optional().allow(null, ''),
    facebook_client_secret: Joi.string().optional().allow(null, ''),
    require_email_verification: Joi.boolean().optional(),
    allow_registration: Joi.boolean().optional(),
  }),

  update: Joi.object({
    email_password_enabled: Joi.boolean().optional(),
    email_otp_enabled: Joi.boolean().optional(),
    google_auth_enabled: Joi.boolean().optional(),
    google_client_id: Joi.string().max(255).optional().allow(null, ''),
    google_client_secret: Joi.string().optional().allow(null, ''),
    github_auth_enabled: Joi.boolean().optional(),
    github_client_id: Joi.string().max(255).optional().allow(null, ''),
    github_client_secret: Joi.string().optional().allow(null, ''),
    microsoft_auth_enabled: Joi.boolean().optional(),
    microsoft_client_id: Joi.string().max(255).optional().allow(null, ''),
    microsoft_client_secret: Joi.string().optional().allow(null, ''),
    facebook_auth_enabled: Joi.boolean().optional(),
    facebook_client_id: Joi.string().max(255).optional().allow(null, ''),
    facebook_client_secret: Joi.string().optional().allow(null, ''),
    require_email_verification: Joi.boolean().optional(),
    allow_registration: Joi.boolean().optional(),
  }).min(1),

  list: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validation schemas for OAuth endpoints
 */
export const oauthValidators = {
  getProviders: Joi.object({
    client_id: Joi.string().required(),
  }),

  initiateOAuth: Joi.object({
    client_id: Joi.string().required(),
    redirect_uri: Joi.string().uri().required(),
    state: Joi.string().optional(),
  }),

  oauthCallback: Joi.object({
    code: Joi.string().required(),
    client_id: Joi.string().required(),
    client_secret: Joi.string().when('$requireSecret', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    redirect_uri: Joi.string().uri().required(),
    device_info: Joi.object().optional(),
  }),
};


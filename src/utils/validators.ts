import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */
export const authValidators = {
  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).required().max(128),
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

  assignRole: Joi.object({
    role_name: Joi.string().required().max(100),
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
};

/**
 * Validation schemas for audit endpoints
 */
export const auditValidators = {
  list: Joi.object({
    user_id: Joi.string().uuid().optional(),
    action: Joi.string()
      .valid('LOGIN', 'REFRESH', 'REVOKE', 'ROLE_ASSIGN', 'REGISTER')
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
};


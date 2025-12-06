import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Middleware to validate request body using Joi schema
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Validation failed', details);
    }

    req.body = value;
    next();
  };
}

/**
 * Middleware to validate request parameters using Joi schema
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Invalid parameters', details);
    }

    req.params = value;
    next();
  };
}

/**
 * Middleware to validate query parameters using Joi schema
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: false, // Don't strip unknown to avoid mutating read-only req.query
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Invalid query parameters', details);
    }

    // Note: req.query is read-only in Express, so we can't reassign it
    // The validation ensures the query params are valid, which is sufficient
    // Controllers can continue using req.query directly
    next();
  };
}


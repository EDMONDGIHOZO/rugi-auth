import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      statusCode: error instanceof AppError ? error.statusCode : 500,
    },
    'Request error'
  );

  // Handle known application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error instanceof Error && 'details' in error
        ? { details: (error as any).details }
        : {}),
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }

  // Handle validation errors (Joi)
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: (error as any).details,
    });
  }

  // Handle unknown errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
}


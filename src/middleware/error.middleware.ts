import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Global error handling middleware
 */
export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
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
    "Request error"
  );

  // Handle known application errors
  if (error instanceof AppError) {
    const response: any = {
      error: error.message,
    };

    // Add details for ValidationError
    if (error instanceof ValidationError && error.details) {
      response.errors = error.details;
    } else if ("details" in error && (error as any).details) {
      response.errors = (error as any).details;
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle JWT errors
  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }

  // Handle validation errors (Joi - direct)
  if (error.name === "ValidationError" && (error as any).isJoi) {
    const joiError = error as any;
    const errors =
      joiError.details?.map((detail: any) => ({
        field: detail.path.join("."),
        message: detail.message,
      })) || [];

    return res.status(400).json({
      error: "Validation failed",
      errors,
    });
  }

  // Handle unknown errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;

  return res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
}

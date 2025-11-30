import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP address for rate limiting
  keyGenerator: (req) => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },
});


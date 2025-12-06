import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  // More lenient in development
  max: env.nodeEnv === 'development' 
    ? Math.max(env.rateLimit.maxRequests * 2, 200) 
    : env.rateLimit.maxRequests,
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: () => env.nodeEnv === 'test',
  // Use IP address for rate limiting
  keyGenerator: (req) => {
    // Try to get IP from various sources
    const forwarded = req.headers['x-forwarded-for'];
    const ip = 
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      (req as any).connection?.remoteAddress ||
      'unknown';
    return ip;
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


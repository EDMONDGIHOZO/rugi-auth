import rateLimit, { Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Singleton Redis client instance for rate limiting
 * Reused across all rate limiters to avoid connection overhead
 */
let redisClient: Redis | null = null;
let redisStore: Store | undefined = undefined;

/**
 * Initialize Redis connection for rate limiting
 * Falls back to memory store if Redis is unavailable
 */
function initializeRedisStore(): Store | undefined {
    if (!env.redis.host) {
        return undefined;
    }

    // Return existing store if already initialized
    if (redisStore) {
        return redisStore;
    }

    try {
        // Create singleton Redis client
        redisClient = new Redis({
            host: env.redis.host,
            port: env.redis.port,
            password: env.redis.password || undefined, // Convert empty string to undefined
            retryStrategy: (times) => {
                // Exponential backoff with max delay of 3 seconds
                const delay = Math.min(times * 50, 3000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false, // Connect immediately to catch errors early
        } as RedisOptions);

        // Handle Redis connection errors - fallback to memory store
        redisClient.on('error', (error) => {
            logger.warn({ error, host: env.redis.host, port: env.redis.port }, 
                'Redis connection error, rate limiting will use memory store');
            // Don't throw - let express-rate-limit fall back to memory store
        });

        redisClient.on('connect', () => {
            logger.info({ host: env.redis.host, port: env.redis.port }, 
                'Redis connected for rate limiting');
        });

        // Create Redis store
        redisStore = new RedisStore({
            sendCommand: async (...args: string[]) => {
                if (!redisClient) {
                    throw new Error('Redis client not initialized');
                }
                try {
                    const result = await redisClient.call(args[0], ...args.slice(1));
                    return result as any; // Cast to any to satisfy the complex RedisReply type union
                } catch (error) {
                    // If Redis fails, throw to let express-rate-limit handle fallback
                    logger.warn({ error }, 'Redis command failed, rate limiter may fall back to memory');
                    throw error;
                }
            },
        });

        return redisStore;
    } catch (error) {
        logger.error({ error }, 'Failed to initialize Redis store, using memory store');
        return undefined;
    }
}

/**
 * Get rate limit store (Redis if available, otherwise memory)
 */
const store = initializeRedisStore();

/**
 * Gracefully close Redis connection on shutdown
 */
export function closeRedisConnection(): Promise<void> {
    if (redisClient) {
        return redisClient.quit()
            .then(() => undefined)
            .catch((error) => {
                logger.warn({ error }, 'Error closing Redis connection');
                return undefined;
            });
    }
    return Promise.resolve();
}

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
    store, // Use Redis store if configured, otherwise MemoryStore
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
      // Rely on Express's req.ip which respects 'trust proxy' setting
      // This is safer than manually parsing headers which might be spoofed
      return req.ip || 'unknown';
  },
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const strictRateLimiter = rateLimit({
    store, // Use Redis store if configured, otherwise MemoryStore
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
      return req.ip || 'unknown';
  },
});


import rateLimit, { Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Singleton Redis client instance for rate limiting.
 * Each rate limiter gets its own RedisStore (with unique prefix) to satisfy
 * express-rate-limit's requirement that stores are not shared.
 */
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection for rate limiting.
 * Falls back to memory store if Redis is unavailable.
 */
function getRedisClient(): Redis | null {
  if (!env.redis.host) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
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
    redisClient.on("error", (error) => {
      logger.warn(
        { error, host: env.redis.host, port: env.redis.port },
        "Redis connection error, rate limiting will use memory store"
      );
      // Don't throw - let express-rate-limit fall back to memory store
    });

    redisClient.on("connect", () => {
      logger.info(
        { host: env.redis.host, port: env.redis.port },
        "Redis connected for rate limiting"
      );
    });

    return redisClient;
  } catch (error) {
    logger.error(
      { error },
      "Failed to initialize Redis client, using memory store"
    );
    return null;
  }
}

/**
 * Create a Redis store with a unique prefix for each limiter.
 * Returns undefined to allow express-rate-limit to fall back to MemoryStore.
 */
function createRedisStore(prefix: string): Store | undefined {
  const client = getRedisClient();
  if (!client) {
    return undefined;
  }

  try {
    return new RedisStore({
      prefix: `rate-limit:${prefix}:`,
      sendCommand: async (...args: string[]) => {
        if (!redisClient) {
          throw new Error("Redis client not initialized");
        }
        try {
          const result = await redisClient.call(args[0], ...args.slice(1));
          return result as any; // Cast to any to satisfy the complex RedisReply type union
        } catch (error) {
          // If Redis fails, throw to let express-rate-limit handle fallback
          logger.warn(
            { error },
            "Redis command failed, rate limiter may fall back to memory"
          );
          throw error;
        }
      },
    });
  } catch (error) {
    logger.warn(
      { error },
      "Failed to create Redis rate limit store, using memory store"
    );
    return undefined;
  }
}

// Each limiter gets its own store (unique prefix) to comply with express-rate-limit
const authStore = createRedisStore('auth');
const strictStore = createRedisStore('strict');

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
  store: authStore, // Use Redis store if configured, otherwise MemoryStore
  windowMs: env.rateLimit.windowMs,
  // More lenient in development
  max:
    env.nodeEnv === "development"
      ? Math.max(env.rateLimit.maxRequests * 2, 200)
      : env.rateLimit.maxRequests,
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: () => env.nodeEnv === "test",
  // Use IP address for rate limiting
  keyGenerator: (req) => {
    // Rely on Express's req.ip which respects 'trust proxy' setting
    // This is safer than manually parsing headers which might be spoofed
    return req.ip || "unknown";
  },
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const strictRateLimiter = rateLimit({
  store: strictStore, // Use Redis store if configured, otherwise MemoryStore
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || "unknown";
  },
});


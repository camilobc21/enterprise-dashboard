import { createClient, RedisClientType } from 'redis';
import { logger } from './logging';

let redisClient: RedisClientType | null = null;
let cacheEnabled = false;

/**
 * Initialize Redis cache
 */
export async function initializeCache() {
  try {
    // Check if Redis URL is provided
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('REDIS_URL not configured - caching disabled');
      cacheEnabled = false;
      return;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
    cacheEnabled = true;
    logger.info('Cache initialized successfully');
  } catch (error) {
    logger.warn('Failed to initialize Redis cache', {
      error: error instanceof Error ? error.message : String(error)
    });
    cacheEnabled = false;
  }
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!cacheEnabled || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    }
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Cache get error', {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<boolean> {
  if (!cacheEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl: ttlSeconds });
    return true;
  } catch (error) {
    logger.error('Cache set error', {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!cacheEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (error) {
    logger.error('Cache delete error', {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<boolean> {
  if (!cacheEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushDb();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Get or set cache - execute function if cache miss
 */
export async function getOrSetCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Try to get from cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fn();
  
  // Store in cache
  await setCache(key, result, ttlSeconds);
  
  return result;
}

/**
 * Cache key builder
 */
export const cacheKeys = {
  wifiScan: (userId: number, scanId: number) => `wifi:scan:${userId}:${scanId}`,
  wifiScans: (userId: number) => `wifi:scans:${userId}`,
  wifiAnalysis: (userId: number) => `wifi:analysis:${userId}`,
  userProfile: (userId: number) => `user:profile:${userId}`,
  systemHealth: () => 'system:health'
};

/**
 * Get cache status
 */
export function getCacheStatus() {
  return {
    enabled: cacheEnabled,
    connected: redisClient?.isOpen || false,
    url: process.env.REDIS_URL ? '***' : 'not configured'
  };
}

/**
 * Close cache connection
 */
export async function closeCache() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Cache connection closed');
  }
}

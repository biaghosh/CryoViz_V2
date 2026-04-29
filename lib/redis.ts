// lib/redis.ts
import { Redis } from 'ioredis';

declare global {
  var _redisClientPromise: Redis | undefined;
}

let redis: Redis | undefined;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  connectTimeout: 5000,
  retryStrategy(times: number) {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  }
};

try {
  if (process.env.NODE_ENV === 'production') {
    redis = new Redis(redisUrl, redisOptions);
  } else {
    if (!globalThis._redisClientPromise) {
      globalThis._redisClientPromise = new Redis(redisUrl, redisOptions);
    }
    redis = globalThis._redisClientPromise;
  }

  redis?.on('error', (err) => {
    console.warn('[Redis] Connection warning:', err.message);
  });
} catch (e) {
  console.error('[Redis] Initialization failed, proceeding without cache:', e);
}

export async function getOrSetCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 3600): Promise<T> {
  if (!redis) return await fetcher();

  try {
    const cachedData = await redis.get(key);
    if (cachedData) return JSON.parse(cachedData) as T;
  } catch (err) {
    console.error(`[Redis] Error reading cache key ${key}:`, err);
  }

  const data = await fetcher();

  try {
    if (data !== undefined && data !== null) {
      // FIX: Handle BigInt and non-serializable types
      const safeData = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
      await redis.set(key, safeData, 'EX', ttl);
    }
  } catch (err) {
    console.error(`[Redis] Error setting cache key ${key}:`, err);
  }

  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Redis] Error invalidating cache key ${key}:`, err);
  }
}

export default redis;
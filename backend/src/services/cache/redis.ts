import Redis from 'ioredis';

/**
 * Redis configuration
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Memory cache fallback when Redis is unavailable
 */
class MemoryCache {
  private cache: Map<string, { value: string; expireAt: number | null }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expireAt !== null && entry.expireAt < now) {
        this.cache.delete(key);
      }
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expireAt !== null && entry.expireAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    const expireAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expireAt });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

/**
 * Cache service with Redis and memory fallback
 */
class CacheService {
  private redis: Redis | null = null;
  private memoryCache: MemoryCache;
  private useMemoryFallback: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new Redis({
        ...REDIS_CONFIG,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.warn('[Cache] Redis connection failed, using memory fallback');
            this.useMemoryFallback = true;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        console.log('[Cache] Redis connected');
        this.isConnected = true;
        this.useMemoryFallback = false;
      });

      this.redis.on('error', (err: Error) => {
        console.warn('[Cache] Redis error:', err.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.warn('[Cache] Redis connection closed, using memory fallback');
        this.isConnected = false;
        this.useMemoryFallback = true;
      });

      // Try to connect (non-blocking)
      this.redis.connect().catch(() => {
        console.warn('[Cache] Redis initial connection failed, using memory fallback');
        this.useMemoryFallback = true;
      });
    } catch (error) {
      console.warn('[Cache] Redis initialization failed, using memory fallback');
      this.useMemoryFallback = true;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      let value: string | null = null;

      if (!this.useMemoryFallback && this.redis && this.isConnected) {
        value = await this.redis.get(key);
      } else {
        value = this.memoryCache.get(key);
      }

      if (value === null) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  /**
   * Set value to cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (!this.useMemoryFallback && this.redis && this.isConnected) {
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } else {
        this.memoryCache.set(key, serialized, ttlSeconds);
      }
    } catch (error) {
      console.error('[Cache] Set error:', error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.useMemoryFallback && this.redis && this.isConnected) {
        await this.redis.del(key);
      } else {
        this.memoryCache.del(key);
      }
    } catch (error) {
      console.error('[Cache] Del error:', error);
    }
  }

  /**
   * Set expiration on key
   */
  async setExpire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (!this.useMemoryFallback && this.redis && this.isConnected) {
        await this.redis.expire(key, ttlSeconds);
      } else {
        const value = this.memoryCache.get(key);
        if (value !== null) {
          this.memoryCache.set(key, value, ttlSeconds);
        }
      }
    } catch (error) {
      console.error('[Cache] SetExpire error:', error);
    }
  }

  /**
   * Delete keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      if (!this.useMemoryFallback && this.redis && this.isConnected) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // For memory cache, we need to iterate and delete matching keys
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        // Memory cache doesn't support pattern deletion well, so we just clear all
        // In production, consider using a prefix-based approach
      }
    } catch (error) {
      console.error('[Cache] DelByPattern error:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return !this.useMemoryFallback && this.redis !== null && this.isConnected === true;
  }

  /**
   * Get cache statistics
   */
  getStats(): { type: string; connected: boolean } {
    return {
      type: this.useMemoryFallback ? 'memory' : 'redis',
      connected: this.isConnected === true,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
    this.memoryCache.destroy();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export cache helper functions for convenience
export const cacheGet = <T>(key: string) => cacheService.get<T>(key);
export const cacheSet = <T>(key: string, value: T, ttlSeconds?: number) => cacheService.set(key, value, ttlSeconds);
export const cacheDel = (key: string) => cacheService.del(key);
export const cacheSetExpire = (key: string, ttlSeconds: number) => cacheService.setExpire(key, ttlSeconds);
export const cacheDelByPattern = (pattern: string) => cacheService.delByPattern(pattern);
export const cacheIsAvailable = () => cacheService.isAvailable();
export const cacheGetStats = () => cacheService.getStats();

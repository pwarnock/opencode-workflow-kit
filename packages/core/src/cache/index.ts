import { Cache, CacheEntry, CacheError } from '../types/index.js';
import chalk from 'chalk';

/**
 * In-memory cache implementation with TTL support
 */
export class MemoryCache implements Cache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private defaultTTL: number = 300000) { // 5 minutes default
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      key,
      value,
      expires,
      created: Date.now()
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    return Date.now() <= entry.expires;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(chalk.gray(`🧹 Cache cleanup: removed ${cleaned} expired entries`));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired
    };
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}
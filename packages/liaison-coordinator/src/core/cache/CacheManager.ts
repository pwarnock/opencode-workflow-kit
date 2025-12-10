/**
 * Cache Manager
 * Comprehensive caching system with multiple backends and strategies
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

// Cache entry with metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
}

// Cache configuration
interface CacheConfig {
  backend: 'memory' | 'disk' | 'hybrid';
  maxMemoryEntries: number;
  maxDiskSize: number; // in MB
  diskLocation: string;
  defaultTtl: number; // in milliseconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  memorySize: number;
  diskSize: number;
}

// Cache backend interface
interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

// Memory backend implementation
class MemoryBackend implements CacheBackend {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      // Move to end (LRU)
      this.updateAccessOrder(key);
      
      return entry.data;
    }
    
    // Clean up expired entry
    if (entry) {
      this.cache.delete(key);
      this.removeAccessOrder(key);
    }
    
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || 3600000, // 1 hour default
      accessCount: 1,
      lastAccessed: Date.now()
    };

    // Evict if over capacity
    if (this.cache.size >= this.maxSize) {
      await this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.removeAccessOrder(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private updateAccessOrder(key: string): void {
    this.removeAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      await this.delete(lruKey);
    }
  }
}

// Disk backend implementation
class DiskBackend implements CacheBackend {
  private cacheDir: string;
  private maxSize: number; // in bytes

  constructor(config: CacheConfig) {
    this.cacheDir = config.diskLocation;
    this.maxSize = config.maxDiskSize * 1024 * 1024; // MB to bytes
    this.ensureCacheDirectory();
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  private getCachePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.cache`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      if (Date.now() - entry.timestamp < entry.ttl) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        // Update access metadata
        await fs.writeFile(cachePath, JSON.stringify(entry));
        
        return entry.data;
      } else {
        // Delete expired entry
        await fs.unlink(cachePath);
        return null;
      }
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.ensureCacheDirectory();

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || 3600000, // 1 hour default
      accessCount: 1,
      lastAccessed: Date.now()
    };

    const cachePath = this.getCachePath(key);
    const content = JSON.stringify(entry);

    // Check if eviction needed
    await this.checkDiskSize();

    await fs.writeFile(cachePath, content, 'utf-8');
  }

  async delete(key: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(key);
      await fs.unlink(cachePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files
          .filter(file => file.endsWith('.cache'))
          .map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
    } catch {
      // Directory doesn't exist, ignore
    }
  }

  async keys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.cacheDir);
      return files
        .filter(file => file.endsWith('.cache'))
        .map(file => file.replace('.cache', ''));
    } catch {
      return [];
    }
  }

  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }

  private async checkDiskSize(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      // Evict oldest files if over limit
      if (totalSize > this.maxSize) {
        await this.evictOldest(totalSize - this.maxSize);
      }
    } catch {
      // Directory doesn't exist, ignore
    }
  }

  private async evictOldest(toEvict: number): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files
        .filter(file => file.endsWith('.cache'))
        .map(file => ({
          file,
          path: path.join(this.cacheDir, file)
        }));

      // Sort by modification time (oldest first)
      cacheFiles.sort((a, b) => a.path.localeCompare(b.path));

      let evicted = 0;
      for (const { path: filePath } of cacheFiles) {
        if (evicted >= toEvict) break;
        
        try {
          const stats = await fs.stat(filePath);
          await fs.unlink(filePath);
          evicted += stats.size;
        } catch {
          // File might be deleted, continue
        }
      }
    } catch {
      // Error during eviction, continue
    }
  }
}

// Hybrid backend (combines memory and disk)
class HybridBackend implements CacheBackend {
  private memoryBackend: MemoryBackend;
  private diskBackend: DiskBackend;
  private memoryThreshold: number; // Size threshold for moving to disk

  constructor(config: CacheConfig) {
    this.memoryBackend = new MemoryBackend(config.maxMemoryEntries);
    this.diskBackend = new DiskBackend(config);
    this.memoryThreshold = 1000; // bytes
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory first
    let result = await this.memoryBackend.get<T>(key);
    if (result !== null) {
      return result;
    }

    // Try disk
    result = await this.diskBackend.get<T>(key);
    if (result !== null) {
      // Move back to memory if small enough
      const size = JSON.stringify(result).length;
      if (size < this.memoryThreshold) {
        await this.memoryBackend.set(key, result);
      }
    }

    return result;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const size = JSON.stringify(value).length;

    if (size < this.memoryThreshold) {
      await this.memoryBackend.set(key, value, ttl);
    } else {
      await this.diskBackend.set(key, value, ttl);
    }
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.memoryBackend.delete(key),
      this.diskBackend.delete(key)
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryBackend.clear(),
      this.diskBackend.clear()
    ]);
  }

  async keys(): Promise<string[]> {
    const [memoryKeys, diskKeys] = await Promise.all([
      this.memoryBackend.keys(),
      this.diskBackend.keys()
    ]);
    
    // Return unique keys
    return Array.from(new Set([...memoryKeys, ...diskKeys]));
  }

  async size(): Promise<number> {
    const [memorySize, diskSize] = await Promise.all([
      this.memoryBackend.size(),
      this.diskBackend.size()
    ]);
    
    // Remove duplicates
    const memoryKeys = await this.memoryBackend.keys();
    const diskKeys = await this.diskBackend.keys();
    const duplicateCount = memoryKeys.filter(key => diskKeys.includes(key)).length;
    
    return memorySize + diskSize - duplicateCount;
  }
}

// Main Cache Manager
export class CacheManager {
  private backend: CacheBackend;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    memorySize: 0,
    diskSize: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    const defaultConfig: CacheConfig = {
      backend: 'hybrid',
      maxMemoryEntries: 1000,
      maxDiskSize: 100, // 100MB
      diskLocation: path.join(process.cwd(), '.cache'),
      defaultTtl: 3600000, // 1 hour
      compressionEnabled: true,
      encryptionEnabled: false
    };

    const finalConfig = { ...defaultConfig, ...config };

    switch (finalConfig.backend) {
      case 'memory':
        this.backend = new MemoryBackend(finalConfig.maxMemoryEntries);
        break;
      case 'disk':
        this.backend = new DiskBackend(finalConfig);
        break;
      case 'hybrid':
      default:
        this.backend = new HybridBackend(finalConfig);
        break;
    }
  }

  // Cache operations
  async get<T>(key: string): Promise<T | null> {
    const result = await this.backend.get<T>(key);
    
    if (result !== null) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    return result;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.backend.set(key, value, ttl);
    await this.updateStats();
  }

  async delete(key: string): Promise<void> {
    await this.backend.delete(key);
    await this.updateStats();
  }

  async clear(): Promise<void> {
    await this.backend.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      memorySize: 0,
      diskSize: 0
    };
  }

  async keys(): Promise<string[]> {
    return await this.backend.keys();
  }

  async size(): Promise<number> {
    return await this.backend.size();
  }

  // Utility methods
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    
    return value;
  }

  async invalidatePattern(pattern: RegExp): Promise<void> {
    const keys = await this.keys();
    const matchingKeys = keys.filter(key => pattern.test(key));
    
    await Promise.all(matchingKeys.map(key => this.delete(key)));
  }

  async getStats(): Promise<CacheStats> {
    await this.updateStats();
    return { ...this.stats };
  }

  private async updateStats(): Promise<void> {
    this.stats.totalSize = await this.size();
    
    // Additional size calculations would go here
  }

  // Predefined cache helpers
  async getCachedGitHubData<T>(endpoint: string, fetcher: () => Promise<T>): Promise<T> {
    const key = `github:${endpoint}`;
    return await this.getOrSet(key, fetcher, 300000); // 5 minutes
  }

  async getCachedBeadsData<T>(query: string, fetcher: () => Promise<T>): Promise<T> {
    const key = `beads:${query}`;
    return await this.getOrSet(key, fetcher, 180000); // 3 minutes
  }

  async getCachedConfig<T>(path: string, fetcher: () => Promise<T>): Promise<T> {
    const key = `config:${path}`;
    return await this.getOrSet(key, fetcher, 60000); // 1 minute
  }

  async getCachedSyncResult<T>(syncId: string, fetcher: () => Promise<T>): Promise<T> {
    const key = `sync:${syncId}`;
    return await this.getOrSet(key, fetcher, 900000); // 15 minutes
  }

  // Cache warming
  async warmCache(keys: string[], values: any[]): Promise<void> {
    const operations = keys.map((key, index) => 
      this.set(key, values[index])
    );
    
    await Promise.all(operations);
  }

  // Background cleanup
  async cleanupExpired(): Promise<void> {
    // This would be called periodically to clean up expired entries
    // Implementation depends on backend capabilities
    const keys = await this.keys();
    const now = Date.now();
    
    for (const key of keys) {
      const entry = await this.backend.get(key);
      // If get returns null due to expiration, the cleanup is already done
      if (entry && now - (entry as any).timestamp >= (entry as any).ttl) {
        await this.delete(key);
      }
    }
  }

  // Export cache data
  async exportCache(filePath: string): Promise<void> {
    const keys = await this.keys();
    const exportData: Record<string, any> = {};
    
    for (const key of keys) {
      const value = await this.backend.get(key);
      if (value !== null) {
        exportData[key] = value;
      }
    }
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  // Import cache data
  async importCache(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const importData = JSON.parse(content);
      
      const operations = Object.entries(importData).map(([key, value]) =>
        this.set(key, value)
      );
      
      await Promise.all(operations);
    } catch {
      // Invalid import file, ignore
    }
  }
}

// Export types for consumers
export type { CacheConfig, CacheStats };
export { MemoryBackend, DiskBackend, HybridBackend };

/**
 * Cache Manager Tests
 * Unit tests for the CacheManager implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, MemoryBackend, DiskBackend, HybridBackend } from '../../../src/core/cache/CacheManager.js';
import fs from 'fs/promises';
import path from 'path';

describe('CacheManager', () => {
  let cache: CacheManager;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(process.cwd(), '.test-cache');
    cache = new CacheManager({
      backend: 'memory',
      maxMemoryEntries: 10,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000, // 1 minute
      compressionEnabled: false,
      encryptionEnabled: false
    });
  });

  afterEach(async () => {
    await cache.clear();
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('test-key', { data: 'test-value' });
      const result = await cache.get('test-key');
      
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      await cache.set('test-key', { data: 'test-value' });
      await cache.delete('test-key');
      
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should clear all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      const keys = await cache.keys();
      expect(keys).toHaveLength(0);
    });

    it('should return all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      const keys = await cache.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should return correct size', async () => {
      expect(await cache.size()).toBe(0);
      
      await cache.set('key1', 'value1');
      expect(await cache.size()).toBe(1);
      
      await cache.set('key2', 'value2');
      expect(await cache.size()).toBe(2);
      
      await cache.delete('key1');
      expect(await cache.size()).toBe(1);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', async () => {
      await cache.set('test-key', 'value', 100); // 100ms TTL
      
      // Value should be available immediately
      let result = await cache.get('test-key');
      expect(result).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Value should be expired
      result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('test-key', 'value');
      
      // Value should be available immediately
      let result = await cache.get('test-key');
      expect(result).toBe('value');
      
      // Verify it hasn't expired immediately
      result = await cache.get('test-key');
      expect(result).toBe('value');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when available', async () => {
      await cache.set('test-key', 'cached-value');
      
      const fetcher = vi.fn().mockResolvedValue('fresh-value');
      const result = await cache.getOrSet('test-key', fetcher);
      
      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache value when not available', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh-value');
      
      const result = await cache.getOrSet('test-key', fetcher);
      
      expect(result).toBe('fresh-value');
      expect(fetcher).toHaveBeenCalledOnce();
      
      // Verify it was cached
      const cached = await cache.get('test-key');
      expect(cached).toBe('fresh-value');
    });

    it('should handle fetcher errors', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'));
      
      await expect(cache.getOrSet('test-key', fetcher)).rejects.toThrow('Fetch failed');
      
      // Verify nothing was cached
      const cached = await cache.get('test-key');
      expect(cached).toBeNull();
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      await cache.set('user:123', { name: 'User 1' });
      await cache.set('user:456', { name: 'User 2' });
      await cache.set('post:789', { title: 'Post 1' });
      
      await cache.invalidatePattern(/^user:/);
      
      const user1 = await cache.get('user:123');
      const user2 = await cache.get('user:456');
      const post = await cache.get('post:789');
      
      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post).toEqual({ title: 'Post 1' });
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('test-key', 'value');
      
      // Initial stats
      let stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // Hit
      await cache.get('test-key');
      stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      
      // Miss
      await cache.get('non-existent');
      stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('test-key', 'value');
      
      // Multiple hits
      await cache.get('test-key');
      await cache.get('test-key');
      await cache.get('test-key');
      
      // Multiple misses
      await cache.get('miss1');
      await cache.get('miss2');
      
      const stats = await cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.totalSize).toBe(1);
    });
  });

  describe('Predefined Cache Helpers', () => {
    it('should cache GitHub data with appropriate TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 123, name: 'test-repo' });
      
      const result = await cache.getCachedGitHubData('repo:test', fetcher);
      
      expect(result).toEqual({ id: 123, name: 'test-repo' });
      expect(fetcher).toHaveBeenCalledOnce();
      
      // Verify cache key format
      const cached = await cache.get('github:repo:test');
      expect(cached).toEqual({ id: 123, name: 'test-repo' });
    });

    it('should cache Beads data with appropriate TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue([{ id: 'beads-1', title: 'Test Issue' }]);
      
      const result = await cache.getCachedBeadsData('issues:open', fetcher);
      
      expect(result).toEqual([{ id: 'beads-1', title: 'Test Issue' }]);
      expect(fetcher).toHaveBeenCalledOnce();
      
      // Verify cache key format
      const cached = await cache.get('beads:issues:open');
      expect(cached).toEqual([{ id: 'beads-1', title: 'Test Issue' }]);
    });

    it('should cache config data with appropriate TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue({ theme: 'dark', language: 'en' });
      
      const result = await cache.getCachedConfig('user', fetcher);
      
      expect(result).toEqual({ theme: 'dark', language: 'en' });
      expect(fetcher).toHaveBeenCalledOnce();
      
      // Verify cache key format
      const cached = await cache.get('config:user');
      expect(cached).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should cache sync results with appropriate TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue({ syncId: 'sync-123', status: 'completed' });
      
      const result = await cache.getCachedSyncResult('batch-456', fetcher);
      
      expect(result).toEqual({ syncId: 'sync-123', status: 'completed' });
      expect(fetcher).toHaveBeenCalledOnce();
      
      // Verify cache key format
      const cached = await cache.get('sync:batch-456');
      expect(cached).toEqual({ syncId: 'sync-123', status: 'completed' });
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with provided keys and values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', 'value3'];
      
      await cache.warmCache(keys, values);
      
      for (let i = 0; i < keys.length; i++) {
        const result = await cache.get(keys[i]);
        expect(result).toBe(values[i]);
      }
      
      expect(await cache.size()).toBe(3);
    });
  });

  describe('Export/Import', () => {
    it('should export cache data to file', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', { nested: 'value2' });
      
      // Ensure directory exists
      await fs.mkdir(testCacheDir, { recursive: true });
      
      const exportPath = path.join(testCacheDir, 'export.json');
      await cache.exportCache(exportPath);
      
      const content = await fs.readFile(exportPath, 'utf-8');
      const exported = JSON.parse(content);
      
      expect(exported).toEqual({
        key1: 'value1',
        key2: { nested: 'value2' }
      });
    });

    it('should import cache data from file', async () => {
      const importData = {
        key1: 'imported-value1',
        key2: { nested: 'imported-value2' }
      };
      
      // Ensure directory exists
      await fs.mkdir(testCacheDir, { recursive: true });
      
      const importPath = path.join(testCacheDir, 'import.json');
      await fs.writeFile(importPath, JSON.stringify(importData));
      
      await cache.importCache(importPath);
      
      expect(await cache.get('key1')).toBe('imported-value1');
      expect(await cache.get('key2')).toEqual({ nested: 'imported-value2' });
      expect(await cache.size()).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      await cache.set('valid-key', 'valid-value', 10000); // 10 seconds
      await cache.set('expired-key', 'expired-value', 50); // 50ms
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await cache.cleanupExpired();
      
      expect(await cache.get('valid-key')).toBe('valid-value');
      expect(await cache.get('expired-key')).toBeNull();
      expect(await cache.size()).toBe(1);
    });
  });
});

describe('MemoryBackend', () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend(3); // Small size for testing eviction
  });

  it('should evict LRU entries when over capacity', async () => {
    await backend.set('key1', 'value1');
    await backend.set('key2', 'value2');
    await backend.set('key3', 'value3');
    
    // Access key1 to make it most recently used
    await backend.get('key1');
    
    // Add one more to trigger eviction
    await backend.set('key4', 'value4');
    
    // key2 should be evicted (least recently used)
    expect(await backend.get('key1')).toBe('value1');
    expect(await backend.get('key2')).toBeNull();
    expect(await backend.get('key3')).toBe('value3');
    expect(await backend.get('key4')).toBe('value4');
    
    expect(await backend.size()).toBe(3);
  });
});

describe('DiskBackend', () => {
  let backend: DiskBackend;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(process.cwd(), '.test-disk-cache');
    backend = new DiskBackend({
      backend: 'disk',
      maxMemoryEntries: 0,
      maxDiskSize: 1, // 1MB
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should persist data to disk', async () => {
    await backend.set('test-key', { data: 'test-value' });
    
    // Create a new backend instance to test persistence
    const newBackend = new DiskBackend({
      backend: 'disk',
      maxMemoryEntries: 0,
      maxDiskSize: 1,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });
    
    const result = await newBackend.get('test-key');
    expect(result).toEqual({ data: 'test-value' });
  });
});

describe('HybridBackend', () => {
  let backend: HybridBackend;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(process.cwd(), '.test-hybrid-cache');
    backend = new HybridBackend({
      backend: 'hybrid',
      maxMemoryEntries: 5,
      maxDiskSize: 1,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should store small data in memory', async () => {
    const smallData = 'small';
    await backend.set('small-key', smallData);
    
    const result = await backend.get('small-key');
    expect(result).toBe(smallData);
  });

  it('should store large data on disk', async () => {
    const largeData = 'x'.repeat(2000); // > memoryThreshold
    await backend.set('large-key', largeData);
    
    const result = await backend.get('large-key');
    expect(result).toBe(largeData);
  });

  it('should move disk data to memory when accessed', async () => {
    const mediumData = 'x'.repeat(500); // Between thresholds
    await backend.set('medium-key', mediumData);
    
    // First access should retrieve from disk
    let result = await backend.get('medium-key');
    expect(result).toBe(mediumData);
    
    // Second access should retrieve from memory (if moved)
    result = await backend.get('medium-key');
    expect(result).toBe(mediumData);
  });
});

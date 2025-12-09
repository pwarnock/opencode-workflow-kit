/**
 * Cached Sync Engine Tests
 * Unit tests for CachedSyncEngine implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CachedSyncEngine, CachedSyncOptions, CachedSyncResult, SyncConflict } from '../../../src/sync/CachedSyncEngine.js';
import { CacheManager } from '../../../src/core/cache/CacheManager.js';

// Mock the cached clients
vi.mock('../../../src/utils/github/CachedGitHubClient.js', () => ({
  CachedGitHubClient: vi.fn().mockImplementation(() => ({
    getIssues: vi.fn(),
    updateIssue: vi.fn(),
    createIssue: vi.fn(),
    invalidateRepositoryCache: vi.fn(),
    getCacheStats: vi.fn().mockResolvedValue({ hits: 10, misses: 5 }),
    clearCache: vi.fn(),
    exportCache: vi.fn(),
    importCache: vi.fn(),
    warmCache: vi.fn()
  }))
}));

vi.mock('../../../src/utils/beads/CachedBeadsClient.js', () => ({
  CachedBeadsClient: vi.fn().mockImplementation(() => ({
    getIssues: vi.fn(),
    updateIssue: vi.fn(),
    createIssue: vi.fn(),
    createSyncResult: vi.fn(),
    getSyncHistory: vi.fn(),
    invalidateRepositoryCache: vi.fn(),
    getCacheStats: vi.fn().mockResolvedValue({ hits: 8, misses: 3 }),
    clearCache: vi.fn(),
    exportCache: vi.fn(),
    importCache: vi.fn(),
    warmCache: vi.fn()
  }))
}));

describe('CachedSyncEngine', () => {
  let syncEngine: CachedSyncEngine;
  let cacheManager: CacheManager;
  let mockGitHubClient: any;
  let mockBeadsClient: any;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = `${process.cwd()}/.test-sync-cache`;
    
    cacheManager = new CacheManager({
      backend: 'memory',
      maxMemoryEntries: 100,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });

    // Import mocked classes
    const { CachedGitHubClient } = await import('../../../src/utils/github/CachedGitHubClient.js');
    const { CachedBeadsClient } = await import('../../../src/utils/beads/CachedBeadsClient.js');

    mockGitHubClient = new CachedGitHubClient();
    mockBeadsClient = new CachedBeadsClient();

    syncEngine = new CachedSyncEngine(
      'github-token',
      'test-owner',
      'test-repo',
      'beads-api-key',
      'beads-workspace-id',
      { backend: 'memory' }
    );

    // Replace the internal clients with mocks
    (syncEngine as any).githubClient = mockGitHubClient;
    (syncEngine as any).beadsClient = mockBeadsClient;
    (syncEngine as any).cache = cacheManager;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheManager.clear();
    vi.clearAllMocks();
  });

  describe('GitHub to Beads Sync', () => {
    it('should sync new GitHub issues to Beads', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'New Issue from GitHub',
          body: 'Issue body',
          state: 'open',
          labels: [],
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockBeadsIssues = []; // No existing issues

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getIssues.mockResolvedValue(mockBeadsIssues);
      mockBeadsClient.createIssue.mockResolvedValue({ id: 'beads-1' });

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsCreated).toBe(1);
      expect(result.itemsUpdated).toBe(0);
      expect(mockBeadsClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Issue from GitHub',
          body: 'Issue body',
          status: 'open',
          assignee: 'test-user',
          metadata: expect.objectContaining({
            githubId: 1,
            githubNumber: 1
          })
        })
      );
    });

    it('should update existing Beads issues from GitHub', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'Updated Issue Title',
          body: 'Updated body',
          state: 'open',
          labels: [],
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-03T00:00:00Z'
        }
      ];

      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'Old Issue Title',
          body: 'Old body',
          metadata: { githubId: 1 },
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getIssues.mockResolvedValue(mockBeadsIssues);
      mockBeadsClient.updateIssue.mockResolvedValue({ id: 'beads-1' });

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsCreated).toBe(0);
      expect(result.itemsUpdated).toBe(1);
      expect(mockBeadsClient.updateIssue).toHaveBeenCalledWith(
        'beads-1',
        expect.objectContaining({
          title: 'Updated Issue Title',
          body: 'Updated body'
        })
      );
    });

    it('should respect filters when syncing', async () => {
      const mockGitHubIssues = [
        { id: 1, number: 1, title: 'High Priority Issue', labels: [{ name: 'priority:high' }] },
        { id: 2, number: 2, title: 'Low Priority Issue', labels: [{ name: 'priority:low' }] }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true,
        filters: {
          labels: ['priority:high']
        }
      };

      await syncEngine.executeSync(options);

      expect(mockGitHubClient.getIssues).toHaveBeenCalledWith({
        state: 'open',
        labels: ['priority:high'],
        per_page: 100
      });
    });

    it('should invalidate Beads cache after sync', async () => {
      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      await syncEngine.executeSync(options);

      expect(mockBeadsClient.invalidateRepositoryCache).toHaveBeenCalled();
    });
  });

  describe('Beads to GitHub Sync', () => {
    it('should sync new Beads issues to GitHub', async () => {
      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'New Issue from Beads',
          body: 'Issue body',
          status: 'open',
          priority: 'medium',
          tags: ['bug'],
          metadata: {},
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockGitHubIssues = []; // No existing issues

      mockBeadsClient.getIssues.mockResolvedValue(mockBeadsIssues);
      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockGitHubClient.createIssue.mockResolvedValue({ id: 1, number: 1 });
      mockBeadsClient.updateIssue.mockResolvedValue({ id: 'beads-1' });

      const options: CachedSyncOptions = {
        direction: 'beads-to-github',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsCreated).toBe(1);
      expect(result.itemsUpdated).toBe(1);
      expect(mockGitHubClient.createIssue).toHaveBeenCalledWith({
        title: 'New Issue from Beads',
        body: 'Issue body',
        labels: ['bug']
      });
      expect(mockBeadsClient.updateIssue).toHaveBeenCalledWith(
        'beads-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            githubId: 1,
            githubNumber: 1
          })
        })
      );
    });

    it('should update existing GitHub issues from Beads', async () => {
      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'Updated Issue Title',
          body: 'Updated body',
          status: 'closed',
          priority: 'medium',
          tags: [],
          metadata: { githubId: 1, githubNumber: 1 },
          updated_at: '2023-01-03T00:00:00Z'
        }
      ];

      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'Old Issue Title',
          body: 'Old body',
          state: 'open',
          labels: [],
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockBeadsClient.getIssues.mockResolvedValue(mockBeadsIssues);
      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockGitHubClient.updateIssue.mockResolvedValue({ id: 1 });

      const options: CachedSyncOptions = {
        direction: 'beads-to-github',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsCreated).toBe(0);
      expect(result.itemsUpdated).toBe(1);
      expect(mockGitHubClient.updateIssue).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Updated Issue Title',
          body: 'Updated body',
          state: 'closed'
        })
      );
    });

    it('should invalidate GitHub cache after sync', async () => {
      mockBeadsClient.getIssues.mockResolvedValue([]);
      mockGitHubClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'beads-to-github',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      await syncEngine.executeSync(options);

      expect(mockGitHubClient.invalidateRepositoryCache).toHaveBeenCalled();
    });
  });

  describe('Bidirectional Sync', () => {
    it('should perform both directions of sync', async () => {
      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('bidirectional');
      // Both directions should be processed
      expect(mockGitHubClient.getIssues).toHaveBeenCalled();
      expect(mockBeadsClient.getIssues).toHaveBeenCalled();
    });
  });

  describe('Conflict Detection and Resolution', () => {
    it('should detect data conflicts', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub body',
          state: 'open',
          labels: [],
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
        }
      ];

      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'Beads Title', // Different title
          body: 'Beads body',
          status: 'open',
          metadata: { githubId: 1 },
          updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString() // 1 minute ago
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getIssues.mockResolvedValue(mockBeadsIssues);

      // Mock conflict resolution
      const resolveConflictSpy = vi.spyOn(syncEngine as any, 'resolveConflict')
        .mockResolvedValue(true);

      const options: CachedSyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      await syncEngine.executeSync(options);

      expect(resolveConflictSpy).toHaveBeenCalled();
    });

    it('should cache conflict resolutions', async () => {
      const conflictId = 'data-1';
      const cacheKey = `conflict:resolution:${conflictId}`;
      
      await (syncEngine as any).cache.set(cacheKey, { type: 'github-wins' });

      const cachedResolution = await (syncEngine as any).cache.get(cacheKey);
      expect(cachedResolution).toEqual({ type: 'github-wins' });
    });
  });

  describe('Cache Hit Rate Calculation', () => {
    it('should calculate cache hit rates correctly', async () => {
      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.cacheHits).toBeGreaterThanOrEqual(0);
      expect(result.cacheMisses).toBeGreaterThanOrEqual(0);
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(result.cacheHitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle GitHub API errors gracefully', async () => {
      mockGitHubClient.getIssues.mockRejectedValue(new Error('GitHub API Error'));
      mockBeadsClient.createSyncResult.mockResolvedValue({ id: 'sync-result' });

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('system-error');
    });

    it('should handle Beads API errors gracefully', async () => {
      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getIssues.mockRejectedValue(new Error('Beads API Error'));
      mockBeadsClient.createSyncResult.mockResolvedValue({ id: 'sync-result' });

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: false,
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('system-error');
    });
  });

  describe('Dry Run Mode', () => {
    it('should not make changes in dry run mode', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'New Issue',
          body: 'Body',
          state: 'open',
          labels: [],
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getIssues.mockResolvedValue([]);

      const options: CachedSyncOptions = {
        direction: 'github-to-beads',
        dryRun: true, // Dry run enabled
        force: false,
        batchSize: 100,
        cacheEnabled: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsCreated).toBe(0); // No actual creation in dry run
      expect(result.itemsUpdated).toBe(0);
      expect(mockBeadsClient.createIssue).not.toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics', async () => {
      mockGitHubClient.getCacheStats.mockResolvedValue({ hits: 20, misses: 5 });
      mockBeadsClient.getCacheStats.mockResolvedValue({ hits: 15, misses: 3 });
      
      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getIssues.mockResolvedValue([]);
      
      mockBeadsClient.getSyncHistory.mockResolvedValue([
        {
          metadata: { direction: 'github-to-beads', cacheHitRate: 75 },
          completed_at: '2023-01-01T00:05:00Z',
          started_at: '2023-01-01T00:00:00Z',
          items_processed: 10
        }
      ]);

      const metrics = await syncEngine.getPerformanceMetrics();

      expect(metrics).toHaveProperty('githubApiCalls');
      expect(metrics).toHaveProperty('githubCacheHitRate');
      expect(metrics).toHaveProperty('beadsApiCalls');
      expect(metrics).toHaveProperty('beadsCacheHitRate');
      expect(metrics).toHaveProperty('syncPerformance');
      expect(typeof metrics.githubCacheHitRate).toBe('number');
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      await syncEngine.clearAllCaches();

      expect(mockGitHubClient.clearCache).toHaveBeenCalled();
      expect(mockBeadsClient.clearCache).toHaveBeenCalled();
    });

    it('should warm caches', async () => {
      await syncEngine.warmCache();

      expect(mockGitHubClient.warmCache).toHaveBeenCalled();
      expect(mockBeadsClient.warmCache).toHaveBeenCalled();
    });

    it('should export cache data', async () => {
      const exportPath = '/tmp/cache-export';
      
      await syncEngine.exportCache(exportPath);

      expect(mockGitHubClient.exportCache).toHaveBeenCalledWith(`${exportPath}.github`);
      expect(mockBeadsClient.exportCache).toHaveBeenCalledWith(`${exportPath}.beads`);
    });

    it('should import cache data', async () => {
      const importPath = '/tmp/cache-import';
      
      await syncEngine.importCache(importPath);

      expect(mockGitHubClient.importCache).toHaveBeenCalledWith(`${importPath}.github`);
      expect(mockBeadsClient.importCache).toHaveBeenCalledWith(`${importPath}.beads`);
    });
  });

  describe('Background Cleanup', () => {
    it('should cleanup expired caches', async () => {
      const cleanupSpy = vi.spyOn(cacheManager, 'cleanupExpired').mockResolvedValue();
      
      await syncEngine.cleanupExpiredCaches();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});

/**
 * Cached Beads Client Tests
 * Unit tests for CachedBeadsClient implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CachedBeadsClient } from "../../../src/utils/beads/CachedBeadsClient.js";
import { CacheManager } from "../../../src/core/cache/CacheManager.js";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CachedBeadsClient", () => {
  let client: CachedBeadsClient;
  let cacheManager: CacheManager;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = `${process.cwd()}/.test-beads-cache`;

    cacheManager = new CacheManager({
      backend: "memory",
      maxMemoryEntries: 100,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false,
    });

    client = new CachedBeadsClient(
      "test-api-key",
      "test-workspace-id",
      "https://api.test.beads.dev",
      { backend: "memory" },
    );

    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await cacheManager.clear();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Workspace Operations", () => {
    it("should cache workspace information", async () => {
      const mockWorkspace = {
        id: "test-workspace-id",
        name: "Test Workspace",
        description: "Test workspace description",
        config: { theme: "dark", language: "en" },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockWorkspace,
      });

      // First call should fetch from API
      const result1 = await client.getWorkspace();
      expect(result1).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.beads.dev/workspaces/test-workspace-id",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
        }),
      );

      // Second call should use cache
      const result2 = await client.getWorkspace();
      expect(result2).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should invalidate workspace cache when updating", async () => {
      const mockWorkspace = {
        id: "test-workspace-id",
        name: "Test Workspace",
        description: "Test workspace description",
        config: { theme: "dark", language: "en" },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
      };

      const updatedWorkspace = {
        ...mockWorkspace,
        config: { theme: "light", language: "en" },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockWorkspace,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedWorkspace,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedWorkspace,
        });

      // First call
      await client.getWorkspace();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Update workspace
      const result = await client.updateWorkspace({
        config: { theme: "light", language: "en" },
      });
      expect(result.config.theme).toBe("light");

      // Next call should fetch fresh data
      const freshResult = await client.getWorkspace();
      expect(freshResult.config.theme).toBe("light");
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial get + update + fresh get
    });
  });

  describe("Issue Operations", () => {
    it("should cache issues list with options", async () => {
      const mockIssues = [
        {
          id: "beads-1",
          title: "Issue 1",
          body: "Body 1",
          status: "open" as const,
          priority: "high" as const,
          assignee: "user1",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
          tags: ["bug", "urgent"],
          metadata: { githubId: 123 },
        },
        {
          id: "beads-2",
          title: "Issue 2",
          body: "Body 2",
          status: "closed" as const,
          priority: "medium" as const,
          assignee: "user2",
          created_at: "2023-01-03T00:00:00Z",
          updated_at: "2023-01-04T00:00:00Z",
          tags: ["enhancement"],
          metadata: {},
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockIssues,
      });

      const options = {
        status: "open",
        priority: "high",
        limit: 50,
      };

      // First call should fetch from API
      const result1 = await client.getIssues(options);
      expect(result1).toEqual(mockIssues);

      // Second call should use cache
      const result2 = await client.getIssues(options);
      expect(result2).toEqual(mockIssues);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should cache individual issue", async () => {
      const mockIssue = {
        id: "beads-123",
        title: "Single Issue",
        body: "Issue body",
        status: "in_progress" as const,
        priority: "critical" as const,
        assignee: "user1",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
        tags: ["bug", "urgent"],
        metadata: { githubId: 456 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockIssue,
      });

      // First call should fetch from API
      const result1 = await client.getIssue("beads-123");
      expect(result1).toEqual(mockIssue);

      // Second call should use cache
      const result2 = await client.getIssue("beads-123");
      expect(result2).toEqual(mockIssue);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should invalidate caches when creating issue", async () => {
      // Pre-populate cache
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });
      await client.getIssues();

      const newIssue = {
        title: "New Issue",
        body: "New issue body",
        status: "open" as const,
        priority: "medium" as const,
        tags: ["bug"],
        metadata: {},
      };

      const createdIssue = {
        ...newIssue,
        id: "beads-new",
        created_at: "2023-01-05T00:00:00Z",
        updated_at: "2023-01-05T00:00:00Z",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => createdIssue,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [createdIssue],
        });

      const result = await client.createIssue(newIssue);
      expect(result.id).toBe("beads-new");

      // Next getIssues call should fetch from API again
      await client.getIssues();
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial list + create + fresh list
    });

    it("should invalidate caches when updating issue", async () => {
      // Pre-populate caches
      const mockIssue = {
        id: "beads-123",
        title: "Original Title",
        body: "Original body",
        status: "open" as const,
        priority: "medium" as const,
        tags: ["bug"],
        metadata: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockIssue,
      });

      await client.getIssues();
      await client.getIssue("beads-123");

      const updatedIssue = {
        ...mockIssue,
        title: "Updated Title",
        status: "closed" as const,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssue,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssue,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [updatedIssue],
        });

      const result = await client.updateIssue("beads-123", {
        title: "Updated Title",
        status: "closed",
      });
      expect(result.title).toBe("Updated Title");

      // Next calls should fetch fresh data
      await client.getIssue("beads-123");
      await client.getIssues();
      expect(mockFetch).toHaveBeenCalledTimes(5); // Initial list + issue + update + fresh issue + fresh list
    });

    it("should invalidate caches when deleting issue", async () => {
      // Pre-populate cache
      const mockIssue = {
        id: "beads-123",
        title: "To Delete",
        status: "open" as const,
        priority: "low" as const,
        tags: [],
        metadata: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [mockIssue],
      });

      await client.getIssues();
      await client.getIssue("beads-123");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [],
        });

      await client.deleteIssue("beads-123");

      // Next getIssues call should fetch fresh data
      await client.getIssues();
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial list + issue + delete + fresh list
    });
  });

  describe("Batch Operations", () => {
    it("should batch create issues", async () => {
      const issues = [
        {
          title: "Batch Issue 1",
          body: "Body for batch issue 1",
          status: "open" as const,
          priority: "medium" as const,
          tags: ["bug"],
          metadata: {},
        },
        {
          title: "Batch Issue 2",
          body: "Body for batch issue 2",
          status: "open" as const,
          priority: "high" as const,
          tags: ["urgent"],
          metadata: {},
        },
      ];

      const createdIssues = issues.map((issue, index) => ({
        ...issue,
        id: `batch-${index + 1}`,
        created_at: "2023-01-05T00:00:00Z",
        updated_at: "2023-01-05T00:00:00Z",
      }));

      // Pre-populate cache
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });
      await client.getIssues();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => createdIssues,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => createdIssues,
        });

      const result = await client.batchCreateIssues(issues);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Batch Issue 1");

      // Next getIssues call should fetch fresh data
      await client.getIssues();
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial list + batch create + fresh list
    });

    it("should batch update issues", async () => {
      const updates = [
        { id: "beads-1", updates: { status: "closed" as const } },
        { id: "beads-2", updates: { priority: "critical" as const } },
      ];

      const updatedIssues = [
        {
          id: "beads-1",
          title: "Issue 1",
          status: "closed" as const,
          priority: "medium" as const,
          tags: [],
          metadata: {},
        },
        {
          id: "beads-2",
          title: "Issue 2",
          status: "open" as const,
          priority: "critical" as const,
          tags: [],
          metadata: {},
        },
      ];

      // Pre-populate caches
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => updatedIssues,
      });

      await client.getIssues();
      await client.getIssue("beads-1");
      await client.getIssue("beads-2");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssues,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssues,
        })
        .mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssues[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => updatedIssues[1],
        });

      const result = await client.batchUpdateIssues(updates);
      expect(result).toHaveLength(2);

      // Next calls should fetch fresh data
      await client.getIssue("beads-1");
      await client.getIssue("beads-2");
      await client.getIssues();
      expect(mockFetch).toHaveBeenCalledTimes(7); // Initial list + 2 issues + batch update + fresh list + 2 fresh issues
    });
  });

  describe("Sync Operations", () => {
    it("should cache sync results", async () => {
      const mockSyncResult = {
        id: "sync-123",
        source: "github" as const,
        target: "beads" as const,
        status: "completed" as const,
        items_processed: 10,
        items_created: 2,
        items_updated: 5,
        items_deleted: 1,
        conflicts_resolved: 1,
        errors: [],
        started_at: "2023-01-01T00:00:00Z",
        completed_at: "2023-01-01T00:05:00Z",
      };

      const syncData = {
        source: "github" as const,
        target: "beads" as const,
        status: "completed" as const,
        items_processed: 10,
        items_created: 2,
        items_updated: 5,
        items_deleted: 1,
        conflicts_resolved: 1,
        errors: [],
        metadata: { syncId: "sync-123" },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockSyncResult,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockSyncResult,
        });

      // Create sync result
      const result1 = await client.createSyncResult(syncData);
      expect(result1.id).toBe("sync-123");

      // Get sync result - should use cache
      const result2 = await client.getSyncResult("sync-123");
      expect(result2.id).toBe("sync-123");

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called for create
    });

    it("should cache sync history", async () => {
      const mockSyncHistory = [
        {
          id: "sync-1",
          source: "github" as const,
          target: "beads" as const,
          status: "completed" as const,
          items_processed: 10,
          items_created: 2,
          items_updated: 5,
          items_deleted: 1,
          conflicts_resolved: 1,
          errors: [],
          started_at: "2023-01-01T00:00:00Z",
          completed_at: "2023-01-01T00:05:00Z",
        },
        {
          id: "sync-2",
          source: "beads" as const,
          target: "github" as const,
          status: "completed" as const,
          items_processed: 8,
          items_created: 1,
          items_updated: 4,
          items_deleted: 2,
          conflicts_resolved: 0,
          errors: [],
          started_at: "2023-01-02T00:00:00Z",
          completed_at: "2023-01-02T00:03:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockSyncHistory,
      });

      const options = {
        limit: 10,
        source: "github",
      };

      // First call should fetch from API
      const result1 = await client.getSyncHistory(options);
      expect(result1).toEqual(mockSyncHistory);

      // Second call should use cache
      const result2 = await client.getSyncHistory(options);
      expect(result2).toEqual(mockSyncHistory);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Search Operations", () => {
    it("should cache search results", async () => {
      const mockSearchResults = [
        {
          id: "beads-1",
          title: "Bug in authentication",
          status: "open" as const,
          priority: "high" as const,
          tags: ["bug", "auth"],
          metadata: {},
        },
        {
          id: "beads-2",
          title: "Authentication improvement",
          status: "closed" as const,
          priority: "medium" as const,
          tags: ["enhancement", "auth"],
          metadata: {},
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockSearchResults,
      });

      const query = {
        q: "authentication",
        status: "open",
        limit: 20,
      };

      // First call should fetch from API
      const result1 = await client.searchIssues(query);
      expect(result1).toEqual(mockSearchResults);

      // Second call should use cache
      const result2 = await client.searchIssues(query);
      expect(result2).toEqual(mockSearchResults);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tag Management", () => {
    it("should cache tags list", async () => {
      const mockTags = [
        { id: "tag-1", name: "bug", color: "red", count: 15 },
        { id: "tag-2", name: "enhancement", color: "green", count: 8 },
        { id: "tag-3", name: "urgent", color: "orange", count: 3 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockTags,
      });

      // First call should fetch from API
      const result1 = await client.getTags();
      expect(result1).toEqual(mockTags);

      // Second call should use cache
      const result2 = await client.getTags();
      expect(result2).toEqual(mockTags);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance Monitoring", () => {
    it("should measure performance", async () => {
      const mockWorkspace = {
        id: "test-workspace-id",
        name: "Test Workspace",
        description: "Test workspace description",
        config: { theme: "dark", language: "en" },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
      };

      const mockIssues = [
        {
          id: "beads-1",
          title: "Issue 1",
          status: "open" as const,
          priority: "medium" as const,
          tags: [],
          metadata: {},
        },
      ];

      mockFetch
        .mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockWorkspace,
        })
        .mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockIssues,
        })
        .mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [],
        });

      const performance = await client.measurePerformance();

      expect(performance).toHaveProperty("getWorkspace");
      expect(performance).toHaveProperty("getIssues");
      expect(typeof performance.getWorkspace).toBe("number");
      expect(typeof performance.getIssues).toBe("number");
    });

    it("should monitor sync health", async () => {
      const mockSyncHistory = [
        {
          id: "sync-1",
          source: "github" as const,
          target: "beads" as const,
          status: "completed" as const,
          items_processed: 10,
          items_created: 2,
          items_updated: 5,
          items_deleted: 1,
          conflicts_resolved: 1,
          errors: [],
          started_at: "2023-01-01T00:00:00Z",
          completed_at: "2023-01-01T00:05:00Z",
        },
        {
          id: "sync-2",
          source: "github" as const,
          target: "beads" as const,
          status: "failed" as const,
          items_processed: 5,
          items_created: 0,
          items_updated: 0,
          items_deleted: 0,
          conflicts_resolved: 0,
          errors: [{ error: "API timeout" }],
          started_at: "2023-01-02T00:00:00Z",
          completed_at: "2023-01-02T00:02:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockSyncHistory,
      });

      const health = await client.monitorSyncHealth();

      expect(health).toHaveProperty("recentSyncs");
      expect(health).toHaveProperty("successRate");
      expect(health).toHaveProperty("averageDuration");
      expect(health.recentSyncs).toBe(2);
      expect(health.successRate).toBe(50); // 1 out of 2 successful
    });
  });

  describe("Cache Statistics", () => {
    it("should return cache statistics", async () => {
      // Simulate some cache activity
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "test-workspace-id",
          name: "Test Workspace",
          description: "Test workspace description",
          config: { theme: "dark", language: "en" },
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
        }),
      });

      await client.getWorkspace();
      await client.getWorkspace(); // Cache hit

      const stats = await client.getCacheStats();

      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("hitRate");
      expect(stats).toHaveProperty("totalSize");
      expect(typeof stats.hitRate).toBe("number");
    });
  });

  describe("Cache Management", () => {
    it("should clear all cache", async () => {
      // Pre-populate cache
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "test-workspace-id",
          name: "Test Workspace",
          description: "Test workspace description",
          config: { theme: "dark", language: "en" },
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
        }),
      });
      await client.getWorkspace();

      expect(await client.getCacheStats()).toHaveProperty("totalSize");

      await client.clearCache();

      const stats = await client.getCacheStats();
      expect(stats.totalSize).toBe(0);
    });

    it("should warm cache with common entries", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            id: "test-workspace-id",
            name: "Test Workspace",
            description: "Test workspace description",
            config: { theme: "dark", language: "en" },
            created_at: "2023-01-01T00:00:00Z",
            updated_at: "2023-01-02T00:00:00Z",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [
            { id: "tag-1", name: "bug", color: "red", count: 15 },
          ],
        });

      await client.warmCache();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.beads.dev/workspaces/test-workspace-id",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.beads.dev/workspaces/test-workspace-id/issues?limit=20",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.beads.dev/workspaces/test-workspace-id/tags",
        expect.any(Object),
      );
    });
  });

  describe("Export/Import Cache", () => {
    it("should export cache to file", async () => {
      // Pre-populate cache
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "test-workspace-id",
          name: "Test Workspace",
          description: "Test workspace description",
          config: { theme: "dark", language: "en" },
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
        }),
      });
      await client.getWorkspace();

      const exportPath = `${testCacheDir}/export.json`;

      // Mock cache export - spy on the client's cache instance
      const exportSpy = vi
        .spyOn((client as any).cache, "exportCache")
        .mockResolvedValue(undefined);

      await client.exportCache(exportPath);

      expect(exportSpy).toHaveBeenCalledWith(exportPath);
      exportSpy.mockRestore();
    });

    it("should import cache from file", async () => {
      const importPath = `${testCacheDir}/import.json`;

      // Mock cache import - spy on the client's cache instance
      const importSpy = vi
        .spyOn((client as any).cache, "importCache")
        .mockResolvedValue(undefined);

      await client.importCache(importPath);

      expect(importSpy).toHaveBeenCalledWith(importPath);
      importSpy.mockRestore();
    });
  });
});

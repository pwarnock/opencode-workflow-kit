/**
 * Cached Beads Client
 * Beads API client with intelligent caching
 */

import { CacheManager } from "../../core/cache/CacheManager.js";

export interface BeadsIssue {
  id: string;
  title: string;
  body: string;
  status: "open" | "closed" | "in_progress";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface BeadsWorkspace {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BeadsSyncResult {
  id: string;
  source: "github" | "beads" | "manual";
  target: "github" | "beads" | "manual";
  status: "completed" | "failed" | "partial";
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_deleted: number;
  conflicts_resolved: number;
  errors: Array<{
    item_id: string;
    error: string;
    details: any;
  }>;
  started_at: string;
  completed_at: string;
}

export class CachedBeadsClient {
  private cache: CacheManager;
  private baseUrl: string;
  private apiKey: string;
  private workspaceId: string;

  constructor(
    apiKey: string,
    workspaceId: string,
    baseUrl: string = "https://api.beads.dev",
    cacheConfig?: any,
  ) {
    this.apiKey = apiKey;
    this.workspaceId = workspaceId;
    this.baseUrl = baseUrl;
    this.cache = new CacheManager(cacheConfig);
  }

  // Workspace operations
  async getWorkspace(): Promise<BeadsWorkspace> {
    const cacheKey = `workspace:${this.workspaceId}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}`,
      );
      return response as BeadsWorkspace;
    });
  }

  async updateWorkspace(
    updates: Partial<BeadsWorkspace>,
  ): Promise<BeadsWorkspace> {
    const response = await this.makeRequest(`/workspaces/${this.workspaceId}`, {
      method: "PUT",
      body: updates,
    });

    // Invalidate workspace cache
    await this.cache.delete(`beads:workspace:${this.workspaceId}`);

    return response as BeadsWorkspace;
  }

  // Issue operations with caching
  async getIssues(
    options: {
      status?: string;
      priority?: string;
      assignee?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<BeadsIssue[]> {
    const cacheKey = `issues:${this.workspaceId}:${JSON.stringify(options)}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const queryParams = new URLSearchParams();

      if (options.status) queryParams.append("status", options.status);
      if (options.priority) queryParams.append("priority", options.priority);
      if (options.assignee) queryParams.append("assignee", options.assignee);
      if (options.tags?.length)
        queryParams.append("tags", options.tags.join(","));
      if (options.limit) queryParams.append("limit", options.limit.toString());
      if (options.offset)
        queryParams.append("offset", options.offset.toString());

      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/issues?${queryParams}`,
      );
      return response as BeadsIssue[];
    });
  }

  async getIssue(issueId: string): Promise<BeadsIssue> {
    const cacheKey = `issue:${this.workspaceId}:${issueId}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/issues/${issueId}`,
      );
      return response as BeadsIssue;
    });
  }

  async createIssue(
    issue: Omit<BeadsIssue, "id" | "created_at" | "updated_at">,
  ): Promise<BeadsIssue> {
    const response = await this.makeRequest(
      `/workspaces/${this.workspaceId}/issues`,
      {
        method: "POST",
        body: issue,
      },
    );

    // Invalidate issue lists cache
    await this.invalidateIssuesCache();

    return response as BeadsIssue;
  }

  async updateIssue(
    issueId: string,
    updates: Partial<BeadsIssue>,
  ): Promise<BeadsIssue> {
    const response = await this.makeRequest(
      `/workspaces/${this.workspaceId}/issues/${issueId}`,
      {
        method: "PUT",
        body: updates,
      },
    );

    // Invalidate relevant caches
    await Promise.all([
      this.cache.delete(`beads:issue:${this.workspaceId}:${issueId}`),
      this.invalidateIssuesCache(),
    ]);

    return response as BeadsIssue;
  }

  async deleteIssue(issueId: string): Promise<void> {
    await this.makeRequest(
      `/workspaces/${this.workspaceId}/issues/${issueId}`,
      {
        method: "DELETE",
      },
    );

    // Invalidate caches
    await Promise.all([
      this.cache.delete(`beads:issue:${this.workspaceId}:${issueId}`),
      this.invalidateIssuesCache(),
    ]);
  }

  // Sync operations with result caching
  async createSyncResult(
    syncResult: Omit<BeadsSyncResult, "id" | "started_at" | "completed_at">,
  ): Promise<BeadsSyncResult> {
    const response = await this.makeRequest(
      `/workspaces/${this.workspaceId}/syncs`,
      {
        method: "POST",
        body: syncResult,
      },
    );

    const result = response as BeadsSyncResult;

    // Cache the sync result
    const cacheKey = `beads:sync:${this.workspaceId}:${result.id}`;
    await this.cache.set(cacheKey, result, 900000); // 15 minutes

    return result;
  }

  async getSyncResult(syncId: string): Promise<BeadsSyncResult> {
    const cacheKey = `sync:${this.workspaceId}:${syncId}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/syncs/${syncId}`,
      );
      return response as BeadsSyncResult;
    });
  }

  async getSyncHistory(
    options: {
      limit?: number;
      offset?: number;
      source?: string;
      target?: string;
      status?: string;
    } = {},
  ): Promise<BeadsSyncResult[]> {
    const cacheKey = `syncs:${this.workspaceId}:${JSON.stringify(options)}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const queryParams = new URLSearchParams();

      if (options.limit) queryParams.append("limit", options.limit.toString());
      if (options.offset)
        queryParams.append("offset", options.offset.toString());
      if (options.source) queryParams.append("source", options.source);
      if (options.target) queryParams.append("target", options.target);
      if (options.status) queryParams.append("status", options.status);

      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/syncs?${queryParams}`,
      );
      return response as BeadsSyncResult[];
    });
  }

  // Search operations with caching
  async searchIssues(query: {
    q: string;
    status?: string;
    priority?: string;
    tags?: string[];
    assignee?: string;
    limit?: number;
  }): Promise<BeadsIssue[]> {
    const cacheKey = `search:${this.workspaceId}:${JSON.stringify(query)}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("q", query.q);

      if (query.status) queryParams.append("status", query.status);
      if (query.priority) queryParams.append("priority", query.priority);
      if (query.tags?.length) queryParams.append("tags", query.tags.join(","));
      if (query.assignee) queryParams.append("assignee", query.assignee);
      if (query.limit) queryParams.append("limit", query.limit.toString());

      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/issues/search?${queryParams}`,
      );
      return response as BeadsIssue[];
    });
  }

  // Tag management
  async getTags(): Promise<
    Array<{ id: string; name: string; color: string; count: number }>
  > {
    const cacheKey = `tags:${this.workspaceId}`;

    return await this.cache.getCachedBeadsData(cacheKey, async () => {
      const response = await this.makeRequest(
        `/workspaces/${this.workspaceId}/tags`,
      );
      return response as Array<{
        id: string;
        name: string;
        color: string;
        count: number;
      }>;
    });
  }

  // Batch operations
  async batchCreateIssues(
    issues: Array<Omit<BeadsIssue, "id" | "created_at" | "updated_at">>,
  ): Promise<BeadsIssue[]> {
    const response = await this.makeRequest(
      `/workspaces/${this.workspaceId}/issues/batch`,
      {
        method: "POST",
        body: { issues },
      },
    );

    // Invalidate issue caches
    await this.invalidateIssuesCache();

    return response as BeadsIssue[];
  }

  async batchUpdateIssues(
    updates: Array<{ id: string; updates: Partial<BeadsIssue> }>,
  ): Promise<BeadsIssue[]> {
    const response = await this.makeRequest(
      `/workspaces/${this.workspaceId}/issues/batch`,
      {
        method: "PUT",
        body: { updates },
      },
    );

    // Invalidate individual issue caches and list cache
    const invalidations = updates.map(({ id }) =>
      this.cache.delete(`beads:issue:${this.workspaceId}:${id}`),
    );

    await Promise.all([...invalidations, this.invalidateIssuesCache()]);

    return response as BeadsIssue[];
  }

  // HTTP request helper
  private async makeRequest(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: any;
      headers?: Record<string, string>;
    } = {},
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || "GET";

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Beads API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  // Cache invalidation helpers
  private async invalidateIssuesCache(): Promise<void> {
    await this.cache.invalidatePattern(/^beads:issues:.*$/);
    await this.cache.invalidatePattern(/^beads:search:.*$/);
  }

  // Cache statistics
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
  }> {
    const stats = await this.cache.getStats();
    const total = stats.hits + stats.misses;

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
      totalSize: stats.totalSize,
    };
  }

  // Cache management
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async invalidateRepositoryCache(): Promise<void> {
    await this.invalidateIssuesCache();
  }

  async warmCache(): Promise<void> {
    // Pre-warm common cache entries
    await Promise.all([
      this.getWorkspace(),
      this.getIssues({ limit: 20 }),
      this.getTags(),
    ]);
  }

  // Export/import cache
  async exportCache(filePath: string): Promise<void> {
    await this.cache.exportCache(filePath);
  }

  async importCache(filePath: string): Promise<void> {
    await this.cache.importCache(filePath);
  }

  // Performance monitoring
  async measurePerformance(): Promise<{
    getWorkspace: number;
    getIssues: number;
    createIssue: number;
    updateIssue: number;
    searchIssues: number;
  }> {
    const iterations = 10;
    const results: Record<string, number[]> = {};

    // Measure getWorkspace performance
    const workspaceTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.getWorkspace();
      const end = performance.now();
      workspaceTimes.push(end - start);
    }
    results.getWorkspace = workspaceTimes;

    // Measure getIssues performance
    const issuesTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.getIssues({ limit: 10 });
      const end = performance.now();
      issuesTimes.push(end - start);
    }
    results.getIssues = issuesTimes;

    // Calculate averages
    return {
      getWorkspace: this.calculateAverage(workspaceTimes),
      getIssues: this.calculateAverage(issuesTimes),
      createIssue: 0, // Would need to create then delete test data
      updateIssue: 0, // Would need to create then update test data
      searchIssues: 0, // Would need to create then search test data
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  // Cache cleanup
  async cleanupExpired(): Promise<void> {
    await this.cache.cleanupExpired();
  }

  // Background sync monitoring
  async monitorSyncHealth(): Promise<{
    recentSyncs: number;
    successRate: number;
    averageDuration: number;
  }> {
    const recentSyncs = await this.getSyncHistory({ limit: 10 });
    const successfulSyncs = recentSyncs.filter(
      (sync) => sync.status === "completed",
    );

    const successRate =
      recentSyncs.length > 0
        ? (successfulSyncs.length / recentSyncs.length) * 100
        : 0;

    const durations = recentSyncs
      .filter((sync) => sync.completed_at && sync.started_at)
      .map(
        (sync) =>
          new Date(sync.completed_at).getTime() -
          new Date(sync.started_at).getTime(),
      );

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
        : 0;

    return {
      recentSyncs: recentSyncs.length,
      successRate,
      averageDuration,
    };
  }
}

/**
 * Cached Sync Engine
 * Enhanced sync engine with intelligent caching for performance
 */

import { CacheManager } from '../core/cache/CacheManager.js';
import { CachedGitHubClient } from '../utils/github/CachedGitHubClient.js';
import { CachedBeadsClient } from '../utils/beads/CachedBeadsClient.js';

export interface CachedSyncOptions {
  direction: 'github-to-beads' | 'beads-to-github' | 'bidirectional';
  dryRun: boolean;
  force: boolean;
  since?: Date;
  batchSize: number;
  filters?: {
    labels?: string[];
    status?: string[];
    assignee?: string;
  };
  cacheEnabled: boolean;
  cacheTtl?: number;
}

export interface CachedSyncResult {
  success: boolean;
  direction: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  conflictsResolved: number;
  errors: Array<{
    item: string;
    type: string;
    message: string;
  }>;
  duration: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  syncId: string;
  timestamp: Date;
}

export interface SyncConflict {
  id: string;
  type: 'data' | 'status' | 'assignee' | 'labels';
  source: 'github' | 'beads';
  githubData?: any;
  beadsData?: any;
  resolution?: 'manual' | 'github-wins' | 'beads-wins' | 'merge' | 'newer-wins';
  resolvedAt?: Date;
}

export class CachedSyncEngine {
  private cache: CacheManager;
  private githubClient: CachedGitHubClient;
  private beadsClient: CachedBeadsClient;
  private syncId: string;

  constructor(
    githubToken: string,
    githubOwner: string,
    githubRepo: string,
    beadsApiKey: string,
    beadsWorkspaceId: string,
    cacheConfig?: any
  ) {
    this.cache = new CacheManager(cacheConfig);
    this.githubClient = new CachedGitHubClient(
      githubToken,
      githubOwner,
      githubRepo,
      cacheConfig
    );
    this.beadsClient = new CachedBeadsClient(
      beadsApiKey,
      beadsWorkspaceId,
      undefined,
      cacheConfig
    );
    this.syncId = this.generateSyncId();
  }

  // Main sync method with caching
  async executeSync(options: CachedSyncOptions): Promise<CachedSyncResult> {
    const startTime = performance.now();
    const result: CachedSyncResult = {
      success: false,
      direction: options.direction,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      conflictsResolved: 0,
      errors: [],
      duration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      syncId: this.syncId,
      timestamp: new Date(),
    };

    try {
      // Get initial cache stats
      const initialStats = await Promise.all([
        this.githubClient.getCacheStats(),
        this.beadsClient.getCacheStats(),
      ]);

      const initialHits = initialStats.reduce(
        (sum, stats) => sum + stats.hits,
        0
      );
      const initialMisses = initialStats.reduce(
        (sum, stats) => sum + stats.misses,
        0
      );

      switch (options.direction) {
        case 'github-to-beads':
          await this.syncGithubToBeads(options, result);
          break;
        case 'beads-to-github':
          await this.syncBeadsToGithub(options, result);
          break;
        case 'bidirectional':
          await this.syncBidirectional(options, result);
          break;
      }

      // Get final cache stats
      const finalStats = await Promise.all([
        this.githubClient.getCacheStats(),
        this.beadsClient.getCacheStats(),
      ]);

      const finalHits = finalStats.reduce((sum, stats) => sum + stats.hits, 0);
      const finalMisses = finalStats.reduce(
        (sum, stats) => sum + stats.misses,
        0
      );

      result.cacheHits = finalHits - initialHits;
      result.cacheMisses = finalMisses - initialMisses;
      result.cacheHitRate =
        result.cacheHits + result.cacheMisses > 0
          ? (result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100
          : 0;

      result.success = result.errors.length === 0;

      // Cache sync result
      await this.cacheSyncResult(result);
    } catch (error) {
      result.success = false;
      result.errors.push({
        item: 'sync-engine',
        type: 'system-error',
        message: (error as Error).message,
      });
    }

    result.duration = performance.now() - startTime;

    return result;
  }

  // GitHub to Beads sync
  private async syncGithubToBeads(
    options: CachedSyncOptions,
    result: CachedSyncResult
  ): Promise<void> {
    const githubIssues = await this.getCachedGitHubIssues(options);
    const beadsIssues = await this.getCachedBeadsIssues();

    for (const githubIssue of githubIssues) {
      result.itemsProcessed++;

      const matchingBeadsIssue = beadsIssues.find(
        (issue) => issue.metadata?.githubId === githubIssue.id
      );

      if (matchingBeadsIssue) {
        // Update existing issue
        const updateData = this.mapGithubToBeads(
          githubIssue,
          matchingBeadsIssue
        );
        await this.beadsClient.updateIssue(matchingBeadsIssue.id, updateData);
        result.itemsUpdated++;
      } else {
        // Create new issue
        const createData = this.mapGithubToBeads(githubIssue);
        await this.beadsClient.createIssue(createData);
        result.itemsCreated++;
      }
    }

    // Invalidate Beads cache after sync
    await this.beadsClient.invalidateRepositoryCache();
  }

  // Beads to GitHub sync
  private async syncBeadsToGithub(
    options: CachedSyncOptions,
    result: CachedSyncResult
  ): Promise<void> {
    const beadsIssues = await this.getCachedBeadsIssues(options);
    const githubIssues = await this.getCachedGitHubIssues();

    for (const beadsIssue of beadsIssues) {
      result.itemsProcessed++;

      const githubId = beadsIssue.metadata?.githubId;
      const matchingGithubIssue = githubIssues.find(
        (issue) => issue.id === githubId
      );

      if (matchingGithubIssue) {
        // Update existing GitHub issue
        const updateData = this.mapBeadsToGithub(
          beadsIssue,
          matchingGithubIssue
        );
        await this.githubClient.updateIssue(
          matchingGithubIssue.number,
          updateData
        );
        result.itemsUpdated++;
      } else if (githubId) {
        // Create new GitHub issue if we have the ID but it doesn't exist
        const createData = this.mapBeadsToGithub(beadsIssue);
        const newIssue = await this.githubClient.createIssue(createData);

        // Update Beads issue with new GitHub ID
        await this.beadsClient.updateIssue(beadsIssue.id, {
          metadata: {
            ...beadsIssue.metadata,
            githubId: newIssue.id,
            githubNumber: newIssue.number,
          },
        });

        result.itemsCreated++;
      }
    }

    // Invalidate GitHub cache after sync
    await this.githubClient.invalidateRepositoryCache();
  }

  // Bidirectional sync
  private async syncBidirectional(
    options: CachedSyncOptions,
    result: CachedSyncResult
  ): Promise<void> {
    // First, sync GitHub to Beads
    await this.syncGithubToBeads(options, result);

    // Then, sync Beads to GitHub
    await this.syncBeadsToGithub(options, result);

    // Resolve any conflicts
    await this.resolveConflicts(result);
  }

  // Conflict resolution with caching
  private async resolveConflicts(result: CachedSyncResult): Promise<void> {
    const conflicts = await this.detectConflicts();

    for (const conflict of conflicts) {
      const resolution = await this.resolveSingleConflict(conflict);

      if (resolution) {
        result.conflictsResolved++;

        // Cache the resolution for future reference
        const cacheKey = `conflict:resolution:${conflict.id}`;
        await this.cache.set(cacheKey, resolution, 1800000); // 30 minutes
      }
    }
  }

  private async resolveSingleConflict(conflict: SyncConflict): Promise<any> {
    // Simple conflict resolution strategy - prefer newer data
    if (conflict.githubData && conflict.beadsData) {
      const githubUpdated = new Date(conflict.githubData.updated_at).getTime();
      const beadsUpdated = new Date(conflict.beadsData.updated_at).getTime();

      if (githubUpdated > beadsUpdated) {
        return { resolution: 'github-wins', data: conflict.githubData };
      } else {
        return { resolution: 'beads-wins', data: conflict.beadsData };
      }
    }

    return null;
  }

  // Conflict detection
  private async detectConflicts(): Promise<SyncConflict[]> {
    const cacheKey = `conflicts:detection:${this.syncId}`;

    return await this.cache.getCachedSyncResult(cacheKey, async () => {
      const githubIssues = await this.getCachedGitHubIssues();
      const beadsIssues = await this.getCachedBeadsIssues();
      const conflicts: SyncConflict[] = [];

      // Find data conflicts
      for (const githubIssue of githubIssues) {
        const matchingBeadsIssue = beadsIssues.find(
          (issue) => issue.metadata?.githubId === githubIssue.id
        );

        if (
          matchingBeadsIssue &&
          this.hasDataConflict(githubIssue, matchingBeadsIssue)
        ) {
          conflicts.push({
            id: `data-${githubIssue.id}`,
            type: 'data',
            source: 'github',
            githubData: githubIssue,
            beadsData: matchingBeadsIssue,
          });
        }
      }

      return conflicts;
    });
  }

  // Data mapping helpers
  private mapGithubToBeads(githubIssue: any, existingBeadsIssue?: any): any {
    return {
      title: githubIssue.title,
      body: githubIssue.body,
      status: githubIssue.state === 'closed' ? 'closed' : 'open',
      priority: this.mapPriority(githubIssue.labels),
      assignee: githubIssue.user?.login,
      tags: githubIssue.labels.map((label: any) => label.name),
      metadata: {
        githubId: githubIssue.id,
        githubNumber: githubIssue.number,
        githubUrl: githubIssue.html_url,
        githubLabels: githubIssue.labels,
        createdAt: githubIssue.created_at,
        updatedAt: githubIssue.updated_at,
        ...existingBeadsIssue?.metadata,
      },
      updated_at: new Date().toISOString(),
    };
  }

  private mapBeadsToGithub(beadsIssue: any, existingGithubIssue?: any): any {
    const update: any = {
      title: beadsIssue.title,
      body: beadsIssue.body,
    };

    if (
      beadsIssue.status === 'closed' &&
      existingGithubIssue?.state !== 'closed'
    ) {
      update.state = 'closed';
    } else if (
      beadsIssue.status === 'open' &&
      existingGithubIssue?.state === 'closed'
    ) {
      update.state = 'open';
    }

    if (
      beadsIssue.assignee &&
      beadsIssue.assignee !== existingGithubIssue?.assignee?.login
    ) {
      update.assignees = [beadsIssue.assignee];
    }

    const mappedLabels = this.mapTagsToLabels(beadsIssue.tags);
    if (mappedLabels.length > 0) {
      update.labels = mappedLabels;
    }

    return update;
  }

  private mapPriority(labels: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const priorityLabels = labels
      .map((label: any) => label.name.toLowerCase())
      .filter((name) => name.includes('priority') || name.includes('urgent'));

    if (
      priorityLabels.some(
        (name) => name.includes('critical') || name.includes('urgent')
      )
    ) {
      return 'critical';
    } else if (priorityLabels.some((name) => name.includes('high'))) {
      return 'high';
    } else if (priorityLabels.some((name) => name.includes('medium'))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private mapTagsToLabels(tags: string[]): string[] {
    return tags.filter((tag) => !tag.includes('priority-'));
  }

  private hasDataConflict(githubIssue: any, beadsIssue: any): boolean {
    const timeout = 5 * 60 * 1000; // 5 minutes
    const githubUpdated = new Date(githubIssue.updated_at).getTime();
    const beadsUpdated = new Date(beadsIssue.updated_at).getTime();

    // If both updated within the last 5 minutes, potential conflict
    if (
      Date.now() - githubUpdated < timeout &&
      Date.now() - beadsUpdated < timeout
    ) {
      return (
        githubIssue.title !== beadsIssue.title ||
        githubIssue.body !== beadsIssue.body ||
        githubIssue.assignee?.login !== beadsIssue.assignee
      );
    }

    return false;
  }

  // Cached data retrieval
  private async getCachedGitHubIssues(
    options?: CachedSyncOptions
  ): Promise<any[]> {
    const filterOptions: any = {
      state:
        (options?.filters?.status?.[0] as 'open' | 'closed' | 'all') || 'open',
      per_page: options?.batchSize || 100,
    };

    if (options?.filters?.labels) {
      filterOptions.labels = options.filters.labels;
    }

    if (options?.since) {
      // Since filter - less cacheable
      return await this.githubClient.getIssues(filterOptions);
    } else {
      // Standard query - highly cacheable
      return await this.githubClient.getIssues(filterOptions);
    }
  }

  private async getCachedBeadsIssues(
    options?: CachedSyncOptions
  ): Promise<any[]> {
    const filterOptions: any = {
      limit: options?.batchSize || 100,
    };

    if (options?.filters?.status?.[0]) {
      filterOptions.status = options.filters.status[0];
    }
    if (options?.filters?.assignee) {
      filterOptions.assignee = options.filters.assignee;
    }
    if (options?.filters?.labels) {
      filterOptions.tags = options.filters.labels;
    }

    return await this.beadsClient.getIssues(filterOptions);
  }

  // Cache management
  private async cacheSyncResult(result: CachedSyncResult): Promise<void> {
    await this.beadsClient.createSyncResult({
      source: 'github', // Use valid enum value
      target: 'beads', // Use valid enum value
      status: result.success ? 'completed' : 'failed',
      items_processed: result.itemsProcessed,
      items_created: result.itemsCreated,
      items_updated: result.itemsUpdated,
      items_deleted: result.itemsDeleted,
      conflicts_resolved: result.conflictsResolved,
      errors: result.errors.map((err) => ({
        item_id: err.item,
        error: err.type,
        details: err.message,
      })),
    });
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    githubApiCalls: number;
    githubCacheHitRate: number;
    beadsApiCalls: number;
    beadsCacheHitRate: number;
    syncPerformance: Array<{
      direction: string;
      duration: number;
      itemsProcessed: number;
      cacheHitRate: number;
    }>;
  }> {
    const [githubStats, beadsStats] = await Promise.all([
      this.githubClient.getCacheStats(),
      this.beadsClient.getCacheStats(),
    ]);

    const recentSyncs = await this.beadsClient.getSyncHistory({
      limit: 10,
    });

    return {
      githubApiCalls: githubStats.misses,
      githubCacheHitRate: githubStats.hitRate,
      beadsApiCalls: beadsStats.misses,
      beadsCacheHitRate: beadsStats.hitRate,
      syncPerformance: recentSyncs.map((sync) => ({
        direction: 'unknown', // metadata not available in BeadsSyncResult
        duration:
          sync.completed_at && sync.started_at
            ? new Date(sync.completed_at).getTime() -
              new Date(sync.started_at).getTime()
            : 0,
        itemsProcessed: sync.items_processed,
        cacheHitRate: 0, // metadata not available in BeadsSyncResult
      })),
    };
  }

  // Cache warming for better performance
  async warmCache(): Promise<void> {
    await Promise.all([
      this.githubClient.warmCache(),
      this.beadsClient.warmCache(),
    ]);
  }

  // Cache management
  async clearAllCaches(): Promise<void> {
    await Promise.all([
      this.githubClient.clearCache(),
      this.beadsClient.clearCache(),
      this.cache.clear(),
    ]);
  }

  async exportCache(filePath: string): Promise<void> {
    await Promise.all([
      this.githubClient.exportCache(`${filePath}.github`),
      this.beadsClient.exportCache(`${filePath}.beads`),
      this.cache.exportCache(`${filePath}.sync`),
    ]);
  }

  async importCache(filePath: string): Promise<void> {
    await Promise.all([
      this.githubClient.importCache(`${filePath}.github`),
      this.beadsClient.importCache(`${filePath}.beads`),
      this.cache.importCache(`${filePath}.sync`),
    ]);
  }

  // Utility methods
  private generateSyncId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Background cleanup
  async cleanupExpiredCaches(): Promise<void> {
    await Promise.all([
      this.githubClient.warmCache().then(() => this.cache.cleanupExpired()),
      this.beadsClient.warmCache().then(() => this.cache.cleanupExpired()),
    ]);
  }
}

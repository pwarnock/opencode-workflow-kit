/**
 * Provider-Agnostic Sync Engine
 *
 * A new sync engine that works with any IssueSourceProvider,
 * not just GitHub. This is the preferred engine for new code.
 */

import chalk from 'chalk';
import type {
  SyncOptions,
  SyncResult,
  SyncConflict,
  CodyBeadsConfig,
  BeadsClient,
  BeadsIssue,
  ConflictResolutionStrategy,
} from '../types/index.js';
import { resolveIssueSourceConfig } from '../types/index.js';
import type {
  IssueSourceProvider,
  NormalizedIssue,
} from '../providers/types.js';
import { createProvider } from '../providers/factory.js';
import { ConflictResolver } from './conflict-resolver.js';

/**
 * Provider-agnostic synchronization engine
 *
 * Unlike the original SyncEngine which was GitHub-specific,
 * this engine works with any IssueSourceProvider implementation.
 */
export class ProviderSyncEngine {
  private conflictResolver: ConflictResolver;
  private issueProvider: IssueSourceProvider | null;

  constructor(
    private config: CodyBeadsConfig,
    private beadsClient: BeadsClient,
    issueProvider?: IssueSourceProvider | null
  ) {
    this.conflictResolver = new ConflictResolver();

    // Use provided provider or create from config
    if (issueProvider !== undefined) {
      this.issueProvider = issueProvider;
    } else {
      const sourceConfig = resolveIssueSourceConfig(config);
      this.issueProvider = sourceConfig ? createProvider(sourceConfig) : null;
    }
  }

  /**
   * Check if an issue source is configured
   */
  hasIssueSource(): boolean {
    return this.issueProvider !== null;
  }

  /**
   * Get the provider type name
   */
  getProviderName(): string {
    return this.issueProvider?.name || 'None';
  }

  async executeSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(chalk.blue(`🔄 Starting sync (${options.direction})...`));

      // Check if we have an issue source for external sync
      if (!this.issueProvider && options.direction !== 'beads-to-cody') {
        console.log(chalk.yellow('⚠️  No issue source configured. Running Beads-only mode.'));
        return {
          success: true,
          issuesSynced: 0,
          prsSynced: 0,
          conflicts: [],
          errors: [],
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      // Fetch current state
      console.log(chalk.gray('📥 Fetching current state...'));
      const [sourceIssues, sourcePRs, beadsIssues] = await Promise.all([
        this.issueProvider?.getIssues(
          options.since ? { since: options.since } : {}
        ) ?? Promise.resolve([]),
        this.issueProvider?.getPullRequests(
          options.since ? { since: options.since } : {}
        ) ?? Promise.resolve([]),
        this.config.beads.projectPath
          ? this.beadsClient.getIssues(
              this.config.beads.projectPath,
              options.since ? { since: options.since } : {}
            )
          : Promise.resolve([]),
      ]);

      const providerName = this.issueProvider?.name || 'External';
      console.log(chalk.gray(`  ${providerName} Issues: ${sourceIssues.length}`));
      console.log(chalk.gray(`  ${providerName} PRs: ${sourcePRs.length}`));
      console.log(chalk.gray(`  Beads Issues: ${beadsIssues.length}`));

      // Detect conflicts if not forcing
      let conflicts: SyncConflict[] = [];
      if (!options.force) {
        console.log(chalk.gray('🔍 Detecting conflicts...'));
        conflicts = await this.detectConflicts(sourceIssues, beadsIssues);
        if (conflicts.length > 0) {
          console.log(
            chalk.yellow(`⚠️  Found ${conflicts.length} potential conflicts`)
          );
        }
      }

      // Execute sync based on direction
      let issuesSynced = 0;
      let prsSynced = 0;
      const errors: string[] = [];

      if (options.dryRun) {
        console.log(
          chalk.yellow('\n🔍 DRY RUN - Showing what would be synced:')
        );

        const dryRunResults = this.calculateDryRunResults(
          sourceIssues,
          sourcePRs,
          beadsIssues,
          options
        );
        console.log(dryRunResults);

        return {
          success: true,
          issuesSynced: 0,
          prsSynced: 0,
          conflicts,
          errors,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      // Actual sync execution
      switch (options.direction) {
        case 'cody-to-beads':
          const sourceToBeadsResult = await this.syncSourceToBeads(
            sourceIssues,
            beadsIssues
          );
          issuesSynced = sourceToBeadsResult.issuesSynced;
          errors.push(...sourceToBeadsResult.errors);

          const prsToBeadsResult = await this.syncSourceToBeads(
            sourcePRs,
            beadsIssues
          );
          prsSynced = prsToBeadsResult.issuesSynced;
          errors.push(...prsToBeadsResult.errors);
          break;

        case 'beads-to-cody':
          const beadsToSourceResult = await this.syncBeadsToSource(
            beadsIssues,
            sourceIssues
          );
          issuesSynced = beadsToSourceResult.issuesSynced;
          errors.push(...beadsToSourceResult.errors);
          break;

        case 'bidirectional':
          const bidirectionalResults = await this.syncBidirectional(
            sourceIssues,
            sourcePRs,
            beadsIssues,
            conflicts
          );
          issuesSynced = bidirectionalResults.issuesSynced;
          prsSynced = bidirectionalResults.prsSynced;
          errors.push(...bidirectionalResults.errors);
          break;
      }

      return {
        success: errors.length === 0,
        issuesSynced,
        prsSynced,
        conflicts,
        errors,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        issuesSynced: 0,
        prsSynced: 0,
        conflicts: [],
        errors: [
          `Sync failed: ${error instanceof Error ? error.message : error}`,
        ],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  async detectConflicts(
    sourceIssues?: NormalizedIssue[],
    beadsIssues?: BeadsIssue[]
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    if (!this.config.beads.projectPath) {
      return conflicts;
    }

    try {
      // Fetch issues if not provided
      const [source, beads] = await Promise.all([
        sourceIssues ?? this.issueProvider?.getIssues() ?? [],
        beadsIssues ?? this.beadsClient.getIssues(this.config.beads.projectPath),
      ]);

      // Detect conflicts based on update timestamps
      for (const srcIssue of source) {
        const beadsIssue = beads.find(
          (bi) =>
            bi.metadata?.sourceIssueKey === srcIssue.key ||
            bi.metadata?.githubIssueNumber === parseInt(srcIssue.key, 10) ||
            bi.title.toLowerCase() === srcIssue.title.toLowerCase()
        );

        if (beadsIssue) {
          const srcUpdated = new Date(srcIssue.updatedAt);
          const beadsUpdated = new Date(beadsIssue.updated_at);

          const timeDiff = Math.abs(
            srcUpdated.getTime() - beadsUpdated.getTime()
          );
          const oneHour = 60 * 60 * 1000;

          if (timeDiff < oneHour && this.contentDiffers(srcIssue, beadsIssue)) {
            conflicts.push({
              type: 'issue',
              itemId: `#${srcIssue.key} / ${beadsIssue.id}`,
              itemType: 'Issue',
              message: 'Both systems updated recently - potential conflict',
              codyData: srcIssue,
              beadsData: beadsIssue,
              resolution: this.config.sync.conflictResolution,
            });
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Conflict detection failed: ${error}`));
    }

    return conflicts;
  }

  async resolveConflict(
    conflict: SyncConflict,
    resolution: ConflictResolutionStrategy
  ): Promise<void> {
    console.log(
      chalk.blue(
        `🔧 Resolving conflict for ${conflict.itemId} using ${resolution}`
      )
    );

    const result = await this.conflictResolver.resolve(conflict, resolution);

    if (!result.success) {
      console.log(chalk.yellow(`⚠️  ${result.error || 'Resolution failed'}`));
      return;
    }

    switch (result.action) {
      case 'cody-wins':
        if (this.config.beads.projectPath && conflict.beadsData) {
          await this.updateBeadsWithSourceData(conflict);
        }
        break;

      case 'beads-wins':
        if (conflict.codyData && this.issueProvider) {
          await this.updateSourceWithBeadsData(conflict);
        }
        break;

      case 'merge':
        await this.applyMergedData(conflict, result.data);
        break;

      case 'timestamp':
        await this.autoMergeConflict(conflict);
        break;

      case 'manual':
        console.log(
          chalk.yellow('⚠️  Manual resolution required. Skipping this item.')
        );
        break;

      case 'skip':
        console.log(chalk.gray('⏭️  Skipping conflict resolution'));
        break;
    }
  }

  private async syncSourceToBeads(
    sourceIssues: NormalizedIssue[],
    beadsIssues: BeadsIssue[]
  ): Promise<{ issuesSynced: number; errors: string[] }> {
    if (!this.config.beads.projectPath) {
      return { issuesSynced: 0, errors: ['Beads project not configured'] };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const srcIssue of sourceIssues) {
      try {
        // Check if already synced
        const exists = beadsIssues.find(
          (bi) =>
            bi.metadata?.sourceIssueKey === srcIssue.key ||
            bi.metadata?.githubIssueNumber === parseInt(srcIssue.key, 10)
        );

        if (!exists) {
          const beadsIssue = this.convertSourceIssueToBeads(srcIssue);
          await this.withRetry(
            () =>
              this.beadsClient.createIssue(
                this.config.beads.projectPath!,
                beadsIssue
              ),
            `sync-source-to-beads-${srcIssue.key}`,
            3,
            500
          );
          synced++;
        }
      } catch (error) {
        errors.push(`Failed to sync issue #${srcIssue.key}: ${error}`);
      }
    }

    return { issuesSynced: synced, errors };
  }

  private async syncBeadsToSource(
    beadsIssues: BeadsIssue[],
    sourceIssues: NormalizedIssue[]
  ): Promise<{ issuesSynced: number; errors: string[] }> {
    if (!this.issueProvider) {
      return { issuesSynced: 0, errors: ['No issue source configured'] };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const beadsIssue of beadsIssues) {
      try {
        // Check if already synced
        const exists = sourceIssues.find(
          (src) =>
            src.key === beadsIssue.metadata?.sourceIssueKey ||
            parseInt(src.key, 10) === beadsIssue.metadata?.githubIssueNumber
        );

        if (!exists) {
          const sourceIssue = this.convertBeadsIssueToSource(beadsIssue);
          await this.withRetry(
            () => this.issueProvider!.createIssue(sourceIssue),
            `sync-beads-to-source-${beadsIssue.id}`,
            3,
            500
          );
          synced++;
        }
      } catch (error) {
        errors.push(`Failed to sync Beads issue ${beadsIssue.id}: ${error}`);
      }
    }

    return { issuesSynced: synced, errors };
  }

  private async syncBidirectional(
    sourceIssues: NormalizedIssue[],
    sourcePRs: NormalizedIssue[],
    beadsIssues: BeadsIssue[],
    conflicts: SyncConflict[]
  ): Promise<{ issuesSynced: number; prsSynced: number; errors: string[] }> {
    console.log(chalk.blue('🔄 Executing bidirectional sync...'));

    const errors: string[] = [];
    let issuesSynced = 0;
    let prsSynced = 0;

    // Resolve conflicts first
    for (const conflict of conflicts) {
      try {
        await this.resolveConflict(conflict, this.config.sync.conflictResolution);
      } catch (error) {
        errors.push(
          `Failed to resolve conflict for ${conflict.itemId}: ${error}`
        );
      }
    }

    // Sync issues from source to Beads
    const sourceToBeads = await this.syncSourceToBeads(sourceIssues, beadsIssues);
    issuesSynced += sourceToBeads.issuesSynced;
    errors.push(...sourceToBeads.errors);

    // Sync issues from Beads to source
    const beadsToSource = await this.syncBeadsToSource(beadsIssues, sourceIssues);
    issuesSynced += beadsToSource.issuesSynced;
    errors.push(...beadsToSource.errors);

    // Sync PRs from source to Beads
    const prsToBeads = await this.syncSourceToBeads(sourcePRs, beadsIssues);
    prsSynced += prsToBeads.issuesSynced;
    errors.push(...prsToBeads.errors);

    return { issuesSynced, prsSynced, errors };
  }

  private convertSourceIssueToBeads(srcIssue: NormalizedIssue): Partial<BeadsIssue> {
    return {
      title: srcIssue.title,
      description: srcIssue.body || '',
      status: srcIssue.state === 'open' ? 'open' : 'closed',
      assignee: srcIssue.assignees[0],
      labels: srcIssue.labels,
      metadata: {
        sourceIssueKey: srcIssue.key,
        sourceUrl: srcIssue.url,
        sourceId: srcIssue.id,
        sourceProvider: this.issueProvider?.type,
        // Legacy compatibility
        githubIssueNumber: parseInt(srcIssue.key, 10) || undefined,
        githubUrl: srcIssue.url,
        githubId: srcIssue.id,
        syncedAt: new Date().toISOString(),
      },
    };
  }

  private convertBeadsIssueToSource(beadsIssue: BeadsIssue): {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  } {
    const result: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    } = {
      title: beadsIssue.title,
    };

    if (beadsIssue.description) {
      result.body = beadsIssue.description;
    }
    if (beadsIssue.labels && beadsIssue.labels.length > 0) {
      result.labels = beadsIssue.labels;
    }
    if (beadsIssue.assignee) {
      result.assignees = [beadsIssue.assignee];
    }

    return result;
  }

  private contentDiffers(
    srcIssue: NormalizedIssue,
    beadsIssue: BeadsIssue
  ): boolean {
    return (
      srcIssue.title !== beadsIssue.title ||
      (srcIssue.body || '') !== beadsIssue.description
    );
  }

  private calculateDryRunResults(
    sourceIssues: NormalizedIssue[],
    sourcePRs: NormalizedIssue[],
    beadsIssues: BeadsIssue[],
    options: SyncOptions
  ): string {
    let results = '';
    const providerName = this.issueProvider?.name || 'Source';

    const syncedKeys = new Set(
      beadsIssues
        .map((bi) => bi.metadata?.sourceIssueKey || bi.metadata?.githubIssueNumber?.toString())
        .filter(Boolean)
    );

    const newIssuesForBeads = sourceIssues.filter(
      (src) => !syncedKeys.has(src.key)
    );

    const newPRsForBeads = sourcePRs.filter(
      (src) => !syncedKeys.has(src.key)
    );

    switch (options.direction) {
      case 'cody-to-beads':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        break;
      case 'beads-to-cody':
        const newIssuesForSource = beadsIssues.filter(
          (bi) => !bi.metadata?.sourceIssueKey && !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to ${providerName}: ${newIssuesForSource.length}\n`;
        break;
      case 'bidirectional':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        const newIssuesForSourceFromBeads = beadsIssues.filter(
          (bi) => !bi.metadata?.sourceIssueKey && !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to ${providerName}: ${newIssuesForSourceFromBeads.length}\n`;
        break;
    }

    return results;
  }

  private async updateBeadsWithSourceData(conflict: SyncConflict): Promise<void> {
    if (!this.config.beads.projectPath || !conflict.beadsData?.id) {
      throw new Error('Beads project path or issue ID not available');
    }

    const srcIssue = conflict.codyData as NormalizedIssue;
    const updateData = this.convertSourceIssueToBeads(srcIssue);

    await this.beadsClient.updateIssue(
      this.config.beads.projectPath,
      conflict.beadsData.id,
      updateData
    );

    console.log(
      chalk.green(`✅ Updated Beads with source data for ${conflict.itemId}`)
    );
  }

  private async updateSourceWithBeadsData(conflict: SyncConflict): Promise<void> {
    if (!this.issueProvider) {
      throw new Error('No issue source configured');
    }

    const srcIssue = conflict.codyData as NormalizedIssue;
    const updateData = {
      title: conflict.beadsData.title,
      body: conflict.beadsData.description,
      state: conflict.beadsData.status === 'open' ? 'open' as const : 'closed' as const,
    };

    await this.issueProvider.updateIssue(srcIssue.key, updateData);

    console.log(
      chalk.green(`✅ Updated source with Beads data for ${conflict.itemId}`)
    );
  }

  private async applyMergedData(
    conflict: SyncConflict,
    mergedData: any
  ): Promise<void> {
    if (this.config.beads.projectPath && conflict.beadsData?.id) {
      await this.beadsClient.updateIssue(
        this.config.beads.projectPath,
        conflict.beadsData.id,
        {
          ...conflict.beadsData,
          ...mergedData,
          metadata: {
            ...conflict.beadsData.metadata,
            mergedAt: new Date().toISOString(),
            mergeStrategy: 'merge',
          },
        }
      );
      console.log(chalk.gray(`  Updated Beads with merged data`));
    }

    if (this.issueProvider && conflict.codyData) {
      const srcIssue = conflict.codyData as NormalizedIssue;
      await this.issueProvider.updateIssue(srcIssue.key, mergedData);
      console.log(chalk.gray(`  Updated source with merged data`));
    }
  }

  private async autoMergeConflict(conflict: SyncConflict): Promise<void> {
    if (!conflict.codyData || !conflict.beadsData) {
      console.log(
        chalk.yellow('⚠️  Cannot auto-merge - missing data in one system')
      );
      return;
    }

    try {
      const srcIssue = conflict.codyData as NormalizedIssue;
      const mergedTitle = srcIssue.title || conflict.beadsData.title;
      const mergedDescription = this.mergeDescriptions(
        srcIssue.body || '',
        conflict.beadsData.description || ''
      );

      // Update both systems
      if (this.config.beads.projectPath && conflict.beadsData.id) {
        await this.beadsClient.updateIssue(
          this.config.beads.projectPath,
          conflict.beadsData.id,
          {
            ...conflict.beadsData,
            title: mergedTitle,
            description: mergedDescription,
            metadata: {
              ...conflict.beadsData.metadata,
              mergedAt: new Date().toISOString(),
              mergeStrategy: 'auto-merge',
            },
          }
        );
      }

      if (this.issueProvider && srcIssue.key) {
        await this.issueProvider.updateIssue(srcIssue.key, {
          title: mergedTitle,
          body: mergedDescription,
        });
      }

      console.log(
        chalk.green(`✅ Auto-merged conflict for ${conflict.itemId}`)
      );
    } catch (error) {
      console.error(
        chalk.red(`❌ Auto-merge failed for ${conflict.itemId}: ${error}`)
      );
      throw error;
    }
  }

  private mergeDescriptions(srcDesc: string, beadsDesc: string): string {
    if (srcDesc === beadsDesc) return srcDesc;

    return (
      `=== AUTO-MERGED CONTENT ===\n\n` +
      `## Source Content:\n${srcDesc}\n\n` +
      `## Beads Content:\n${beadsDesc}\n\n` +
      `=== END MERGE ===`
    );
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        retryCount++;

        console.log(
          chalk.red(
            `❌ Attempt ${retryCount} failed for ${operationName}: ${error}`
          )
        );

        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(chalk.yellow(`🕒 Retrying in ${delay}ms...`));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.log(
      chalk.red(`❌ All ${maxRetries} attempts failed for ${operationName}`)
    );
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async getSyncStatus(): Promise<{
    healthy: boolean;
    issueSourceAvailable: boolean;
    beadsAvailable: boolean;
    providerName: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    let issueSourceAvailable = false;
    let beadsAvailable = false;

    if (this.issueProvider) {
      try {
        issueSourceAvailable = await this.issueProvider.healthCheck();
      } catch (e) {
        errors.push(`Issue source health check failed: ${e}`);
      }
    }

    try {
      beadsAvailable = await this.beadsClient.isAvailable();
    } catch (e) {
      errors.push(`Beads health check failed: ${e}`);
    }

    return {
      healthy: errors.length === 0 && (issueSourceAvailable || !this.issueProvider) && beadsAvailable,
      issueSourceAvailable,
      beadsAvailable,
      providerName: this.getProviderName(),
      errors,
    };
  }
}

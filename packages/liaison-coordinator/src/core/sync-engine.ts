import {
  SyncOptions,
  SyncResult,
  SyncConflict,
  CodyBeadsConfig,
  GitHubIssue,
  GitHubClient,
  BeadsClient,
  BeadsIssue,
} from '../types/index.js';
import chalk from 'chalk';
import { ConflictResolver } from './conflict-resolver.js';

/**
 * Core synchronization engine for Cody-Beads integration
 */
export class SyncEngine {
  private conflictResolver: ConflictResolver;

  constructor(
    private config: CodyBeadsConfig,
    private githubClient: GitHubClient,
    private beadsClient: BeadsClient
  ) {
    this.conflictResolver = new ConflictResolver();
  }

  async executeSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(chalk.blue(`🔄 Starting sync (${options.direction})...`));

      // Step 1: Fetch current state from both systems
      console.log(chalk.gray('📥 Fetching current state...'));
      const [githubIssues, githubPRs, beadsIssues] = await Promise.all([
        this.githubClient.getIssues(
          this.config.github.owner,
          this.config.github.repo,
          options.since ? { since: options.since } : {}
        ),
        this.githubClient.getPullRequests(
          this.config.github.owner,
          this.config.github.repo,
          options.since ? { since: options.since } : {}
        ),
        this.config.beads.projectPath
          ? this.beadsClient.getIssues(
              this.config.beads.projectPath,
              options.since ? { since: options.since } : {}
            )
          : Promise.resolve([]),
      ]);

      console.log(chalk.gray(`  GitHub Issues: ${githubIssues.length}`));
      console.log(chalk.gray(`  GitHub PRs: ${githubPRs.length}`));
      console.log(chalk.gray(`  Beads Issues: ${beadsIssues.length}`));

      // Step 2: Detect conflicts if not forcing
      let conflicts: SyncConflict[] = [];
      if (!options.force) {
        console.log(chalk.gray('🔍 Detecting conflicts...'));
        conflicts = await this.detectConflicts();
        if (conflicts.length > 0) {
          console.log(
            chalk.yellow(`⚠️  Found ${conflicts.length} potential conflicts`)
          );
        }
      }

      // Step 3: Execute sync based on direction
      let issuesSynced = 0;
      let prsSynced = 0;
      const errors: string[] = [];

      if (options.dryRun) {
        console.log(
          chalk.yellow('\n🔍 DRY RUN - Showing what would be synced:')
        );

        // Show what would be synced without executing
        const dryRunResults = this.calculateDryRunResults(
          githubIssues,
          githubPRs,
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
          const codyToBeadsResult = await this.syncCodyToBeads(
            githubIssues,
            beadsIssues
          );
          issuesSynced = codyToBeadsResult.issuesSynced;
          errors.push(...codyToBeadsResult.errors);

          const prsToBeadsResult = await this.syncCodyToBeads(
            githubPRs,
            beadsIssues
          );
          prsSynced = prsToBeadsResult.issuesSynced;
          errors.push(...prsToBeadsResult.errors);
          break;

        case 'beads-to-cody':
          const beadsToCodyResult = await this.syncBeadsToCody(
            beadsIssues,
            githubIssues
          );
          issuesSynced = beadsToCodyResult.issuesSynced;
          errors.push(...beadsToCodyResult.errors);
          break;

        case 'bidirectional':
          // Sync both ways, handling conflicts appropriately
          const bidirectionalResults = await this.syncBidirectional(
            githubIssues,
            githubPRs,
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

  async detectConflicts(): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    if (!this.config.cody.projectId || !this.config.beads.projectPath) {
      return conflicts; // Cannot detect conflicts without both projects configured
    }

    try {
      // Get issues from both systems
      const [githubIssues, beadsIssues] = await Promise.all([
        this.githubClient.getIssues(
          this.config.github.owner,
          this.config.github.repo
        ),
        this.beadsClient.getIssues(this.config.beads.projectPath),
      ]);

      // Detect conflicts based on update timestamps
      for (const ghIssue of githubIssues) {
        const beadsIssue = beadsIssues.find(
          (bi) =>
            bi.metadata?.githubIssueNumber === ghIssue.number ||
            bi.title.toLowerCase() === ghIssue.title.toLowerCase()
        );

        if (beadsIssue) {
          const ghUpdated = new Date(ghIssue.updated_at);
          const beadsUpdated = new Date(beadsIssue.updated_at);

          // If both updated within last hour and content differs, flag as potential conflict
          const timeDiff = Math.abs(
            ghUpdated.getTime() - beadsUpdated.getTime()
          );
          const oneHour = 60 * 60 * 1000;

          if (timeDiff < oneHour && this.contentDiffers(ghIssue, beadsIssue)) {
            conflicts.push({
              type: 'issue',
              itemId: `#${ghIssue.number} / ${beadsIssue.id}`,
              itemType: 'Issue',
              message: 'Both systems updated recently - potential conflict',
              codyData: ghIssue,
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
    resolution: string
  ): Promise<void> {
    console.log(
      chalk.blue(
        `🔧 Resolving conflict for ${conflict.itemId} using ${resolution}`
      )
    );

    const result = await this.conflictResolver.resolve(
      conflict,
      resolution as any
    );

    if (!result.success) {
      console.log(chalk.yellow(`⚠️  ${result.error || 'Resolution failed'}`));
      return;
    }

    // Apply the resolution
    switch (result.action) {
      case 'cody-wins':
        if (this.config.beads.projectPath && conflict.beadsData) {
          await this.updateBeadsWithCodyData(conflict);
        }
        break;

      case 'beads-wins':
        if (conflict.codyData) {
          await this.updateCodyWithBeadsData(conflict);
        }
        break;

      case 'merge':
        await this.applyMergedData(conflict, result.data);
        break;

      case 'timestamp':
        await this.autoMergeConflict(conflict);
        break;

      case 'priority':
        await this.priorityBasedResolution(conflict);
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

  private async applyMergedData(
    conflict: SyncConflict,
    mergedData: any
  ): Promise<void> {
    // Apply merged data to both systems
    if (this.config.beads.projectPath && conflict.beadsData) {
      await this.updateBeadsWithData(conflict, mergedData);
    }
    if (conflict.codyData) {
      await this.updateCodyWithData(conflict, mergedData);
    }
  }

  private async updateBeadsWithData(
    conflict: SyncConflict,
    data: any
  ): Promise<void> {
    if (!this.config.beads.projectPath || !conflict.beadsData?.id) {
      return;
    }

    const mergedBeadsIssue = {
      ...conflict.beadsData,
      ...data,
      metadata: {
        ...conflict.beadsData.metadata,
        mergedAt: new Date().toISOString(),
        mergeStrategy: 'merge',
      },
    };

    await this.beadsClient.updateIssue(
      this.config.beads.projectPath,
      conflict.beadsData.id,
      mergedBeadsIssue
    );
    console.log(chalk.gray(`  Updated Beads with merged data`));
  }

  private async updateCodyWithData(
    conflict: SyncConflict,
    data: any
  ): Promise<void> {
    if (!conflict.codyData?.number) {
      return;
    }

    const mergedCodyIssue = {
      ...conflict.codyData,
      ...data,
    };

    await this.githubClient.updateIssue(
      this.config.github.owner,
      this.config.github.repo,
      conflict.codyData.number,
      mergedCodyIssue
    );
    console.log(chalk.gray(`  Updated Cody with merged data`));
  }

  /**
   * Auto-merge conflict resolution strategy
   */
  private async autoMergeConflict(conflict: SyncConflict): Promise<void> {
    if (!conflict.codyData || !conflict.beadsData) {
      console.log(
        chalk.yellow('⚠️  Cannot auto-merge - missing data in one system')
      );
      return;
    }

    try {
      // Create merged content
      const mergedTitle = conflict.codyData.title || conflict.beadsData.title;
      const mergedDescription = this.mergeDescriptions(
        conflict.codyData.body || '',
        conflict.beadsData.description || ''
      );

      // Update both systems with merged data
      if (this.config.beads.projectPath && conflict.beadsData.id) {
        const mergedBeadsIssue = {
          ...conflict.beadsData,
          title: mergedTitle,
          description: mergedDescription,
          metadata: {
            ...conflict.beadsData.metadata,
            mergedAt: new Date().toISOString(),
            mergeStrategy: 'auto-merge',
          },
        };
        await this.beadsClient.updateIssue(
          this.config.beads.projectPath,
          conflict.beadsData.id,
          mergedBeadsIssue
        );
      }

      if (conflict.codyData.number) {
        const mergedCodyIssue = {
          ...conflict.codyData,
          title: mergedTitle,
          body: mergedDescription,
        };
        await this.githubClient.updateIssue(
          this.config.github.owner,
          this.config.github.repo,
          conflict.codyData.number,
          mergedCodyIssue
        );
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

  /**
   * Priority-based conflict resolution strategy
   */
  private async priorityBasedResolution(conflict: SyncConflict): Promise<void> {
    // Determine which system has priority based on configuration or metadata
    const codyPriority = conflict.codyData?.labels?.some((label: any) =>
      ['priority:high', 'priority:critical', 'blocker'].includes(
        label.name?.toLowerCase()
      )
    )
      ? 1
      : 0;

    const beadsPriority = conflict.beadsData?.labels?.some((label: string) =>
      ['priority:high', 'priority:critical', 'blocker'].includes(
        label.toLowerCase()
      )
    )
      ? 1
      : 0;

    if (codyPriority > beadsPriority) {
      // Cody has higher priority
      if (this.config.beads.projectPath && conflict.beadsData?.id) {
        await this.updateBeadsWithCodyData(conflict);
      }
    } else if (beadsPriority > codyPriority) {
      // Beads has higher priority
      if (conflict.codyData?.number) {
        await this.updateCodyWithBeadsData(conflict);
      }
    } else {
      // Equal priority - fall back to timestamp
      const codyTime = new Date(conflict.codyData?.updated_at || 0);
      const beadsTime = new Date(conflict.beadsData?.updated_at || 0);

      if (codyTime > beadsTime) {
        await this.updateBeadsWithCodyData(conflict);
      } else {
        await this.updateCodyWithBeadsData(conflict);
      }
    }
  }

  /**
   * Merge descriptions from both systems
   */
  private mergeDescriptions(codyDesc: string, beadsDesc: string): string {
    if (codyDesc === beadsDesc) return codyDesc;

    return (
      `=== AUTO-MERGED CONTENT ===\n\n` +
      `## Cody Content:\n${codyDesc}\n\n` +
      `## Beads Content:\n${beadsDesc}\n\n` +
      `=== END MERGE ===`
    );
  }

  private async syncCodyToBeads(
    codyIssues: GitHubIssue[],
    beadsIssues: BeadsIssue[]
  ): Promise<{ issuesSynced: number; errors: string[] }> {
    if (!this.config.beads.projectPath) {
      return { issuesSynced: 0, errors: ['Beads project not configured'] };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const codyIssue of codyIssues) {
      try {
        // Check if already synced
        const exists = beadsIssues.find(
          (bi) => bi.metadata?.githubIssueNumber === codyIssue.number
        );

        if (!exists) {
          try {
            const beadsIssue = this.convertCodyIssueToBeads(codyIssue);
            await this.withRetry(
              () =>
                this.beadsClient.createIssue(
                  this.config.beads.projectPath!,
                  beadsIssue
                ),
              `sync-cody-to-beads-${codyIssue.number}`,
              3,
              500
            );
            synced++;
          } catch (error) {
            errors.push(`Failed to sync issue #${codyIssue.number}: ${error}`);
          }
        }
      } catch (error) {
        errors.push(`Failed to sync issue #${codyIssue.number}: ${error}`);
      }
    }

    return { issuesSynced: synced, errors };
  }

  private async syncBeadsToCody(
    beadsIssues: BeadsIssue[],
    codyIssues: GitHubIssue[]
  ): Promise<{ issuesSynced: number; errors: string[] }> {
    if (!this.config.cody.projectId) {
      return { issuesSynced: 0, errors: ['Cody project not configured'] };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const beadsIssue of beadsIssues) {
      try {
        // Check if already synced
        const exists = codyIssues.find(
          (gh) => gh.number === beadsIssue.metadata?.githubIssueNumber
        );

        if (!exists) {
          const githubIssue = this.convertBeadsIssueToCody(beadsIssue);
          await this.withRetry(
            () =>
              this.githubClient.createIssue(
                this.config.github.owner,
                this.config.github.repo,
                githubIssue
              ),
            `sync-beads-to-cody-${beadsIssue.id}`,
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
    githubIssues: GitHubIssue[],
    githubPRs: GitHubIssue[],
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
        await this.resolveConflict(
          conflict,
          this.config.sync.conflictResolution
        );
      } catch (error) {
        errors.push(
          `Failed to resolve conflict for ${conflict.itemId}: ${error}`
        );
      }
    }

    // Sync issues from Cody to Beads
    const codyToBeads = await this.syncCodyToBeads(githubIssues, beadsIssues);
    issuesSynced += codyToBeads.issuesSynced;
    errors.push(...codyToBeads.errors);

    // Sync issues from Beads to Cody
    const beadsToCody = await this.syncBeadsToCody(beadsIssues, githubIssues);
    issuesSynced += beadsToCody.issuesSynced;
    errors.push(...beadsToCody.errors);

    // Sync PRs from Cody to Beads
    const prsToBeads = await this.syncCodyToBeads(githubPRs, beadsIssues);
    prsSynced += prsToBeads.issuesSynced;
    errors.push(...prsToBeads.errors);

    return { issuesSynced, prsSynced, errors };
  }

  private convertCodyIssueToBeads(codyIssue: GitHubIssue): Partial<BeadsIssue> {
    return {
      title: codyIssue.title,
      description: codyIssue.body || '',
      status: codyIssue.state === 'open' ? 'open' : 'closed',
      assignee: codyIssue.assignees[0]?.login,
      labels: codyIssue.labels.map((l) => l.name),
      metadata: {
        githubIssueNumber: codyIssue.number,
        githubUrl: codyIssue.html_url,
        githubId: codyIssue.id,
        syncedAt: new Date().toISOString(),
      },
    };
  }

  private convertBeadsIssueToCody(
    beadsIssue: BeadsIssue
  ): Partial<GitHubIssue> {
    return {
      title: beadsIssue.title,
      body: beadsIssue.description,
      state: beadsIssue.status === 'open' ? 'open' : 'closed',
      labels: beadsIssue.labels?.map((label) => ({ name: label })) || [],
    };
  }

  private contentDiffers(
    codyIssue: GitHubIssue,
    beadsIssue: BeadsIssue
  ): boolean {
    return (
      codyIssue.title !== beadsIssue.title ||
      (codyIssue.body || '') !== beadsIssue.description
    );
  }

  private calculateDryRunResults(
    githubIssues: GitHubIssue[],
    githubPRs: GitHubIssue[],
    beadsIssues: BeadsIssue[],
    options: SyncOptions
  ): string {
    let results = '';

    const syncedBebrasNumbers = new Set(
      beadsIssues.map((bi) => bi.metadata?.githubIssueNumber).filter(Boolean)
    );

    const newIssuesForBeads = githubIssues.filter(
      (gh) => !syncedBebrasNumbers.has(gh.number)
    );

    const newPRsForBeads = githubPRs.filter(
      (gh) => !syncedBebrasNumbers.has(gh.number)
    );

    switch (options.direction) {
      case 'cody-to-beads':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        break;
      case 'beads-to-cody':
        const newIssuesForCody = beadsIssues.filter(
          (bi) => !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to Cody: ${newIssuesForCody.length}\n`;
        break;
      case 'bidirectional':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        const newIssuesForCodyFromBeads = beadsIssues.filter(
          (bi) => !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to Cody: ${newIssuesForCodyFromBeads.length}\n`;
        break;
    }

    return results;
  }

  private async updateBeadsWithCodyData(conflict: SyncConflict): Promise<void> {
    if (!this.config.beads.projectPath || !conflict.beadsData?.id) {
      throw new Error('Beads project path or issue ID not available');
    }

    const updateData = this.convertCodyIssueToBeads(conflict.codyData);
    await this.beadsClient.updateIssue(
      this.config.beads.projectPath,
      conflict.beadsData.id,
      updateData
    );
    console.log(
      chalk.green(`✅ Updated Beads with Cody data for ${conflict.itemId}`)
    );
  }

  private async updateCodyWithBeadsData(conflict: SyncConflict): Promise<void> {
    if (!conflict.codyData?.number) {
      throw new Error('GitHub issue number not available');
    }

    const updateData = this.convertBeadsIssueToCody(conflict.beadsData);
    await this.githubClient.updateIssue(
      this.config.github.owner,
      this.config.github.repo,
      conflict.codyData.number,
      updateData
    );
    console.log(
      chalk.green(`✅ Updated Cody with Beads data for ${conflict.itemId}`)
    );
  }

  /**
   * Execute operation with retry and circuit breaker
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    let retryCount = 0;

    // Circuit breaker state
    let circuitOpen = false;
    let failureCount = 0;
    const circuitThreshold = 3;

    while (retryCount < maxRetries) {
      try {
        if (circuitOpen) {
          console.log(
            chalk.yellow(
              `⚠️  Circuit breaker open for ${operationName}, skipping attempt ${retryCount + 1}`
            )
          );
          await new Promise((resolve) =>
            setTimeout(resolve, baseDelay * Math.pow(2, retryCount))
          );
          retryCount++;
          continue;
        }

        const result = await operation();
        failureCount = 0; // Reset failure count on success
        return result;
      } catch (error) {
        lastError = error;
        failureCount++;
        retryCount++;

        console.log(
          chalk.red(
            `❌ Attempt ${retryCount} failed for ${operationName}: ${error}`
          )
        );

        // Open circuit if too many consecutive failures
        if (failureCount >= circuitThreshold) {
          circuitOpen = true;
          console.log(
            chalk.red(`🔌 Circuit breaker opened for ${operationName}`)
          );
        }

        // Exponential backoff
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

  /**
   * Get sync status and health information
   */
  async getSyncStatus(): Promise<{
    healthy: boolean;
    lastSync?: Date;
    pendingOperations: number;
    recentErrors: string[];
    circuitBreakers: Record<string, { open: boolean; failures: number }>;
  }> {
    // This would integrate with a monitoring system
    return {
      healthy: true,
      lastSync: new Date(),
      pendingOperations: 0,
      recentErrors: [],
      circuitBreakers: {},
    };
  }
}

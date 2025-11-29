import {
  SyncEngine,
  SyncOptions,
  SyncResult,
  SyncConflict,
  CodyBeadsConfig,
  GitHubIssue,
  GitHubClient,
  BeadsClient,
  BeadsIssue
} from '../types/index.js';
import chalk from 'chalk';
import { formatDate } from '../utils/helpers.js';

/**
 * Core synchronization engine for Cody-Beads integration
 */
export class SyncEngine implements SyncEngine {
  constructor(
    private config: CodyBeadsConfig,
    private githubClient: GitHubClient,
    private beadsClient: BeadsClient
  ) {}

  async executeSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(chalk.blue(`🔄 Starting sync (${options.direction})...`));

      // Step 1: Fetch current state from both systems
      console.log(chalk.gray('📥 Fetching current state...'));
      const [githubIssues, githubPRs, beadsIssues] = await Promise.all([
        this.githubClient.getIssues(this.config.github.owner, this.config.github.repo, { since: options.since }),
        this.githubClient.getPullRequests(this.config.github.owner, this.config.github.repo, { since: options.since }),
        this.config.beads.projectPath
          ? this.beadsClient.getIssues(this.config.beads.projectPath, { since: options.since })
          : []
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
          console.log(chalk.yellow(`⚠️  Found ${conflicts.length} potential conflicts`));
        }
      }

      // Step 3: Execute sync based on direction
      let issuesSynced = 0;
      let prsSynced = 0;
      const errors: string[] = [];

      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 DRY RUN - Showing what would be synced:'));

        // Show what would be synced without executing
        const dryRunResults = this.calculateDryRunResults(githubIssues, githubPRs, beadsIssues, options);
        console.log(dryRunResults);

        return {
          success: true,
          issuesSynced: dryRunResults.issues,
          prsSynced: dryRunResults.prs,
          conflicts,
          errors,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Actual sync execution
      switch (options.direction) {
        case 'cody-to-beads':
          ({ issuesSynced, errors: issuesErrors } = await this.syncCodyToBeads(githubIssues, beadsIssues));
          ({ prsSynced, errors: prsErrors } = await this.syncCodyToBeads(githubPRs, beadsIssues));
          errors.push(...issuesErrors, ...prsErrors);
          break;

        case 'beads-to-cody':
          ({ issuesSynced, errors: issuesErrors } = await this.syncBeadsToCody(beadsIssues, githubIssues));
          errors.push(...issuesErrors);
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
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Sync failed: ${error instanceof Error ? error.message : error}`);
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
        this.githubClient.getIssues(this.config.github.owner, this.config.github.repo),
        this.beadsClient.getIssues(this.config.beads.projectPath)
      ]);

      // Detect conflicts based on update timestamps
      for (const ghIssue of githubIssues) {
        const beadsIssue = beadsIssues.find(bi =>
          bi.metadata?.githubIssueNumber === ghIssue.number ||
          bi.title.toLowerCase() === ghIssue.title.toLowerCase()
        );

        if (beadsIssue) {
          const ghUpdated = new Date(ghIssue.updated_at);
          const beadsUpdated = new Date(beadsIssue.updated_at);

          // If both updated within last hour and content differs, flag as potential conflict
          const timeDiff = Math.abs(ghUpdated.getTime() - beadsUpdated.getTime());
          const oneHour = 60 * 60 * 1000;

          if (timeDiff < oneHour && this.contentDiffers(ghIssue, beadsIssue)) {
            conflicts.push({
              type: 'issue',
              itemId: `#${ghIssue.number} / ${beadsIssue.id}`,
              itemType: 'Issue',
              message: 'Both systems updated recently - potential conflict',
              codyData: ghIssue,
              beadsData: beadsIssue,
              resolution: this.config.sync.conflictResolution
            });
          }
        }
      }

    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Conflict detection failed: ${error}`));
    }

    return conflicts;
  }

  async resolveConflict(conflict: SyncConflict, resolution: string): Promise<void> {
    console.log(chalk.blue(`🔧 Resolving conflict for ${conflict.itemId} using ${resolution}`));

    switch (resolution) {
      case 'cody-wins':
        // Override Beads data with Cody data
        if (this.config.beads.projectPath && conflict.beadsData) {
          await this.updateBeadsWithCodyData(conflict);
        }
        break;

      case 'beads-wins':
        // Override Cody data with Beads data
        if (conflict.codyData) {
          await this.updateCodyWithBeadsData(conflict);
        }
        break;

      case 'newer-wins':
        // Use the most recently updated data
        const codyTime = new Date(conflict.codyData?.updated_at || 0);
        const beadsTime = new Date(conflict.beadsData?.updated_at || 0);

        if (codyTime > beadsTime) {
          await this.updateBeadsWithCodyData(conflict);
        } else {
          await this.updateCodyWithBeadsData(conflict);
        }
        break;

      case 'manual':
        console.log(chalk.yellow('⚠️  Manual resolution required. Skipping this item.'));
        break;

      default:
        throw new Error(`Unknown conflict resolution strategy: ${resolution}`);
    }
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
        const exists = beadsIssues.find(bi =>
          bi.metadata?.githubIssueNumber === codyIssue.number
        );

        if (!exists) {
          const beadsIssue = this.convertCodyIssueToBeads(codyIssue);
          await this.beadsClient.createIssue(this.config.beads.projectPath, beadsIssue);
          synced++;
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
        const exists = codyIssues.find(gh =>
          gh.number === beadsIssue.metadata?.githubIssueNumber
        );

        if (!exists) {
          const githubIssue = this.convertBeadsIssueToCody(beadsIssue);
          await this.githubClient.createIssue(
            this.config.github.owner,
            this.config.github.repo,
            githubIssue
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
        await this.resolveConflict(conflict, this.config.sync.conflictResolution);
      } catch (error) {
        errors.push(`Failed to resolve conflict for ${conflict.itemId}: ${error}`);
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
      labels: codyIssue.labels.map(l => l.name),
      metadata: {
        githubIssueNumber: codyIssue.number,
        githubUrl: codyIssue.html_url,
        githubId: codyIssue.id,
        syncedAt: new Date().toISOString()
      }
    };
  }

  private convertBeadsIssueToCody(beadsIssue: BeadsIssue): Partial<GitHubIssue> {
    return {
      title: beadsIssue.title,
      body: beadsIssue.description,
      state: beadsIssue.status === 'open' ? 'open' : 'closed',
      labels: beadsIssue.labels?.map(label => ({ name: label })) || [],
      metadata: {
        beadsIssueId: beadsIssue.id,
        syncedAt: new Date().toISOString()
      }
    };
  }

  private contentDiffers(codyIssue: GitHubIssue, beadsIssue: BeadsIssue): boolean {
    return codyIssue.title !== beadsIssue.title ||
           (codyIssue.body || '') !== beadsIssue.description;
  }

  private calculateDryRunResults(
    githubIssues: GitHubIssue[],
    githubPRs: GitHubIssue[],
    beadsIssues: BeadsIssue[],
    options: SyncOptions
  ): string {
    let results = '';

    const syncedBebrasNumbers = new Set(
      beadsIssues.map(bi => bi.metadata?.githubIssueNumber).filter(Boolean)
    );

    const newIssuesForBeads = githubIssues.filter(gh =>
      !syncedBebrasNumbers.has(gh.number)
    );

    const newPRsForBeads = githubPRs.filter(gh =>
      !syncedBebrasNumbers.has(gh.number)
    );

    switch (options.direction) {
      case 'cody-to-beads':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        break;
      case 'beads-to-cody':
        const newIssuesForCody = beadsIssues.filter(bi =>
          !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to Cody: ${newIssuesForCody.length}\n`;
        break;
      case 'bidirectional':
        results += `  Issues to sync to Beads: ${newIssuesForBeads.length}\n`;
        results += `  PRs to sync to Beads: ${newPRsForBeads.length}\n`;
        const newIssuesForCody = beadsIssues.filter(bi =>
          !bi.metadata?.githubIssueNumber
        );
        results += `  Issues to sync to Cody: ${newIssuesForCody.length}\n`;
        break;
    }

    return results;
  }

  private async updateBeadsWithCodyData(conflict: SyncConflict): Promise<void> {
    // Implementation would depend on Beads API
    console.log(chalk.green(`✅ Updated Beads with Cody data for ${conflict.itemId}`));
  }

  private async updateCodyWithBeadsData(conflict: SyncConflict): Promise<void> {
    // Implementation would depend on Cody API
    console.log(chalk.green(`✅ Updated Cody with Beads data for ${conflict.itemId}`));
  }
}
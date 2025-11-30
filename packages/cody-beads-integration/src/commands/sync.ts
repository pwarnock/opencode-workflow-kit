import ora from 'ora';
import chalk from 'chalk';
import { SyncDirection } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';
import { GitHubClientImpl } from '../utils/github.js';
import { SyncEngine } from '../core/sync-engine.js';

// Import BeadsClient (placeholder - needs implementation)
class BeadsClientImpl {
  constructor(_config: any) {}
  async getIssues(_path: string, _options?: any) { return []; }
  async createIssue(_path: string, issue: any) { return issue; }
  async updateIssue(_path: string, _id: string, update: any) { return update; }
  async createComment(_path: string, _issueId: string, _comment: any) { return _comment; }
  async updateComment(_path: string, _issueId: string, _commentId: string, _comment: any) { return _comment; }
  async deleteComment(_path: string, _issueId: string, _commentId: string) { return; }
  async addLabel(_path: string, _issueId: string, _label: string) { return; }
  async removeLabel(_path: string, _issueId: string, _label: string) { return; }
}

/**
 * Sync Command - Synchronize issues and PRs between Cody and Beads
 */
import { Command } from 'commander';

export const syncCommand = new Command('sync')
  .description('Synchronize issues and PRs between Cody and Beads')
  .option('-d, --direction <direction>', 'Sync direction', 'bidirectional')
  .option('-n, --dry-run', 'Show what would be synced without executing', false)
  .option('-f, --force', 'Force sync and skip conflict resolution', false)
  .option('--since <date>', 'Only sync items updated since this date (ISO 8601 format)')
  .action(async (options) => {
    const spinner = ora('Initializing sync...').start();

    try {
      // Load configuration
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      if (!config) {
        spinner.fail('Configuration not found. Run "cody-beads init" first.');
        return;
      }

      // Validate configuration
      const validation = await configManager.testConfig();
      if (!validation.github || !validation.beads) {
        spinner.fail('Configuration validation failed:');
        validation.errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
        return;
      }

      // Parse sync options
      const syncOptions = {
        direction: options.direction as SyncDirection,
        dryRun: options.dryRun,
        force: options.force,
        since: options.since ? new Date(options.since) : undefined
      };

      // Initialize clients
      const githubClient = new GitHubClientImpl(
        config.github.token || process.env.GITHUB_TOKEN || '',
        config.github.apiUrl ? { apiUrl: config.github.apiUrl } : undefined
      );

      const beadsClient = new BeadsClientImpl(config.beads);

      // Initialize sync engine
      const syncEngine = new SyncEngine(config, githubClient, beadsClient);

      // Execute sync
      spinner.text = 'Synchronizing...';
      const result = await syncEngine.executeSync(syncOptions);

      if (result.success) {
        spinner.succeed(`Sync completed successfully!`);
        console.log(chalk.green(`  Issues synced: ${result.issuesSynced}`));
        console.log(chalk.green(`  PRs synced: ${result.prsSynced}`));
        console.log(chalk.gray(`  Duration: ${result.duration}ms`));

        if (result.conflicts.length > 0) {
          console.log(chalk.yellow(`  Conflicts detected: ${result.conflicts.length}`));
          result.conflicts.forEach(conflict => {
            console.log(chalk.yellow(`    - ${conflict.itemId}: ${conflict.message}`));
          });
        }
      } else {
        spinner.fail('Sync failed');
        result.errors.forEach(error => {
          console.error(chalk.red(`  - ${error}`));
        });
      }

    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });
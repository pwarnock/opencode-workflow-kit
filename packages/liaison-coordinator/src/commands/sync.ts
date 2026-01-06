import ora from 'ora';
import chalk from 'chalk';
import { SyncDirection, resolveIssueSourceConfig } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';
import { BeadsClientImpl } from '../utils/beads.js';
import { ProviderSyncEngine } from '../core/provider-sync-engine.js';
import { createProvider } from '../providers/factory.js';
import { getCliName } from '../config/package-metadata.js';

/**
 * Sync Command - Synchronize issues and PRs between Cody and Beads
 */
import { Command } from 'commander';

export const syncCommand = new Command('sync')
  .description('Sync issues between Cody, GitHub, and Beads')
  .option('-d, --direction <direction>', 'Sync direction', 'bidirectional')
  .option('--dry-run', 'Show what would be synced without executing')
  .option('--force', 'Force sync and skip conflict resolution')
  .option(
    '--since <date>',
    'Only sync items updated since this date (ISO 8601 format)'
  )
  .option('--simulate', 'Simulate sync without touching external systems')
  .action(async (options) => {
    const spinner = ora('Initializing sync...').start();
    const direction = (options.direction as SyncDirection) ?? 'bidirectional';
    const simulateMode = Boolean(
      options.simulate || process.env.SYNC_SIMULATE === '1'
    );

    try {
      if (simulateMode) {
        spinner.stop();
        console.log(chalk.blue(`🔄 Starting sync (${direction})...`));
        console.log(chalk.gray('📥 Fetching current state (simulated)...'));
        console.log(chalk.gray('  GitHub Issues: 0'));
        console.log(chalk.gray('  GitHub PRs: 0'));
        console.log(chalk.gray('  Beads Issues: 0'));
        if (options.dryRun) {
          console.log(chalk.yellow('DRY RUN - no changes will be applied.'));
        }
        console.log(chalk.green('✅ Sync simulation completed'));
        console.log(chalk.green('  Issues synced: 0'));
        console.log(chalk.green('  PRs synced: 0'));
        return;
      }

      // Load configuration
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      if (!config) {
        spinner.fail(
          `Configuration not found. Run "${getCliName()} init" first.`
        );
        return;
      }

      // Check if @beads/bd is available (allow override for test environments)
      const skipBeadsCheck = process.env.BEADS_SKIP_AVAILABILITY_CHECK === '1';
      const beadsAvailable = skipBeadsCheck
        ? true
        : await BeadsClientImpl.isAvailable();
      if (!beadsAvailable) {
        spinner.fail('@beads/bd is not available. Please install it first:');
        console.log(chalk.yellow('  npm install -g @beads/bd'));
        console.log(
          chalk.gray(`  Or run: ${getCliName()} init --install-beads`)
        );
        return;
      }

      // Validate configuration
      const validation = await configManager.testConfig();

      if (!validation) {
        spinner.fail('Configuration validation returned null or undefined');
        console.error(chalk.red('  - Validation object is null'));
        return;
      }

      if (!validation.issueSource || !validation.beads) {
        spinner.fail('Configuration validation failed:');
        if (validation.errors && Array.isArray(validation.errors)) {
          validation.errors.forEach((error) =>
            console.error(chalk.red(`  - ${error}`))
          );
        } else {
          console.error(chalk.red('  - No error details available'));
        }
        return;
      }

      // Parse sync options
      const syncOptions = {
        direction: options.direction as SyncDirection,
        dryRun: options.dryRun,
        force: options.force,
        since: options.since ? new Date(options.since) : undefined,
      };

      // Resolve issue source configuration (handles backwards compatibility)
      const issueSourceConfig = resolveIssueSourceConfig(config);
      const issueProvider = issueSourceConfig
        ? createProvider(issueSourceConfig)
        : null;

      if (!issueProvider) {
        console.log(
          chalk.yellow(
            '⚠️  No issue source configured. Running in Beads-only mode.'
          )
        );
      }

      const beadsClient = new BeadsClientImpl(config.beads);

      // Initialize sync engine with provider abstraction
      const syncEngine = new ProviderSyncEngine(
        config,
        beadsClient,
        issueProvider
      );

      // Execute sync
      spinner.text = 'Synchronizing...';
      const result = await syncEngine.executeSync(syncOptions);

      if (result.success) {
        spinner.succeed(`Sync completed successfully!`);
        console.log(chalk.green(`  Issues synced: ${result.issuesSynced}`));
        console.log(chalk.green(`  PRs synced: ${result.prsSynced}`));
        console.log(chalk.gray(`  Duration: ${result.duration}ms`));

        if (result.conflicts.length > 0) {
          console.log(
            chalk.yellow(`  Conflicts detected: ${result.conflicts.length}`)
          );
          result.conflicts.forEach((conflict) => {
            console.log(
              chalk.yellow(`    - ${conflict.itemId}: ${conflict.message}`)
            );
          });
        }
      } else {
        spinner.fail('Sync failed');
        result.errors.forEach((error) => {
          console.error(chalk.red(`  - ${error}`));
        });
      }
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { CodyBeadsConfig, SyncDirection } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';
import { GitHubClient } from '../utils/github.js';
import { SyncEngine } from '../core/sync-engine.js';

/**
 * Sync Command - Synchronize issues and PRs between Cody and Beads
 */
export const syncCommand = {
  command: 'sync',
  description: 'Synchronize issues and PRs between Cody and Beads',
  builder: (yargs: any) => {
    return yargs
      .option('direction', {
        alias: 'd',
        choices: ['cody-to-beads', 'beads-to-cody', 'bidirectional'],
        default: 'bidirectional',
        describe: 'Sync direction'
      })
      .option('dry-run', {
        alias: 'n',
        type: 'boolean',
        describe: 'Show what would be synced without executing'
      })
      .option('force', {
        alias: 'f',
        type: 'boolean',
        describe: 'Force sync even if conflicts detected'
      })
      .option('since', {
        type: 'string',
        describe: 'Sync items since this date (ISO 8601 format)'
      });
  },
  handler: async (argv: any) => {
    const spinner = ora('🔄 Initializing sync...').start();

    try {
      // Load configuration
      const configManager = new ConfigManager(argv.config);
      const config = await configManager.loadConfig();

      // Validate configuration
      if (!config.github.token) {
        spinner.fail(chalk.red('❌ GitHub token not configured'));
        console.log(chalk.yellow('Set GITHUB_TOKEN environment variable or run: cody-beads config setup'));
        process.exit(1);
      }

      if (!config.cody.projectId && !config.beads.projectPath) {
        spinner.fail(chalk.red('❌ Neither Cody project nor Beads project configured'));
        console.log(chalk.yellow('Run: cody-beads config setup to configure your projects'));
        process.exit(1);
      }

      spinner.succeed();

      // Show sync summary
      console.log(chalk.blue('\n📊 Sync Configuration:'));
      console.log(chalk.gray(`  Direction: ${argv.direction}`));
      console.log(chalk.gray(`  Cody Project: ${config.cody.projectId || 'Not configured'}`));
      console.log(chalk.gray(`  Beads Project: ${config.beads.projectPath || 'Not configured'}`));

      if (argv.dryRun) {
        console.log(chalk.yellow('  Mode: DRY RUN - No changes will be made'));
      }

      // Initialize clients
      const githubClient = new GitHubClient(config.github.token);
      const syncEngine = new SyncEngine(config, githubClient);

      // Confirm sync if not dry run
      if (!argv.dryRun) {
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: chalk.yellow('⚠️  This will synchronize issues and PRs. Continue?'),
            default: false
          }
        ]);

        if (!confirmed) {
          console.log(chalk.gray('Sync cancelled'));
          process.exit(0);
        }
      }

      // Execute sync
      const resultsSpinner = ora('🔄 Synchronizing...').start();
      const results = await syncEngine.executeSync({
        direction: argv.direction as SyncDirection,
        dryRun: argv.dryRun,
        force: argv.force,
        since: argv.since ? new Date(argv.since) : undefined
      });

      resultsSpinner.succeed();

      // Display results
      console.log(chalk.green('\n✅ Sync completed successfully!'));
      console.log(chalk.blue('\n📈 Results Summary:'));

      if (results.issuesSynced > 0) {
        console.log(chalk.green(`  Issues synchronized: ${results.issuesSynced}`));
      }

      if (results.prsSynced > 0) {
        console.log(chalk.green(`  PRs synchronized: ${results.prsSynced}`));
      }

      if (results.conflicts.length > 0) {
        console.log(chalk.yellow(`  Conflicts found: ${results.conflicts.length}`));
        results.conflicts.forEach(conflict => {
          console.log(chalk.red(`    - ${conflict.type}: ${conflict.itemId} - ${conflict.message}`));
        });
      }

      if (results.errors.length > 0) {
        console.log(chalk.red(`  Errors: ${results.errors.length}`));
        results.errors.forEach(error => {
          console.log(chalk.red(`    - ${error}`));
        });
      }

      // Show next steps
      console.log(chalk.blue('\n🎯 Next Steps:'));
      if (results.conflicts.length > 0) {
        console.log(chalk.yellow('  1. Resolve conflicts manually'));
        console.log(chalk.yellow('  2. Run sync again with --force if appropriate'));
      }
      console.log(chalk.gray('  3. Check your Cody project for updated issues'));
      console.log(chalk.gray('  4. Run "cody-beads sync" again to keep projects in sync'));

    } catch (error) {
      spinner.fail(chalk.red('❌ Sync failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);

      if (argv.verbose) {
        console.error(error);
      }

      process.exit(1);
    }
  }
};
#!/usr/bin/env node

/**
 * OpenCode Cody-Beads Integration
 * Seamless integration between Cody Product Builder Toolkit and Beads
 * for AI-driven development workflows
 */

import { program } from 'commander';
import chalk from 'chalk';
import { syncCommand } from './commands/sync.js';
import { configCommand } from './commands/config.js';
import { templateCommand } from './commands/template.js';
import { initCommand } from './commands/init.js';
import { versionCommand } from './commands/version.js';
import { pluginCommand, taskCommand, workflowCommand, migrateCommand } from './commands/enhanced-cli.js';

const packageJson = require('../package.json');

// CLI Configuration
program
  .name('cody-beads')
  .description('Seamless integration between Cody and Beads for AI-driven development')
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command');

// Global options
program
  .option('--verbose', 'Enable verbose logging', false)
  .option('--dry-run', 'Show what would be done without executing', false)
  .option('--config <path>', 'Path to configuration file', './cody-beads.config.json')
  .option('--token <token>', 'GitHub authentication token (or set GITHUB_TOKEN)');

// Add subcommands
program.addCommand(syncCommand);
program.addCommand(configCommand);
program.addCommand(templateCommand);
program.addCommand(initCommand);
program.addCommand(versionCommand);
program.addCommand(pluginCommand);
program.addCommand(taskCommand);
program.addCommand(workflowCommand);
program.addCommand(migrateCommand);

// Global error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
  if (program.opts().verbose) {
    console.error(reason);
  }
  process.exit(1);
});

// Parse command line arguments
program.parse();

export { program };
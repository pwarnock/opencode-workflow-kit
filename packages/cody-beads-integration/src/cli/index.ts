/**
 * CLI Module for Programmatic Usage
 */

import { Command } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };

// Import commands
import { syncCommand } from '../commands/sync.js';
import { configCommand } from '../commands/config.js';
import { templateCommand } from '../commands/template.js';
import { initCommand } from '../commands/init.js';
import { versionCommand } from '../commands/version.js';
import { pluginCommand, taskCommand, workflowCommand, migrateCommand } from '../commands/enhanced-cli.js';
import { beadsViewerCommand } from '../commands/beads-viewer.js';

/**
 * Create CLI instance
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('cody-beads')
    .description('Seamless integration between Cody and Beads for AI-driven development')
    .version(packageJson.version, '-v, --version')
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
  program.addCommand(beadsViewerCommand);

  return program;
}

/**
 * Run CLI with arguments
 */
export async function runCLI(argv: string[] = process.argv): Promise<void> {
  const program = createCLI();
  
  // Global error handling
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    if (program.opts().verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (program.opts().verbose) {
      console.error(reason);
    }
    process.exit(1);
  });

  // Parse and execute
  try {
    await program.parseAsync(argv);
  } catch (error) {
    console.error('❌ CLI Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Export the program for backward compatibility
 */
export const program = createCLI();
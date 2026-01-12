#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { UnifiedPluginManager } from './plugin-manager';
import type { CLIPlugin } from './types';
import { createHealthCommand } from './commands/health';
import { createReconcileCommand } from './commands/reconcile';
import { createTaskCommand } from './commands/task';
import { readFileSync } from 'fs';
import { join } from 'path';

// CLI version function (moved earlier for --version flag)
const getCLIVersion = () => {
  try {
    // Read version dynamically from package.json
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf-8')
    );
    return packageJson.version || '0.1.0';
  } catch (error) {
    // Fallback if package.json can't be read
    return '0.1.0';
  }
};

// Enhanced error handling for better debugging
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught exception:'), error.message);
  console.error(chalk.red('Full error:'), error);
  if (error.stack) {
    console.error(chalk.red('Stack trace:'), error.stack);
  }
  console.error(chalk.yellow('💡 Try running: node packages/liaison/dist/cli.js --help'));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled rejection:'), reason);
  console.error(chalk.red('Promise:'), promise);
  console.error(chalk.yellow('💡 Try running: node packages/liaison/dist/cli.js --help'));
  process.exit(1);
});

// Show version at the top for --version flag
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const version = getCLIVersion();
  console.log(`Liaison CLI v${version}`);
  process.exit(0);
}

// Validate dependencies at startup
async function validateEnvironment() {
  try {
    // Test core dependency
    const core = await import('@pwarnock/toolkit-core');
    console.log(chalk.green('✅ Core dependency loaded successfully'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Missing or failed dependency: @pwarnock/toolkit-core'));
    console.error(chalk.red('Error message:'), errorMessage);
    console.error(chalk.yellow('💡 This usually means the global installation is incomplete'));
    console.error(chalk.yellow('💡 Try rebuilding and relinking all packages'));
    console.error(chalk.yellow('💡 Or run locally: node packages/liaison/dist/cli.js --help'));
    process.exit(1);
  }
}

const program = new Command();
const pluginManager = new UnifiedPluginManager();

// CLI Commands
program
  .name('liaison')
  .description('Liaison CLI - Workflow automation and task management')
  .version(`v${getCLIVersion()}`);

// Plugin management commands
program
  .command('plugin')
  .description('Plugin management commands')
  .addCommand(
    new Command('list')
      .description('List all loaded plugins')
      .action(async () => {
        const plugins = pluginManager.listPlugins();
        
        if (plugins.length === 0) {
          console.log(chalk.yellow('No plugins loaded'));
          return;
        }

        console.log(chalk.bold('Loaded Plugins:'));
        plugins.forEach(plugin => {
          console.log(`  ${chalk.green(plugin.name)} v${plugin.version}`);
          console.log(`    ${plugin.description}`);
          console.log(`    Commands: ${plugin.commands.map(cmd => cmd.name).join(', ')}`);
          console.log();
        });
      })
  )
  .addCommand(
    new Command('load')
      .description('Load a plugin from file')
      .argument('<path>', 'Path to plugin file')
      .action(async (path) => {
        try {
          const pluginModule = await import(path);
          const plugin: CLIPlugin = pluginModule.default || pluginModule;
          
          await pluginManager.loadPlugin(plugin);
          console.log(chalk.green(`✅ Plugin loaded: ${plugin.name}`));
        } catch (error) {
          console.error(chalk.red(`❌ Failed to load plugin: ${error}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('unload')
      .description('Unload a plugin')
      .argument('<name>', 'Plugin name')
      .action(async (name) => {
        try {
          await pluginManager.unloadPlugin(name);
          console.log(chalk.green(`✅ Plugin unloaded: ${name}`));
        } catch (error) {
          console.error(chalk.red(`❌ Failed to unload plugin: ${error}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('commands')
      .description('List all available commands')
      .action(async () => {
        const commands = pluginManager.listCommands();
        
        if (commands.length === 0) {
          console.log(chalk.yellow('No commands available'));
          return;
        }

        console.log(chalk.bold('Available Commands:'));
        commands.forEach(cmd => {
          console.log(`  ${chalk.cyan(cmd.name)} (${chalk.gray(cmd.plugin)})`);
          console.log(`    ${cmd.description}`);
          console.log();
        });
      })
  );

// Built-in commands
program
  .command('sync')
  .description('Sync Beads and Cody systems')
  .option('-f, --force', 'Force sync even if no changes detected')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔄 Starting Beads-Cody sync...'));
      
      // This integrates with the modern Bun-based sync system
      const childProcess = await import('child_process');
      const syncProcess = childProcess.spawn('bun', [
        'run',
        'scripts/automated-sync.ts',
        ...(options.force ? ['--force'] : []),
        '--verbose'
      ], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      syncProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Sync completed successfully'));
        } else {
          console.error(chalk.red('❌ Sync failed'));
          process.exit(code || 1);
        }
      });

    } catch (error) {
      console.error(chalk.red(`❌ Sync failed: ${error}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show project and sync status')
  .action(async () => {
    try {
      console.log(chalk.bold('📊 Project Status'));
      console.log();

      // Plugin status
      const plugins = pluginManager.listPlugins();
      console.log(`${chalk.blue('Plugins:')} ${plugins.length} loaded`);
      
      // Command status
      const commands = pluginManager.listCommands();
      console.log(`${chalk.blue('Commands:')} ${commands.length} available`);
      console.log();

      // Sync status (integrate with monitoring)
      try {
        const childProcess = await import('child_process');
        const monitorProcess = childProcess.spawn('python3', ['scripts/sync-monitor.py'], {
          stdio: 'pipe',
          cwd: process.cwd()
        });

        let output = '';
        monitorProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        monitorProcess.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('✅ Sync system healthy'));
          } else {
            console.log(chalk.red('❌ Sync system issues detected'));
            if (output.trim()) {
              console.log(output);
            }
          }
        });

      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not check sync status'));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Failed to get status: ${error}`));
      process.exit(1);
    }
  });

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command: %s'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled rejection at:'), promise, 'reason:', reason);
  process.exit(1);
  });

// Health check command
program.addCommand(createHealthCommand());

// Reconcile command
program.addCommand(createReconcileCommand());

// Task command
program.addCommand(createTaskCommand());

// Liaison Plan commands (plan → build → refresh workflow)
import { createPlanCommand } from './commands/plan';
import { createBuildCommand } from './commands/build';
import { createRefreshCommand } from './commands/refresh';
program.addCommand(createPlanCommand());
program.addCommand(createBuildCommand());
program.addCommand(createRefreshCommand());

// Workflow command
import { createWorkflowCommand } from './commands/workflow';
program.addCommand(createWorkflowCommand());

// OpenCode command
// import { createOpenCodeCommand } from './commands/opencode';
// program.addCommand(createOpenCodeCommand());

// Skill command
import { createSkillCommand } from './commands/skill';
program.addCommand(createSkillCommand());

// TUI command
import { createTUICommand } from './commands/tui';
program.addCommand(createTUICommand());

// Agent command (multi-agent coordination)
import { createAgentCommand } from './commands/agent';
program.addCommand(createAgentCommand());

// Compact command (memory decay)
import { createCompactCommand } from './commands/compact';
program.addCommand(createCompactCommand());

// Config command (environment configuration)
import { createConfigCommand } from './commands/config';
import { createConfigSyncSubcommand } from './commands/sync';
const configCommand = createConfigCommand();
configCommand.addCommand(createConfigSyncSubcommand());
program.addCommand(configCommand);

// Template update command
import { createTemplateUpdateCommand } from './commands/template-update';
program.addCommand(createTemplateUpdateCommand());

// Setup command (interactive configuration setup)
import { createSetupCommand } from './commands/setup';
program.addCommand(createSetupCommand());

// Plugin command (Claude plugin management)
import { createPluginCommand } from './commands/plugin';
program.addCommand(createPluginCommand());

// Load built-in plugins
async function loadBuiltInPlugins() {
  try {
    // Set timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Plugin loading timeout')), 10000); // 10 seconds
    });

    // Import and load the Liaison integration plugin with timeout
    const pluginPromise = (async () => {
      try {
        const { liaisonPlugin } = await import('./liaison-plugin.js');
        await pluginManager.loadPlugin(liaisonPlugin);

        // Add plugin commands to main CLI program
        const commands = pluginManager.listCommands();
        commands.forEach(cmd => {
          program
            .command(cmd.name)
            .description(cmd.description)
            .action(async (args, options) => {
              try {
                const result = await pluginManager.executeCommand(cmd.name, args, options);
                if (result.success) {
                  console.log(chalk.green(`✅ ${cmd.name} completed successfully`));
                }
              } catch (error) {
                console.error(chalk.red(`❌ ${cmd.name} failed: ${error}`));
                process.exit(1);
              }
            });
        });
      } catch (pluginError) {
        // Plugin loading failed, continue without it
        console.warn(chalk.yellow('⚠️  Plugin loading issue, continuing without built-in plugins'));
      }
    })();

    // Race between plugin loading and timeout
    await Promise.race([pluginPromise, timeoutPromise]);
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Plugin loading issue:', error instanceof Error ? error.message : String(error)));
    console.warn(chalk.yellow('Continuing without built-in plugins...'));
  }
}

function normalizeSlashCommandArgs(argv: string[]): string[] {
  const normalized = [...argv];
  const slashIndex = normalized.findIndex((arg, index) => index >= 2 && arg === '/liaison');

  if (slashIndex !== -1) {
    normalized.splice(slashIndex, 1);
  }

  return normalized;
}

// Initialize and run
async function main() {
  try {
    // Validate environment first
    await validateEnvironment();

    await loadBuiltInPlugins();
    await pluginManager.discoverPlugins();

    const normalizedArgv = normalizeSlashCommandArgs(process.argv);
    const args = normalizedArgv.slice(2);

    // Check if no arguments provided - show help instead of TUI
    if (args.length === 0) {
      console.log(chalk.blue('🔧 Liaison CLI - Workflow automation and task management\n'));
      console.log(chalk.bold('Usage:'));
      console.log('  liaison <command> [options]\n');
      console.log(chalk.bold('Available Commands:'));
      console.log('  liaison tui          Launch TUI (experimental)');
      console.log('  liaison skill        Manage Agent Skills');
      console.log('  liaison workflow      Manage workflows');
      console.log('  liaison agent         Manage agents (via opencode)');
      console.log('  liaison task          Manage tasks');
      console.log('  liaison config        Manage environment configurations');
      console.log('  liaison plugin        Manage plugins');
      console.log('\n' + chalk.gray('Use `liaison <command> --help` for command details\n'));
      return;
    }

    // Parse and execute CLI commands
    await program.parseAsync(normalizedArgv);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ CLI initialization failed:'), errorMessage);
    process.exit(1);
  }
}

// Run the CLI
main();
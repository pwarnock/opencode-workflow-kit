#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { UnifiedPluginManager } from './plugin-manager.js';
import type { CLIPlugin } from './types.js';
import { createHealthCommand } from './commands/health.js';

const program = new Command();
const pluginManager = new UnifiedPluginManager();

// CLI Commands
program
  .name('opencode')
  .description('OpenCode Workflow Kit CLI with plugin architecture')
  .version('0.5.0');

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
      
      // This would integrate with automated sync system
      const childProcess = await import('child_process');
      const syncProcess = childProcess.spawn('python3', [
        'scripts/automated-sync.py',
        ...(options.force ? ['--force'] : [])
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

// Load built-in plugins
async function loadBuiltInPlugins() {
  try {
    // Import and load the Liaison integration plugin
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
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load built-in plugins:', error));
  }
}

// Initialize and run
async function main() {
  try {
    await loadBuiltInPlugins();
    await pluginManager.discoverPlugins();
    
    // Parse and execute CLI commands
    await program.parseAsync(process.argv);
    
  } catch (error) {
    console.error(chalk.red('❌ CLI initialization failed:'), error);
    process.exit(1);
  }
}

// Start CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
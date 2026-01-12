/**
 * Plugin Command
 * CLI command: liaison plugin
 * Manage Claude plugin installation and configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createPluginCommand(): Command {
  const command = new Command('ext');

  command.description('Manage Claude plugin and extensions');

  // liaison ext status
  command
    .command('status')
    .description('Show Claude plugin installation status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Checking plugin status...').start();
      
      try {
        const pluginDir = join(homedir(), '.claude', 'plugins', 'liaison');
        const liaisonPluginDir = join(__dirname, '..', 'claude-plugin');
        
        let isInstalled = false;
        let pluginVersion = 'unknown';
        let configFiles: string[] = [];
        let lastUpdated = 'never';
        
        try {
          await fs.access(pluginDir);
          isInstalled = true;
          configFiles = await fs.readdir(pluginDir);
          
          // Try to read version
          try {
            const versionFile = join(pluginDir, 'VERSION');
            pluginVersion = await fs.readFile(versionFile, 'utf-8');
          } catch {
            pluginVersion = 'unknown';
          }
          
          // Try to read last updated
          try {
            const stats = await fs.stat(pluginDir);
            lastUpdated = stats.mtime.toISOString();
          } catch {
            lastUpdated = 'unknown';
          }
        } catch {
          isInstalled = false;
        }
        
        spinner.stop();
        
        if (options.json) {
          console.log(JSON.stringify({
            isInstalled,
            pluginDir,
            pluginVersion,
            configFiles,
            lastUpdated
          }, null, 2));
        } else {
          console.log(chalk.cyan('\n📦 Claude Plugin Status'));
          console.log('═'.repeat(40));
          
          console.log(`\n${isInstalled ? chalk.green('✓') : chalk.red('✗')} Plugin Installed: ${isInstalled ? 'Yes' : 'No'}`);
          console.log(`📁 Plugin Directory: ${pluginDir}`);
          console.log(`📌 Version: ${pluginVersion}`);
          console.log(`🕐 Last Updated: ${lastUpdated}`);
          
          if (isInstalled && configFiles.length > 0) {
            console.log(`\n📄 Config Files:`);
            configFiles.forEach(file => {
              console.log(`  - ${file}`);
            });
          }
          
          console.log(chalk.gray('\n💡 Run ') + chalk.white('liaison ext install claude') + chalk.gray(' to install'));
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to check plugin status'));
        console.error(error);
        process.exit(1);
      }
    });

  // liaison ext install claude
  command
    .command('install claude')
    .description('Install Liaison plugin for Claude')
    .option('--force', 'Force reinstall even if already installed')
    .action(async (options) => {
      const spinner = ora('Installing Claude plugin...').start();
      
      try {
        const sourceDir = join(__dirname, '..', '..', 'claude-plugin');
        const targetDir = join(homedir(), '.claude', 'plugins', 'liaison');
        
        // Check if already installed
        try {
          await fs.access(targetDir);
          if (!options.force) {
            spinner.stop();
            console.log(chalk.yellow('Plugin already installed. Use --force to reinstall.'));
            process.exit(0);
          }
        } catch {
          // Not installed, continue
        }
        
        // Create target directory
        await fs.mkdir(targetDir, { recursive: true });
        
        // Copy plugin files
        await copyDirectory(sourceDir, targetDir);
        
        // Create VERSION file
        const packageJson = JSON.parse(
          await fs.readFile(join(__dirname, '..', '..', 'package.json'), 'utf-8')
        );
        await fs.writeFile(
          join(targetDir, 'VERSION'),
          packageJson.version || '1.0.0'
        );
        
        spinner.succeed(chalk.green('✅ Claude plugin installed successfully!'));
        
        console.log(chalk.cyan('\n📦 Installed Files:'));
        const files = await fs.readdir(targetDir);
        files.forEach(file => {
          console.log(`  - ${file}`);
        });
        
        console.log(chalk.gray('\n💡 Next steps:'));
        console.log(chalk.gray('  - Run ') + chalk.white('liaison setup plugin') + chalk.gray(' to configure the plugin'));
        console.log(chalk.gray('  - Run ') + chalk.white('liaison config claude') + chalk.gray(' to set up Claude configuration'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to install plugin'));
        console.error(error);
        process.exit(1);
      }
    });

  // liaison ext uninstall claude
  command
    .command('uninstall claude')
    .description('Uninstall Liaison plugin from Claude')
    .option('--keep-config', 'Keep configuration files')
    .action(async (options) => {
      const spinner = ora('Uninstalling Claude plugin...').start();
      
      try {
        const targetDir = join(homedir(), '.claude', 'plugins', 'liaison');
        
        // Check if installed
        try {
          await fs.access(targetDir);
        } catch {
          spinner.stop();
          console.log(chalk.yellow('Plugin is not installed.'));
          process.exit(0);
        }
        
        // Get config files to potentially keep
        const configDir = join(targetDir, 'configs');
        let configFiles: string[] = [];
        if (options.keepConfig) {
          try {
            configFiles = await fs.readdir(configDir);
          } catch {
            // No config directory
          }
        }
        
        // Remove plugin directory
        await fs.rm(targetDir, { recursive: true, force: true });
        
        spinner.succeed(chalk.green('✅ Claude plugin uninstalled successfully!'));
        
        if (options.keepConfig && configFiles.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Kept ${configFiles.length} configuration files`));
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to uninstall plugin'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
}

async function copyDirectory(source: string, target: string): Promise<void> {
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  await fs.mkdir(target, { recursive: true });
  
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

/**
 * Liaison Setup Command
 * CLI command: liaison setup
 * Setup liaison plugin and integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createLiaisonSetupCommand(): Command {
  const command = new Command('setup');

  command.description('Setup Liaison and related integrations');

  // liaison setup opencode
  command
    .command('opencode')
    .description('Interactive setup for OpenCode environment')
    .option('--directory <path>', 'Target directory', '.')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration')
    .action(async (options) => {
      console.log(chalk.cyan('\n🔧 OpenCode Setup'));
      console.log('═'.repeat(40));
      console.log(chalk.gray('This will set up OpenCode configuration using agent_primitives.'));
      console.log(chalk.gray('Use the interactive prompts to configure your agents.'));
      
      const inquirer = await import('inquirer');
      
      const { agentName } = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'agentName',
          message: 'Enter agent name:',
          default: 'liaison-agent',
          validate: (input: string) => {
            if (!input.trim()) return 'Agent name is required';
            if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Agent name can only contain letters, numbers, hyphens, and underscores';
            return true;
          }
        }
      ]);
      
      const templates = [
        { name: 'custom-agent', description: 'Generic agent template for any purpose' },
        { name: 'library-researcher', description: 'Library and API research specialist' },
        { name: 'code-reviewer', description: 'Code review and quality assurance specialist' },
        { name: 'liaison-specialist', description: 'Liaison architecture and workflow automation' }
      ];
      
      const { template } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Select agent template:',
          choices: templates.map(t => ({ name: `${chalk.cyan(t.name)} - ${t.description}`, value: t.name })),
          default: 'custom-agent'
        }
      ]);
      
      const models = [
        { id: 'big-pickle', name: 'Big Pickle (Free)', context: 16384 },
        { id: 'openrouter/z-ai/zpm-202506', name: 'Z-AI ZPM (Free)', context: 16384 },
        { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4', context: 200000 }
      ];
      
      const { model } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Select model:',
          choices: models.map(m => ({ name: `${chalk.cyan(m.id)} - ${m.name} (${m.context.toLocaleString()} ctx)`, value: m.id })),
          default: 'big-pickle'
        }
      ]);
      
      console.log(chalk.green(`\n✓ OpenCode configuration ready:`));
      console.log(`  Agent: ${agentName}`);
      console.log(`  Template: ${template}`);
      console.log(`  Model: ${model}`);
      
      console.log(chalk.yellow('\n💡 Run ') + chalk.white('liaison config opencode') + chalk.yellow(' to apply this configuration'));
    });

  // liaison setup claude
  command
    .command('claude')
    .description('Interactive setup for Claude environment')
    .option('--directory <path>', 'Target directory', '.')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration')
    .action(async (options) => {
      console.log(chalk.cyan('\n🔧 Claude Setup'));
      console.log('═'.repeat(40));
      console.log(chalk.gray('This will set up Claude configuration using claude_config.'));
      
      const inquirer = await import('inquirer');
      
      const { name } = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter agent name:',
          default: 'liaison-agent',
          validate: (input: string) => {
            if (!input.trim()) return 'Agent name is required';
            return true;
          }
        }
      ]);
      
      const models = [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
        { id: 'claude-opus-4-20250501', name: 'Claude Opus 4' },
        { id: 'claude-haiku-3-20250514', name: 'Claude Haiku 3' }
      ];
      
      const { model } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Select Claude model:',
          choices: models.map(m => ({ name: m.name, value: m.id })),
          default: 'claude-sonnet-4-20250514'
        }
      ]);
      
      const { temperature } = await inquirer.default.prompt([
        {
          type: 'number',
          name: 'temperature',
          message: 'Enter temperature (0.0-1.0):',
          default: 0.7,
          validate: (input: number) => {
            if (input < 0 || input > 1) return 'Temperature must be between 0 and 1';
            return true;
          }
        }
      ]);
      
      console.log(chalk.green(`\n✓ Claude configuration ready:`));
      console.log(`  Agent: ${name}`);
      console.log(`  Model: ${model}`);
      console.log(`  Temperature: ${temperature}`);
      
      console.log(chalk.yellow('\n💡 Run ') + chalk.white('liaison config claude') + chalk.yellow(' to apply this configuration'));
    });

  // liaison setup plugin
  command
    .command('plugin')
    .description('Setup and configure Liaison Claude plugin')
    .option('--reconfigure', 'Reconfigure existing installation')
    .action(async (options) => {
      const spinner = ora('Setting up Liaison plugin...').start();
      
      try {
        const pluginDir = join(homedir(), '.claude', 'plugins', 'liaison');
        const sourcePluginDir = join(__dirname, '..', '..', 'claude-plugin');
        
        let isInstalled = false;
        try {
          await fs.access(pluginDir);
          isInstalled = true;
        } catch {
          isInstalled = false;
        }
        
        if (isInstalled && !options.reconfigure) {
          spinner.stop();
          console.log(chalk.yellow('Plugin already installed. Use --reconfigure to update.'));
          console.log(chalk.gray('\n💡 Run ') + chalk.white('liaison ext status') + chalk.gray(' to see details'));
          return;
        }
        
        await fs.mkdir(pluginDir, { recursive: true });
        await copyDirectory(sourcePluginDir, pluginDir);
        
        const packageJson = JSON.parse(
          await fs.readFile(join(__dirname, '..', '..', 'package.json'), 'utf-8')
        );
        await fs.writeFile(
          join(pluginDir, 'VERSION'),
          packageJson.version || '1.0.0'
        );
        
        spinner.succeed(chalk.green('✅ Liaison plugin configured successfully!'));
        
        console.log(chalk.cyan('\n📦 Plugin Configuration:'));
        console.log(`  📁 Location: ${pluginDir}`);
        console.log(`  📌 Version: ${packageJson.version || '1.0.0'}`);
        
        console.log(chalk.gray('\n💡 Available Commands:'));
        console.log('  - liaison config claude - Configure Claude environment');
        console.log('  - liaison config opencode - Configure OpenCode environment');
        console.log('  - liaison ext status - Check plugin status');
        console.log('  - liaison ext uninstall claude - Uninstall plugin');
      } catch (error) {
        spinner.fail(chalk.red('Failed to setup plugin'));
        console.error(error);
        process.exit(1);
      }
    });

  // liaison setup all
  command
    .command('all')
    .description('Run full setup for all integrations')
    .option('--directory <path>', 'Target directory', '.')
    .action(async (options) => {
      console.log(chalk.cyan('\n🔧 Full Liaison Setup'));
      console.log('═'.repeat(40));
      
      console.log(chalk.gray('\n1/3 ') + chalk.white('Setting up OpenCode...'));
      console.log(chalk.yellow('  💡 Run ') + chalk.white('liaison setup opencode') + chalk.gray(' interactively'));
      
      console.log(chalk.gray('\n2/3 ') + chalk.white('Setting up Claude...'));
      console.log(chalk.yellow('  💡 Run ') + chalk.white('liaison setup claude') + chalk.gray(' interactively'));
      
      console.log(chalk.gray('\n3/3 ') + chalk.white('Setting up Plugin...'));
      try {
        const pluginDir = join(homedir(), '.claude', 'plugins', 'liaison');
        const sourcePluginDir = join(__dirname, '..', '..', 'claude-plugin');
        
        await fs.mkdir(pluginDir, { recursive: true });
        await copyDirectory(sourcePluginDir, pluginDir);
        
        const packageJson = JSON.parse(
          await fs.readFile(join(__dirname, '..', '..', 'package.json'), 'utf-8')
        );
        await fs.writeFile(
          join(pluginDir, 'VERSION'),
          packageJson.version || '1.0.0'
        );
        
        console.log(chalk.green('  ✓ Plugin setup complete'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠ Plugin setup skipped'));
      }
      
      console.log(chalk.cyan('\n✅ Full setup complete!'));
      console.log(chalk.gray('\n💡 Next steps:'));
      console.log('  - liaison setup opencode - Set up OpenCode');
      console.log('  - liaison setup claude - Set up Claude');
      console.log('  - liaison config status - View configuration');
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

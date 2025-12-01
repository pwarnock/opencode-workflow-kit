import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';

/**
 * Configuration Command - Manage cody-beads integration settings
 */
import { Command } from 'commander';

export const configCommand = new Command('config')
  .description('Configure cody-beads integration settings');

// Setup subcommand
configCommand
  .command('setup')
  .description('Interactive configuration setup')
  .action(async () => {
    const configManager = new ConfigManager();
    await setupConfig(configManager);
  });

// Test subcommand
configCommand
  .command('test')
  .description('Test current configuration')
  .action(async () => {
    const configManager = new ConfigManager();
    await testConfig(configManager);
  });

// Show subcommand
configCommand
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    const configManager = new ConfigManager();
    await showConfig(configManager);
  });

// Set subcommand
configCommand
  .command('set')
  .description('Set configuration value')
  .requiredOption('-k, --key <key>', 'Configuration key to set')
  .requiredOption('-v, --value <value>', 'Configuration value to set')
  .action(async (options) => {
    const configManager = new ConfigManager();
    await setConfigValue(configManager, options.key, options.value);
  });

// Get subcommand
configCommand
  .command('get')
  .description('Get configuration value')
  .requiredOption('-k, --key <key>', 'Configuration key to get')
  .action(async (options) => {
    const configManager = new ConfigManager();
    await getConfigValue(configManager, options.key);
  });

async function setupConfig(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('🔧 Setting up cody-beads configuration...'));

  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'githubOwner',
        message: 'GitHub repository owner:',
        validate: (input: string) => input.trim() !== '' || 'Owner is required'
      },
      {
        type: 'input',
        name: 'githubRepo',
        message: 'GitHub repository name:',
        validate: (input: string) => input.trim() !== '' || 'Repository name is required'
      },
      {
        type: 'password',
        name: 'githubToken',
        message: 'GitHub personal access token:',
        validate: (input: string) => input.trim() !== '' || 'Token is required'
      },
      {
        type: 'input',
        name: 'codyProjectId',
        message: 'Cody project ID (optional):'
      },
      {
        type: 'input',
        name: 'beadsProjectPath',
        message: 'Beads project path (optional):'
      }
    ]);

    const config = {
      version: '1.0.0',
      github: {
        owner: answers.githubOwner,
        repo: answers.githubRepo,
        token: answers.githubToken
      },
      cody: {
        projectId: answers.codyProjectId || undefined,
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: answers.beadsProjectPath || undefined,
        autoSync: false,
        syncInterval: 60
      },
      sync: {
        defaultDirection: 'bidirectional' as const,
        conflictResolution: 'manual' as const,
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false
      },
      templates: {
        defaultTemplate: 'minimal'
      }
    };

    await configManager.saveConfig(config);
    console.log(chalk.green('✅ Configuration saved successfully!'));

  } catch (error) {
    console.error(chalk.red('❌ Setup failed:'), error);
    process.exit(1);
  }
}

async function testConfig(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('🧪 Testing configuration...'));

  try {
    const config = await configManager.loadConfig();
    if (!config) {
      console.error(chalk.red('❌ No configuration found. Run "cody-beads config setup" first.'));
      return;
    }

    const validation = await configManager.testConfig();
    
    if (validation.github) {
      console.log(chalk.green('✅ GitHub connection: OK'));
    } else {
      console.log(chalk.red('❌ GitHub connection: FAILED'));
      validation.errors.forEach(error => console.error(chalk.red(`   - ${error}`)));
    }

    if (validation.beads) {
      console.log(chalk.green('✅ Beads connection: OK'));
    } else {
      console.log(chalk.red('❌ Beads connection: FAILED'));
      validation.errors.forEach(error => console.error(chalk.red(`   - ${error}`)));
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    process.exit(1);
  }
}

async function showConfig(configManager: ConfigManager): Promise<void> {
  try {
    const config = await configManager.loadConfig();
    if (!config) {
      console.error(chalk.red('❌ No configuration found.'));
      return;
    }

    console.log(chalk.blue('📋 Current configuration:'));
    console.log(JSON.stringify(config, null, 2));

  } catch (error) {
    console.error(chalk.red('❌ Failed to show configuration:'), error);
    process.exit(1);
  }
}

async function setConfigValue(configManager: ConfigManager, key: string, value: string): Promise<void> {
  if (!key || !value) {
    console.error(chalk.red('❌ Both --key and --value are required for set action.'));
    return;
  }

  try {
    await configManager.setOption(key, value);
    console.log(chalk.green(`✅ Set ${key} = ${value}`));

  } catch (error) {
    console.error(chalk.red('❌ Failed to set configuration:'), error);
    process.exit(1);
  }
}

async function getConfigValue(configManager: ConfigManager, key: string): Promise<void> {
  if (!key) {
    console.error(chalk.red('❌ --key is required for get action.'));
    return;
  }

  try {
    const value = await configManager.getOption(key);
    console.log(chalk.blue(`${key}:`), value);

  } catch (error) {
    console.error(chalk.red('❌ Failed to get configuration:'), error);
    process.exit(1);
  }
}
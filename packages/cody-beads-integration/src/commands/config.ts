import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Configuration Command - Manage cody-beads integration settings
 */
export const configCommand = {
  command: 'config <action>',
  description: 'Configure cody-beads integration settings',
  builder: (yargs: any) => {
    return yargs
      .positional('action', {
        describe: 'Configuration action',
        choices: ['setup', 'test', 'show', 'set', 'get']
      })
      .option('key', {
        alias: 'k',
        type: 'string',
        describe: 'Configuration key to set/get'
      })
      .option('value', {
        alias: 'v',
        type: 'string',
        describe: 'Configuration value to set'
      })
      .option('format', {
        alias: 'f',
        choices: ['json', 'yaml'],
        default: 'json',
        describe: 'Output format'
      });
  },
  handler: async (argv: any) => {
    const configManager = new ConfigManager(argv.config);

    try {
      switch (argv.action) {
        case 'setup':
          await setupConfiguration(configManager);
          break;

        case 'test':
          await testConfiguration(configManager);
          break;

        case 'show':
          await showConfiguration(configManager, argv.format);
          break;

        case 'set':
          if (!argv.key || !argv.value) {
            console.error(chalk.red('❌ --key and --value are required for set operation'));
            process.exit(1);
          }
          await setConfiguration(configManager, argv.key, argv.value);
          break;

        case 'get':
          if (!argv.key) {
            console.error(chalk.red('❌ --key is required for get operation'));
            process.exit(1);
          }
          await getConfiguration(configManager, argv.key);
          break;

        default:
          console.error(chalk.red(`❌ Unknown configuration action: ${argv.action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Configuration operation failed:'), error);
      process.exit(1);
    }
  }
};

async function setupConfiguration(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('🚀 Setting up Cody-Beads configuration...'));

  await configManager.initializeConfig();
}

async function testConfiguration(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('🔍 Testing configuration...'));

  try {
    const config = await configManager.loadConfig();
    const validation = configManager.validateConfig(config);

    if (!validation.valid) {
      console.log(chalk.red('❌ Configuration validation failed:'));
      validation.errors.forEach(error => {
        console.log(chalk.red(`  - ${error}`));
      });
      process.exit(1);
    }

    // Test GitHub connection
    if (config.github.token) {
      console.log(chalk.gray('🌐 Testing GitHub connection...'));
      const githubClient = new GitHubClient(config.github.token);

      try {
        await githubClient.getRepositories();
        console.log(chalk.green('✅ GitHub connection successful'));
      } catch (error) {
        console.log(chalk.red('❌ GitHub connection failed:'), error);
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('⚠️  GitHub token not configured'));
    }

    // Test Beads connection
    if (config.beads.projectPath) {
      console.log(chalk.gray('📋 Testing Beads connection...'));

      try {
        const fs = await import('fs-extra');
        if (await fs.pathExists(config.beads.projectPath)) {
          console.log(chalk.green('✅ Beads project found'));
        } else {
          console.log(chalk.red('❌ Beads project not found:'), config.beads.projectPath);
          process.exit(1);
        }
      } catch (error) {
        console.log(chalk.red('❌ Beads connection failed:'), error);
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('⚠️  Beads project path not configured'));
    }

    console.log(chalk.green('\n✅ Configuration test passed!'));

  } catch (error) {
    console.log(chalk.red('❌ Configuration test failed:'), error);
    process.exit(1);
  }
}

async function showConfiguration(configManager: ConfigManager, format: string): Promise<void> {
  console.log(chalk.blue('📋 Current Configuration:'));

  try {
    const config = await configManager.loadConfig();

    if (format === 'yaml') {
      const yaml = await import('yaml');
      console.log(yaml.stringify(config, { indent: 2 }));
    } else {
      console.log(JSON.stringify(config, null, 2));
    }

  } catch (error) {
    console.log(chalk.red('❌ Failed to load configuration:'), error);
    process.exit(1);
  }
}

async function setConfiguration(configManager: ConfigManager, key: string, value: string): Promise<void> {
  console.log(chalk.blue(`⚙️  Setting configuration: ${key} = ${value}`));

  try {
    const config = await configManager.loadConfig();

    // Parse value as JSON if it looks like JSON
    let parsedValue = value;
    try {
      if (value.startsWith('{') || value.startsWith('[')) {
        parsedValue = JSON.parse(value);
      }
    } catch {
      // Keep as string if not valid JSON
    }

    // Set nested property
    const keys = key.split('.');
    let current = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = parsedValue;

    await configManager.saveConfig(config);
    console.log(chalk.green('✅ Configuration updated successfully'));

  } catch (error) {
    console.log(chalk.red('❌ Failed to set configuration:'), error);
    process.exit(1);
  }
}

async function getConfiguration(configManager: ConfigManager, key: string): Promise<void> {
  console.log(chalk.blue(`📋 Getting configuration: ${key}`));

  try {
    const config = await configManager.loadConfig();

    // Get nested property
    const keys = key.split('.');
    let current = config;
    for (const k of keys) {
      if (current[k] === undefined) {
        console.log(chalk.yellow(`⚠️  Configuration key not found: ${key}`));
        process.exit(1);
      }
      current = current[k];
    }

    console.log(chalk.green(`✅ ${key}:`), JSON.stringify(current, null, 2));

  } catch (error) {
    console.log(chalk.red('❌ Failed to get configuration:'), error);
    process.exit(1);
  }
}
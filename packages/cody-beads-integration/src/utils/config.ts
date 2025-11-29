import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { CodyBeadsConfig, ConfigManager } from '../types/index.js';

/**
 * Configuration manager for Cody-Beads integration
 */
export class ConfigManager implements ConfigManager {
  private configPath: string;
  private defaultConfig: CodyBeadsConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.resolve(process.cwd(), 'cody-beads.config.json');
    this.defaultConfig = this.getDefaultConfig();
  }

  async loadConfig(configPath?: string): Promise<CodyBeadsConfig> {
    const configFilePath = configPath || this.configPath;

    try {
      console.log(chalk.gray(`📂 Loading configuration from ${configFilePath}`));

      if (!await fs.pathExists(configFilePath)) {
        console.log(chalk.yellow('⚠️  Configuration file not found, using defaults'));
        await this.saveConfig(this.defaultConfig, configFilePath);
        return this.defaultConfig;
      }

      const fileContent = await fs.readFile(configFilePath, 'utf8');
      let config: CodyBeadsConfig;

      if (configFilePath.endsWith('.yaml') || configFilePath.endsWith('.yml')) {
        config = yaml.parse(fileContent);
      } else {
        config = JSON.parse(fileContent);
      }

      // Merge with defaults to ensure all required fields are present
      const mergedConfig = this.mergeWithDefaults(config);

      // Validate configuration
      const validation = this.validateConfig(mergedConfig);
      if (!validation.valid) {
        console.log(chalk.red('❌ Configuration validation failed:'));
        validation.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`));
        });
        throw new Error('Invalid configuration');
      }

      // Override with environment variables
      const finalConfig = this.applyEnvironmentOverrides(mergedConfig);

      console.log(chalk.green('✅ Configuration loaded successfully'));
      return finalConfig;

    } catch (error) {
      console.log(chalk.red('❌ Failed to load configuration:'), error);
      throw error;
    }
  }

  async saveConfig(config: CodyBeadsConfig, configPath?: string): Promise<void> {
    const configFilePath = configPath || this.configPath;

    try {
      // Validate before saving
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Ensure directory exists
      await fs.ensureDir(path.dirname(configFilePath));

      const fileContent = JSON.stringify(config, null, 2);

      await fs.writeFile(configFilePath, fileContent, 'utf8');
      console.log(chalk.green(`✅ Configuration saved to ${configFilePath}`));

    } catch (error) {
      console.log(chalk.red('❌ Failed to save configuration:'), error);
      throw error;
    }
  }

  validateConfig(config: Partial<CodyBeadsConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.github?.owner) {
      errors.push('GitHub owner is required');
    }

    if (!config.github?.repo) {
      errors.push('GitHub repository is required');
    }

    // At least one project must be configured
    if (!config.cody?.projectId && !config.beads?.projectPath) {
      errors.push('Either Cody project ID or Beads project path must be configured');
    }

    // Validate sync options
    if (config.sync?.defaultDirection) {
      const validDirections = ['cody-to-beads', 'beads-to-cody', 'bidirectional'];
      if (!validDirections.includes(config.sync.defaultDirection)) {
        errors.push(`Invalid sync direction: ${config.sync.defaultDirection}`);
      }
    }

    if (config.sync?.conflictResolution) {
      const validResolutions = ['manual', 'cody-wins', 'beads-wins', 'newer-wins', 'prompt'];
      if (!validResolutions.includes(config.sync.conflictResolution)) {
        errors.push(`Invalid conflict resolution strategy: ${config.sync.conflictResolution}`);
      }
    }

    // Validate template configuration
    if (config.templates?.defaultTemplate && !config.templates?.templatePath) {
      errors.push('Template path is required when default template is specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      required: ['github', 'sync'],
      properties: {
        version: { type: 'string', description: 'Configuration schema version' },
        github: {
          type: 'object',
          required: ['owner', 'repo'],
          properties: {
            token: { type: 'string', description: 'GitHub authentication token' },
            apiUrl: { type: 'string', description: 'GitHub API URL' },
            owner: { type: 'string', description: 'GitHub repository owner' },
            repo: { type: 'string', description: 'GitHub repository name' }
          }
        },
        cody: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Cody project ID' },
            apiUrl: { type: 'string', description: 'Cody API URL' },
            webhookSecret: { type: 'string', description: 'Cody webhook secret' }
          }
        },
        beads: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Local Beads project path' },
            configPath: { type: 'string', description: 'Beads configuration file path' },
            autoSync: { type: 'boolean', description: 'Enable automatic synchronization' },
            syncInterval: { type: 'number', description: 'Sync interval in minutes' }
          }
        },
        sync: {
          type: 'object',
          required: ['defaultDirection', 'conflictResolution'],
          properties: {
            defaultDirection: {
              type: 'string',
              enum: ['cody-to-beads', 'beads-to-cody', 'bidirectional']
            },
            conflictResolution: {
              type: 'string',
              enum: ['manual', 'cody-wins', 'beads-wins', 'newer-wins', 'prompt']
            },
            preserveComments: { type: 'boolean' },
            preserveLabels: { type: 'boolean' },
            syncMilestones: { type: 'boolean' },
            excludeLabels: { type: 'array', items: { type: 'string' } },
            includeLabels: { type: 'array', items: { type: 'string' } }
          }
        },
        templates: {
          type: 'object',
          properties: {
            defaultTemplate: { type: 'string' },
            templatePath: { type: 'string' }
          }
        }
      }
    };
  }

  async initializeConfig(): Promise<void> {
    console.log(chalk.blue('🚀 Initializing Cody-Beads configuration...'));

    const inquirer = await import('inquirer');
    const ora = await import('ora');

    const spinner = ora.default('📝 Gathering configuration...').start();

    try {
      // Get GitHub information
      const githubAnswers = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'owner',
          message: 'GitHub repository owner:',
          validate: (input: string) => input.length > 0 || 'Owner is required'
        },
        {
          type: 'input',
          name: 'repo',
          message: 'GitHub repository name:',
          validate: (input: string) => input.length > 0 || 'Repository name is required'
        },
        {
          type: 'password',
          name: 'token',
          message: 'GitHub personal access token (or set GITHUB_TOKEN env var):',
          mask: '*'
        }
      ]);

      // Get project configurations
      const projectAnswers = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'hasCodyProject',
          message: 'Do you have a Cody project to integrate?',
          default: false
        },
        {
          type: 'input',
          name: 'projectId',
          message: 'Cody project ID:',
          when: (answers: any) => answers.hasCodyProject,
          validate: (input: string) => input.length > 0 || 'Project ID is required'
        },
        {
          type: 'confirm',
          name: 'hasBeadsProject',
          message: 'Do you have a Beads project to integrate?',
          default: false
        },
        {
          type: 'input',
          name: 'projectPath',
          message: 'Local Beads project path:',
          when: (answers: any) => answers.hasBeadsProject,
          validate: (input: string) => input.length > 0 || 'Project path is required'
        }
      ]);

      // Get sync preferences
      const syncAnswers = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'defaultDirection',
          message: 'Default sync direction:',
          choices: [
            { name: 'Bidirectional (both ways)', value: 'bidirectional' },
            { name: 'Cody to Beads only', value: 'cody-to-beads' },
            { name: 'Beads to Cody only', value: 'beads-to-cody' }
          ],
          default: 'bidirectional'
        },
        {
          type: 'list',
          name: 'conflictResolution',
          message: 'Conflict resolution strategy:',
          choices: [
            { name: 'Manual (prompt for resolution)', value: 'manual' },
            { name: 'Cody wins (override Beads)', value: 'cody-wins' },
            { name: 'Beads wins (override Cody)', value: 'beads-wins' },
            { name: 'Newer wins (most recent update)', value: 'newer-wins' },
            { name: 'Prompt (ask each time)', value: 'prompt' }
          ],
          default: 'manual'
        },
        {
          type: 'confirm',
          name: 'preserveComments',
          message: 'Preserve comments during sync?',
          default: true
        },
        {
          type: 'confirm',
          name: 'preserveLabels',
          message: 'Preserve labels during sync?',
          default: true
        }
      ]);

      spinner.succeed();

      // Create configuration object
      const config: CodyBeadsConfig = {
        ...this.defaultConfig,
        github: {
          ...this.defaultConfig.github,
          owner: githubAnswers.owner,
          repo: githubAnswers.repo,
          token: githubAnswers.token || process.env.GITHUB_TOKEN
        },
        cody: {
          ...this.defaultConfig.cody,
          projectId: projectAnswers.projectId
        },
        beads: {
          ...this.defaultConfig.beads,
          projectPath: projectAnswers.projectPath
        },
        sync: {
          ...this.defaultConfig.sync,
          defaultDirection: syncAnswers.defaultDirection,
          conflictResolution: syncAnswers.conflictResolution,
          preserveComments: syncAnswers.preserveComments,
          preserveLabels: syncAnswers.preserveLabels
        }
      };

      // Save configuration
      await this.saveConfig(config);

      console.log(chalk.green('\n✅ Configuration initialized successfully!'));
      console.log(chalk.blue('\n📝 Next steps:'));
      console.log(chalk.gray('  1. Review the configuration file:'));
      console.log(chalk.gray(`     ${this.configPath}`));
      console.log(chalk.gray('  2. Test the connection:'));
      console.log(chalk.gray('     cody-beads config test'));
      console.log(chalk.gray('  3. Run your first sync:'));
      console.log(chalk.gray('     cody-beads sync --dry-run'));

    } catch (error) {
      spinner.fail(chalk.red('❌ Configuration initialization failed'));
      throw error;
    }
  }

  private getDefaultConfig(): CodyBeadsConfig {
    return {
      version: '1.0.0',
      github: {
        owner: '',
        repo: '',
        token: process.env.GITHUB_TOKEN
      },
      cody: {
        projectId: undefined,
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: undefined,
        configPath: '.beads/beads.json',
        autoSync: false,
        syncInterval: 60 // minutes
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual',
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false
      },
      templates: {
        defaultTemplate: 'minimal',
        templatePath: undefined
      }
    };
  }

  private mergeWithDefaults(config: Partial<CodyBeadsConfig>): CodyBeadsConfig {
    return {
      version: config.version || this.defaultConfig.version,
      github: { ...this.defaultConfig.github, ...config.github },
      cody: { ...this.defaultConfig.cody, ...config.cody },
      beads: { ...this.defaultConfig.beads, ...config.beads },
      sync: { ...this.defaultConfig.sync, ...config.sync },
      templates: { ...this.defaultConfig.templates, ...config.templates }
    };
  }

  private applyEnvironmentOverrides(config: CodyBeadsConfig): CodyBeadsConfig {
    return {
      ...config,
      github: {
        ...config.github,
        token: process.env.GITHUB_TOKEN || config.github.token
      },
      beads: {
        ...config.beads,
        projectPath: process.env.BEADS_PROJECT_PATH || config.beads.projectPath,
        autoSync: process.env.BEADS_AUTO_SYNC ?
          process.env.BEADS_AUTO_SYNC === 'true' :
          config.beads.autoSync
      }
    };
  }
}
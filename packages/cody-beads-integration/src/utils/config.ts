import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { CodyBeadsConfig, ConfigManager as IConfigManager } from '../types/index.js';

/**
 * Configuration manager for Cody-Beads integration
 */
export class ConfigManager implements IConfigManager {
  private configPath: string;
  private defaultConfig: CodyBeadsConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.resolve(process.cwd(), 'cody-beads.config.json');
    this.defaultConfig = this.getDefaultConfig();
  }

  async loadConfig(configPath?: string): Promise<CodyBeadsConfig> {
    const configFilePath = configPath || this.configPath;

    try {
      if (await fs.pathExists(configFilePath)) {
        const configContent = await fs.readFile(configFilePath, 'utf8');
        const config = path.extname(configFilePath) === '.yaml' || path.extname(configFilePath) === '.yml'
          ? yaml.parse(configContent)
          : JSON.parse(configContent);

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);
        
        // Validate configuration
        const validation = this.validateConfig(mergedConfig);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        return mergedConfig as CodyBeadsConfig;
      } else {
        // Return default configuration
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig, configFilePath);
        return defaultConfig;
      }
    } catch (error) {
      throw new Error(`Failed to load configuration from ${configFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveConfig(config: Partial<CodyBeadsConfig>, configPath?: string): Promise<void> {
    const configFilePath = configPath || this.configPath;
    const fullConfig = { ...this.defaultConfig, ...config };

    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(configFilePath));
      
      // Save configuration
      const configContent = JSON.stringify(fullConfig, null, 2);
      await fs.writeFile(configFilePath, configContent, 'utf8');
      
      console.log(`Configuration saved to ${configFilePath}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  async getOption(path: string): Promise<any> {
    const config = await this.loadConfig();
    const keys = path.split('.');
    let current: any = config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  async setOption(path: string, value: any): Promise<void> {
    const config = await this.loadConfig();
    const keys = path.split('.');
    let current: any = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    await this.saveConfig(config);
  }

  async testConfig(): Promise<{ github: boolean; beads: boolean; errors: string[] }> {
    const config = await this.loadConfig();
    const errors: string[] = [];
    let githubOk = false;
    let beadsOk = false;

    try {
      // Test GitHub connection
      if (config.github?.token && config.github?.owner && config.github?.repo) {
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: config.github.token });
        
        // Simple test: try to get repository info
        await octokit.repos.get({
          owner: config.github.owner,
          repo: config.github.repo
        });
        githubOk = true;
      } else {
        errors.push('GitHub configuration incomplete');
      }
    } catch (error) {
      errors.push(`GitHub connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test Beads connection
      if (config.beads?.projectPath) {
        if (await fs.pathExists(config.beads.projectPath)) {
          beadsOk = true;
        } else {
          errors.push('Beads project path does not exist');
        }
      } else if (config.cody?.projectId) {
        // For now, just validate that we have a project ID
        beadsOk = true;
      } else {
        errors.push('No Beads or Cody project configured');
      }
    } catch (error) {
      errors.push(`Beads connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      github: githubOk,
      beads: beadsOk,
      errors
    };
  }

  private getDefaultConfig(): CodyBeadsConfig {
    return {
      version: '1.0.0',
      github: {
        owner: '',
        repo: '',
        token: '',
        apiUrl: 'https://api.github.com'
      },
      cody: {
        projectId: '',
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: './.beads',
        configPath: '.beads/beads.json',
        autoSync: false,
        syncInterval: 60
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual',
        includeLabels: ['bug', 'feature', 'enhancement'],
        excludeLabels: ['wontfix', 'duplicate'],
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false
      },
      templates: {
        defaultTemplate: 'minimal',
        templatePath: './templates'
      }
    };
  }

  private mergeWithEnvVars(config: any): any {
    const envConfig = { ...config };

    // Merge GitHub environment variables
    if (process.env.GITHUB_TOKEN) {
      envConfig.github = { ...envConfig.github, token: process.env.GITHUB_TOKEN };
    }
    if (process.env.GITHUB_OWNER) {
      envConfig.github = { ...envConfig.github, owner: process.env.GITHUB_OWNER };
    }
    if (process.env.GITHUB_REPO) {
      envConfig.github = { ...envConfig.github, repo: process.env.GITHUB_REPO };
    }

    // Merge Cody environment variables
    if (process.env.CODY_PROJECT_ID) {
      envConfig.cody = { ...envConfig.cody, projectId: process.env.CODY_PROJECT_ID };
    }

    // Merge Beads environment variables
    if (process.env.BEADS_PROJECT_PATH) {
      envConfig.beads = { ...envConfig.beads, projectPath: process.env.BEADS_PROJECT_PATH };
    }

    return envConfig;
  }
}
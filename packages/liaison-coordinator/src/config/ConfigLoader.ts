import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import {
  CodyBeadsConfig,
  SyncDirection,
  ConflictResolutionStrategy,
} from '../types';

/**
 * Configuration loader interface
 * Defines the contract for all configuration loaders
 */
export interface ConfigLoader {
  /**
   * Load configuration from the specified source
   * @param sourcePath Path to configuration file or source identifier
   */
  load(sourcePath?: string): Promise<CodyBeadsConfig>;

  /**
   * Validate the loaded configuration
   * @param config Configuration to validate
   */
  validate(config: Partial<CodyBeadsConfig>): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Get the source type/format this loader handles
   */
  getSourceType(): string;

  /**
   * Check if the source exists and is accessible
   * @param sourcePath Path to check
   */
  sourceExists(sourcePath?: string): Promise<boolean>;

  /**
   * Get debugging information about the configuration source
   */
  getDebugInfo(): any;
}

/**
 * Base configuration loader with common functionality
 */
export abstract class BaseConfigLoader implements ConfigLoader {
  protected sourcePath: string = '';
  protected debugInfo: any = {};

  constructor(sourcePath?: string) {
    this.sourcePath = sourcePath ?? '';
  }

  abstract load(sourcePath?: string): Promise<CodyBeadsConfig>;
  abstract getSourceType(): string;

  validate(config: Partial<CodyBeadsConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if at least one destination is configured (Beads is primary, Cody is optional)
    if (!config.beads?.projectPath) {
      errors.push('Beads project path is required');
    }

    // Validate issueSource configuration if provided
    if (config.issueSource) {
      const sourceType = config.issueSource.type;

      if (sourceType === 'github') {
        const ghConfig = config.issueSource as { type: 'github'; owner?: string; repo?: string };
        if (!ghConfig.owner) {
          errors.push('GitHub owner is required when using GitHub as issue source');
        }
        if (!ghConfig.repo) {
          errors.push('GitHub repository is required when using GitHub as issue source');
        }
      } else if (sourceType === 'gitlab') {
        const glConfig = config.issueSource as { type: 'gitlab'; projectId?: string };
        if (!glConfig.projectId) {
          errors.push('GitLab project ID is required when using GitLab as issue source');
        }
      } else if (sourceType === 'jira') {
        const jiraConfig = config.issueSource as { type: 'jira'; host?: string; projectKey?: string };
        if (!jiraConfig.host) {
          errors.push('Jira host is required when using Jira as issue source');
        }
        if (!jiraConfig.projectKey) {
          errors.push('Jira project key is required when using Jira as issue source');
        }
      }
      // 'none' and 'local' types don't require additional validation
    }

    // Backwards compatibility: validate deprecated github field if no issueSource
    if (!config.issueSource && config.github) {
      if (!config.github.owner) {
        errors.push('GitHub owner is required (use issueSource for new configs)');
      }
      if (!config.github.repo) {
        errors.push('GitHub repository is required (use issueSource for new configs)');
      }
    }

    // Validate sync options
    if (config.sync?.defaultDirection) {
      const validDirections = [
        'cody-to-beads',
        'beads-to-cody',
        'bidirectional',
      ];
      if (!validDirections.includes(config.sync.defaultDirection)) {
        errors.push(`Invalid sync direction: ${config.sync.defaultDirection}`);
      }
    }

    if (config.sync?.conflictResolution) {
      const validResolutions = [
        'manual',
        'cody-wins',
        'beads-wins',
        'newer-wins',
        'prompt',
        'timestamp',
        'merge',
      ];
      if (!validResolutions.includes(config.sync.conflictResolution)) {
        errors.push(
          `Invalid conflict resolution strategy: ${config.sync.conflictResolution}`
        );
      }
    }

    // Validate template configuration
    if (config.templates?.defaultTemplate && !config.templates?.templatePath) {
      errors.push(
        'Template path is required when default template is specified'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async sourceExists(): Promise<boolean> {
    const checkPath = this.sourcePath;
    if (!checkPath) return false;
    return fs.pathExists(checkPath);
  }

  getDebugInfo(): any {
    return {
      sourceType: this.getSourceType(),
      sourcePath: this.sourcePath,
      ...this.debugInfo,
    };
  }

  protected getDefaultConfig(): CodyBeadsConfig {
    return {
      version: '1.0.0',
      // No issueSource by default - runs in Beads-only mode
      // User must explicitly configure an issue source
      cody: {
        projectId: '',
        apiUrl: 'https://api.cody.ai',
      },
      beads: {
        projectPath: './.beads',
        configPath: '.beads/beads.json',
        autoSync: false,
        syncInterval: 60,
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual',
        includeLabels: ['bug', 'feature', 'enhancement'],
        excludeLabels: ['wontfix', 'duplicate'],
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
      },
      templates: {
        defaultTemplate: 'minimal',
        templatePath: './templates',
      },
    };
  }

  protected mergeWithEnvVars(config: any): any {
    const envConfig = { ...config };

    // Determine issue source type from environment
    const issueSourceType = process.env.ISSUE_SOURCE_TYPE;

    // If ISSUE_SOURCE_TYPE is set, use the new issueSource field
    if (issueSourceType) {
      switch (issueSourceType) {
        case 'github':
          envConfig.issueSource = {
            type: 'github',
            owner: process.env.GITHUB_OWNER || envConfig.issueSource?.owner || '',
            repo: process.env.GITHUB_REPO || envConfig.issueSource?.repo || '',
            token: process.env.GITHUB_TOKEN || envConfig.issueSource?.token,
            apiUrl: process.env.GITHUB_API_URL || envConfig.issueSource?.apiUrl,
          };
          break;
        case 'gitlab':
          envConfig.issueSource = {
            type: 'gitlab',
            projectId: process.env.GITLAB_PROJECT_ID || envConfig.issueSource?.projectId || '',
            token: process.env.GITLAB_TOKEN || envConfig.issueSource?.token,
            apiUrl: process.env.GITLAB_API_URL || envConfig.issueSource?.apiUrl,
          };
          break;
        case 'jira':
          envConfig.issueSource = {
            type: 'jira',
            host: process.env.JIRA_HOST || envConfig.issueSource?.host || '',
            projectKey: process.env.JIRA_PROJECT_KEY || envConfig.issueSource?.projectKey || '',
            email: process.env.JIRA_EMAIL || envConfig.issueSource?.email || '',
            apiToken: process.env.JIRA_API_TOKEN || envConfig.issueSource?.apiToken || '',
          };
          break;
        case 'local':
          envConfig.issueSource = {
            type: 'local',
            path: process.env.LOCAL_ISSUES_PATH || envConfig.issueSource?.path || './.issues',
          };
          break;
        case 'none':
          envConfig.issueSource = { type: 'none' };
          break;
      }
    } else if (process.env.GITHUB_OWNER || process.env.GITHUB_REPO || process.env.GITHUB_TOKEN) {
      // Backwards compatibility: if GITHUB_* vars are set without ISSUE_SOURCE_TYPE,
      // create issueSource from them (preferred) or update deprecated github field
      if (!envConfig.issueSource) {
        envConfig.issueSource = {
          type: 'github',
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          token: process.env.GITHUB_TOKEN,
          apiUrl: process.env.GITHUB_API_URL,
        };
      } else if (envConfig.issueSource.type === 'github') {
        // Merge env vars into existing GitHub issueSource
        envConfig.issueSource = {
          ...envConfig.issueSource,
          ...(process.env.GITHUB_OWNER && { owner: process.env.GITHUB_OWNER }),
          ...(process.env.GITHUB_REPO && { repo: process.env.GITHUB_REPO }),
          ...(process.env.GITHUB_TOKEN && { token: process.env.GITHUB_TOKEN }),
          ...(process.env.GITHUB_API_URL && { apiUrl: process.env.GITHUB_API_URL }),
        };
      }

      // Also maintain deprecated github field for backwards compatibility
      envConfig.github = {
        ...envConfig.github,
        ...(process.env.GITHUB_TOKEN && { token: process.env.GITHUB_TOKEN }),
        ...(process.env.GITHUB_OWNER && { owner: process.env.GITHUB_OWNER }),
        ...(process.env.GITHUB_REPO && { repo: process.env.GITHUB_REPO }),
        ...(process.env.GITHUB_API_URL && { apiUrl: process.env.GITHUB_API_URL }),
      };
    }

    // Merge Cody environment variables
    if (process.env.CODY_PROJECT_ID) {
      envConfig.cody = {
        ...envConfig.cody,
        projectId: process.env.CODY_PROJECT_ID,
      };
    }

    // Merge Beads environment variables
    if (process.env.BEADS_PROJECT_PATH) {
      envConfig.beads = {
        ...envConfig.beads,
        projectPath: process.env.BEADS_PROJECT_PATH,
      };
    }

    return envConfig;
  }
}

/**
 * JSON configuration loader
 * Loads configuration from JSON files
 */
export class JSONConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return 'json';
  }

  async load(): Promise<CodyBeadsConfig> {
    const configPath =
      this.sourcePath || path.resolve(process.cwd(), 'liaison.config.json');

    try {
      this.sourcePath = configPath;
      if (await this.sourceExists()) {
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);

        this.debugInfo = {
          fileSize: (await fs.stat(configPath)).size,
          lastModified: (await fs.stat(configPath)).mtime,
        };

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);

        // Validate loaded configuration
        const validation = this.validate(mergedConfig);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${(validation.errors || []).join(', ')}`
          );
        }

        return mergedConfig;
      } else {
        // Return default configuration without validation to avoid deadlock
        return this.getDefaultConfig();
      }
    } catch (error: any) {
      // If file doesn't exist, return default config
      if (
        error.message.includes('ENOENT') ||
        error.message.includes('no such file')
      ) {
        return this.getDefaultConfig();
      }
      throw new Error(
        `Failed to load JSON configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * YAML configuration loader
 * Loads configuration from YAML files
 */
export class YAMLConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return 'yaml';
  }

  async load(sourcePath?: string): Promise<CodyBeadsConfig> {
    const configPath =
      sourcePath ||
      this.sourcePath ||
      path.resolve(process.cwd(), 'liaison.config.yaml');

    try {
      this.sourcePath = configPath;
      if (await this.sourceExists()) {
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = yaml.parse(configContent);

        this.debugInfo = {
          fileSize: (await fs.stat(configPath)).size,
          lastModified: (await fs.stat(configPath)).mtime,
        };

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);

        // Validate loaded configuration
        const validation = this.validate(mergedConfig);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${(validation.errors || []).join(', ')}`
          );
        }

        return mergedConfig;
      } else {
        // Return default configuration without validation to avoid deadlock
        return this.getDefaultConfig();
      }
    } catch (error: any) {
      // If file doesn't exist, return default config
      if (
        error.message.includes('ENOENT') ||
        error.message.includes('no such file')
      ) {
        return this.getDefaultConfig();
      }
      throw new Error(
        `Failed to load YAML configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Environment configuration loader
 * Loads configuration from environment variables
 */
export class EnvConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return 'env';
  }

  async load(): Promise<CodyBeadsConfig> {
    try {
      // Build issue source configuration from environment variables
      const issueSource = this.buildIssueSourceFromEnv();

      // Build configuration from environment variables
      const config: Partial<CodyBeadsConfig> = {
        version: process.env.CONFIG_VERSION || '1.0.0',
        // Use new issueSource if configured
        ...(issueSource && { issueSource }),
        cody: {
          projectId: process.env.CODY_PROJECT_ID || '',
          apiUrl: process.env.CODY_API_URL || 'https://api.cody.ai',
        },
        beads: {
          projectPath: process.env.BEADS_PROJECT_PATH || './.beads',
          configPath: process.env.BEADS_CONFIG_PATH || '.beads/beads.json',
          autoSync: process.env.BEADS_AUTO_SYNC === 'true',
          syncInterval: process.env.BEADS_SYNC_INTERVAL
            ? parseInt(process.env.BEADS_SYNC_INTERVAL)
            : 60,
        },
        sync: {
          defaultDirection:
            (process.env.SYNC_DEFAULT_DIRECTION as SyncDirection) ||
            'bidirectional',
          conflictResolution:
            (process.env
              .SYNC_CONFLICT_RESOLUTION as ConflictResolutionStrategy) ||
            'manual',
          includeLabels: process.env.SYNC_INCLUDE_LABELS
            ? process.env.SYNC_INCLUDE_LABELS.split(',')
            : ['bug', 'feature', 'enhancement'],
          excludeLabels: process.env.SYNC_EXCLUDE_LABELS
            ? process.env.SYNC_EXCLUDE_LABELS.split(',')
            : ['wontfix', 'duplicate'],
          preserveComments: process.env.SYNC_PRESERVE_COMMENTS !== 'false',
          preserveLabels: process.env.SYNC_PRESERVE_LABELS !== 'false',
          syncMilestones: process.env.SYNC_MILESTONES === 'true',
        },
        templates: {
          defaultTemplate: process.env.TEMPLATES_DEFAULT || 'minimal',
          templatePath: process.env.TEMPLATES_PATH || './templates',
        },
      };

      this.debugInfo = {
        envVarsDetected: Object.keys(process.env).filter(
          (key) =>
            key.startsWith('GITHUB_') ||
            key.startsWith('GITLAB_') ||
            key.startsWith('JIRA_') ||
            key.startsWith('ISSUE_SOURCE_') ||
            key.startsWith('CODY_') ||
            key.startsWith('BEADS_') ||
            key.startsWith('SYNC_') ||
            key.startsWith('TEMPLATES_')
        ).length,
        issueSourceType: issueSource?.type || 'none',
      };

      // Validate loaded configuration
      const validation = this.validate(config);
      if (!validation.valid) {
        // Return default config if validation fails for env loader
        // This allows the system to run with defaults when env vars are incomplete
        return this.getDefaultConfig();
      }

      return config as CodyBeadsConfig;
    } catch (error: any) {
      throw new Error(
        `Failed to load environment configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build issue source configuration from environment variables
   */
  private buildIssueSourceFromEnv(): any | undefined {
    const issueSourceType = process.env.ISSUE_SOURCE_TYPE;

    // Explicit issue source type
    if (issueSourceType) {
      switch (issueSourceType) {
        case 'github':
          return {
            type: 'github',
            owner: process.env.GITHUB_OWNER || '',
            repo: process.env.GITHUB_REPO || '',
            token: process.env.GITHUB_TOKEN,
            apiUrl: process.env.GITHUB_API_URL,
          };
        case 'gitlab':
          return {
            type: 'gitlab',
            projectId: process.env.GITLAB_PROJECT_ID || '',
            token: process.env.GITLAB_TOKEN,
            apiUrl: process.env.GITLAB_API_URL,
          };
        case 'jira':
          return {
            type: 'jira',
            host: process.env.JIRA_HOST || '',
            projectKey: process.env.JIRA_PROJECT_KEY || '',
            email: process.env.JIRA_EMAIL || '',
            apiToken: process.env.JIRA_API_TOKEN || '',
          };
        case 'local':
          return {
            type: 'local',
            path: process.env.LOCAL_ISSUES_PATH || './.issues',
          };
        case 'none':
          return { type: 'none' };
        default:
          return undefined;
      }
    }

    // Backwards compatibility: infer from GITHUB_* variables
    if (process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      return {
        type: 'github',
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        token: process.env.GITHUB_TOKEN,
        apiUrl: process.env.GITHUB_API_URL,
      };
    }

    // No issue source configured
    return undefined;
  }

  async sourceExists(): Promise<boolean> {
    // Environment variables always "exist"
    return true;
  }
}

/**
 * Configuration loader factory
 * Creates appropriate loader based on file extension or source type
 */
export class ConfigLoaderFactory {
  static createLoader(sourcePath?: string): ConfigLoader {
    if (!sourcePath) {
      return new EnvConfigLoader();
    }

    const ext = path.extname(sourcePath).toLowerCase();
    switch (ext) {
      case '.json':
        return new JSONConfigLoader(sourcePath);
      case '.yaml':
      case '.yml':
        return new YAMLConfigLoader(sourcePath);
      default:
        // If no specific file extension, try to detect based on content
        // For now, default to JSON
        return new JSONConfigLoader(sourcePath);
    }
  }

  static createEnvLoader(): EnvConfigLoader {
    return new EnvConfigLoader();
  }

  static createJSONLoader(sourcePath?: string): JSONConfigLoader {
    return new JSONConfigLoader(sourcePath);
  }

  static createYAMLLoader(sourcePath?: string): YAMLConfigLoader {
    return new YAMLConfigLoader(sourcePath);
  }
}

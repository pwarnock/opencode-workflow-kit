/**
 * Configuration schema for TaskFlow plugin system
 * YAML-based project configuration with validation
 */

import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  name: string;
  enabled?: boolean;
  config?: Record<string, any>;
  dependencies?: string[];
  permissions?: string[];
}

/**
 * Project configuration interface
 */
export interface ProjectConfig {
  version?: string;
  name: string;
  description?: string;
  plugins?: PluginConfig[];
  global?: Record<string, any>;
  environments?: Record<string, Record<string, any>>;
  hooks?: Array<{
    event: string;
    action: string;
    condition?: string;
    priority?: number;
  }>;
}

/**
 * Configuration manager for TaskFlow
 */
export class ConfigManager {
  private readonly configPath: string;
  private config: ProjectConfig | null = null;
  private watchers: Array<(config: ProjectConfig) => void> = [];

  constructor(configPath: string = './.taskflow.yml') {
    this.configPath = path.resolve(configPath);
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<ProjectConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = yaml.parse(content) as any;
      
      this.config = this.validateConfig(rawConfig);
      return this.config;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        // Create default config if file doesn't exist
        this.config = this.createDefaultConfig();
        await this.save(this.config);
        return this.config;
      }
      throw new Error(`Failed to load configuration: ${error?.message || String(error)}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: ProjectConfig): Promise<void> {
    const content = yaml.stringify(config, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
    });

    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, content, 'utf-8');
    
    this.config = config;
    this.notifyWatchers(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ProjectConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  async update(updates: Partial<ProjectConfig>): Promise<ProjectConfig> {
    const currentConfig = this.getConfig();
    const updatedConfig = { ...currentConfig, ...updates };
    await this.save(updatedConfig);
    return updatedConfig;
  }

  /**
   * Add plugin to configuration
   */
  async addPlugin(pluginConfig: PluginConfig): Promise<void> {
    const config = this.getConfig();
    
    // Check if plugin already exists
    const existingIndex = config.plugins?.findIndex(p => p.name === pluginConfig.name) ?? -1;
    if (existingIndex >= 0) {
      config.plugins![existingIndex] = pluginConfig;
    } else {
      if (!config.plugins) config.plugins = [];
      config.plugins.push(pluginConfig);
    }

    await this.save(config);
  }

  /**
   * Remove plugin from configuration
   */
  async removePlugin(pluginName: string): Promise<void> {
    const config = this.getConfig();
    if (config.plugins) {
      config.plugins = config.plugins.filter(p => p.name !== pluginName);
      await this.save(config);
    }
  }

  /**
   * Update plugin configuration
   */
  async updatePlugin(pluginName: string, updates: Partial<PluginConfig>): Promise<void> {
    const config = this.getConfig();
    const pluginIndex = config.plugins?.findIndex(p => p.name === pluginName) ?? -1;
    
    if (pluginIndex < 0) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    config.plugins![pluginIndex] = { ...config.plugins![pluginIndex], ...updates };
    await this.save(config);
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginName: string): PluginConfig | null {
    const config = this.getConfig();
    return config.plugins?.find(p => p.name === pluginName) || null;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): ProjectConfig {
    const errors: string[] = [];

    // Basic validation
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
    } else {
      if (!config.name || typeof config.name !== 'string') {
        errors.push('Configuration must have a name property');
      }
      
      if (config.plugins && !Array.isArray(config.plugins)) {
        errors.push('Plugins must be an array');
      }
      
      if (config.global && typeof config.global !== 'object') {
        errors.push('Global configuration must be an object');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return {
      version: config.version || '1.0.0',
      name: config.name,
      description: config.description,
      plugins: config.plugins || [],
      global: config.global || {},
      environments: config.environments || {},
      hooks: config.hooks || [],
    };
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: (config: ProjectConfig) => void): void {
    this.watchers.push(callback);
  }

  /**
   * Stop watching for configuration changes
   */
  unwatch(callback: (config: ProjectConfig) => void): void {
    const index = this.watchers.indexOf(callback);
    if (index >= 0) {
      this.watchers.splice(index, 1);
    }
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(config: ProjectConfig): void {
    this.watchers.forEach(callback => {
      try {
        callback(config);
      } catch (error) {
        console.error('Error in configuration watcher:', error);
      }
    });
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): ProjectConfig {
    return {
      version: '1.0.0',
      name: 'TaskFlow Project',
      description: 'TaskFlow project configuration',
      plugins: [],
      global: {
        logLevel: 'info',
        dataDirectory: './.taskflow',
      },
      environments: {
        development: {
          logLevel: 'debug',
        },
        production: {
          logLevel: 'warn',
        },
      },
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(env: string = process.env.NODE_ENV || 'development'): ProjectConfig {
    const baseConfig = this.getConfig();
    const envConfig = baseConfig.environments?.[env] || {};
    
    return {
      ...baseConfig,
      global: { ...baseConfig.global, ...envConfig },
    };
  }

  /**
   * Merge configurations
   */
  mergeConfigs(base: ProjectConfig, override: Partial<ProjectConfig>): ProjectConfig {
    return {
      ...base,
      ...override,
      plugins: override.plugins ?? base.plugins ?? [],
      global: { ...base.global, ...override.global },
      environments: { ...base.environments, ...override.environments },
      hooks: override.hooks ?? base.hooks ?? [],
    };
  }

  /**
   * Export configuration to different formats
   */
  async export(format: 'json' | 'yaml' = 'yaml'): Promise<string> {
    const config = this.getConfig();
    
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        return yaml.stringify(config, { indent: 2 });
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import configuration from different formats
   */
  async import(content: string, format: 'json' | 'yaml' = 'yaml'): Promise<ProjectConfig> {
    let rawConfig: any;
    
    switch (format) {
      case 'json':
        rawConfig = JSON.parse(content);
        break;
      case 'yaml':
        rawConfig = yaml.parse(content);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    const config = this.validateConfig(rawConfig);
    await this.save(config);
    return config;
  }
}

/**
 * Configuration template system
 */
export class ConfigTemplate {
  private readonly templatesPath: string;

  constructor(templatesPath: string = './templates') {
    this.templatesPath = path.resolve(templatesPath);
  }

  /**
   * List available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.templatesPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Load template
   */
  async loadTemplate(name: string): Promise<ProjectConfig> {
    const templatePath = path.join(this.templatesPath, name, 'taskflow.yml');
    const content = await fs.readFile(templatePath, 'utf-8');
    const rawConfig = yaml.parse(content) as any;
    return this.validateConfig(rawConfig);
  }

  /**
   * Apply template to current configuration
   */
  async applyTemplate(name: string, variables: Record<string, any> = {}): Promise<ProjectConfig> {
    const template = await this.loadTemplate(name);
    
    // Replace template variables
    const processedConfig = this.replaceVariables(template, variables);
    
    // Save as new configuration
    const configManager = new ConfigManager();
    await configManager.save(processedConfig);
    
    return processedConfig;
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(config: any, variables: Record<string, any>): any {
    if (typeof config === 'string') {
      return config.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    }
    
    if (Array.isArray(config)) {
      return config.map(item => this.replaceVariables(item, variables));
    }
    
    if (config && typeof config === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.replaceVariables(value, variables);
      }
      return result;
    }
    
    return config;
  }

  /**
   * Validate configuration (helper method)
   */
  private validateConfig(config: any): ProjectConfig {
    const manager = new ConfigManager();
    return manager.validateConfig(config);
  }

  /**
   * Create template from current configuration
   */
  async createTemplate(name: string, description: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    
    const templateDir = path.join(this.templatesPath, name);
    await fs.mkdir(templateDir, { recursive: true });
    
    const templateConfig = {
      ...config,
      name: description,
      plugins: config.plugins?.map((p: any) => ({ ...p, enabled: false })) || [], // Disable plugins by default in templates
    };
    
    const templatePath = path.join(templateDir, 'taskflow.yml');
    const content = yaml.stringify(templateConfig, { indent: 2 });
    await fs.writeFile(templatePath, content, 'utf-8');
  }
}
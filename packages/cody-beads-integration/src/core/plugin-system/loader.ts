/**
 * Plugin discovery and loading mechanism with dependency injection
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter as NativeEventEmitter } from 'events';
import { BasePlugin, PluginFactory, PluginRegistry, PluginContext, Logger, EventEmitter, Storage } from './base.js';

export interface PluginConfig {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  dependencies?: string[];
}

export interface ProjectConfig {
  plugins: PluginConfig[];
  global: Record<string, any>;
  environments?: Record<string, Record<string, any>>;
}

/**
 * Plugin discovery service
 */
export class PluginDiscovery {
  private readonly searchPaths: string[];
  private readonly logger: any;

  constructor(searchPaths: string[], logger: any) {
    this.searchPaths = searchPaths;
    this.logger = logger;
  }

  /**
   * Discover all available plugins
   */
  async discoverPlugins(): Promise<PluginFactory[]> {
    const factories: PluginFactory[] = [];

    for (const searchPath of this.searchPaths) {
      try {
        const pluginFactories = await this.scanDirectory(searchPath);
        factories.push(...pluginFactories);
      } catch (error) {
        this.logger.warn(`Failed to scan plugin directory: ${searchPath}`, error);
      }
    }

    return factories;
  }

  /**
   * Scan directory for plugins
   */
  private async scanDirectory(directory: string): Promise<PluginFactory[]> {
    const factories: PluginFactory[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);
          const factory = await this.loadPlugin(pluginPath);
          if (factory) {
            factories.push(factory);
          }
        }
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }

    return factories;
  }

  /**
   * Load plugin from directory
   */
  private async loadPlugin(pluginPath: string): Promise<PluginFactory | null> {
    try {
      // Check for package.json
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (!packageJsonExists) {
        return null;
      }

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check if it's a valid plugin
      if (!this.isValidPlugin(packageJson)) {
        return null;
      }

      // Load the plugin module
      const modulePath = path.join(pluginPath, packageJson.main || 'index.js');
      const pluginModule = await import(modulePath);

      if (!pluginModule.factory || typeof pluginModule.factory !== 'function') {
        throw new Error(`Plugin ${packageJson.name} does not export a factory function`);
      }

      return pluginModule.factory as PluginFactory;
      } catch (error) {
        this.logger.error(`Failed to load plugin from ${pluginPath}:`, error instanceof Error ? error.message : String(error));
        return null;
      }
  }

  /**
   * Validate plugin package.json
   */
  private isValidPlugin(packageJson: any): boolean {
    return (
      packageJson.name &&
      packageJson.version &&
      packageJson.taskflowPlugin &&
      packageJson.main
    );
  }
}

/**
 * Plugin loader with dependency injection
 */
export class PluginLoader {
  private readonly registry: PluginRegistry;
  private readonly logger: Logger;
  private readonly storage: Storage;
  private readonly events: EventEmitter;

  constructor(logger: Logger, storage: Storage, events: EventEmitter) {
    this.registry = new DefaultPluginRegistry();
    this.logger = logger;
    this.storage = storage;
    this.events = events;
  }

  /**
   * Load and initialize plugins
   */
  async loadPlugins(config: ProjectConfig): Promise<BasePlugin[]> {
    const loadedPlugins: BasePlugin[] = [];
    const factories = await this.resolveLoadOrder(config.plugins);

    for (const pluginConfig of factories) {
      try {
        const plugin = await this.loadPlugin(pluginConfig);
        if (plugin) {
          loadedPlugins.push(plugin);
        }
      } catch (error) {
        this.logger.error(`Failed to load plugin ${pluginConfig.name}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return loadedPlugins;
  }

  /**
   * Resolve plugin load order based on dependencies
   */
  private async resolveLoadOrder(plugins: PluginConfig[]): Promise<PluginConfig[]> {
    const resolved: PluginConfig[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = async (pluginName: string) => {
      if (visited.has(pluginName)) {
        return;
      }

      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected: ${pluginName}`);
      }

      visiting.add(pluginName);

      const pluginConfig = plugins.find(p => p.name === pluginName);
      if (!pluginConfig) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }

      // Visit dependencies first
      if (pluginConfig.dependencies) {
        for (const dep of pluginConfig.dependencies) {
          await visit(dep);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      resolved.push(pluginConfig);
    };

    for (const plugin of plugins) {
      await visit(plugin.name);
    }

    return resolved;
  }

  /**
   * Load individual plugin
   */
  private async loadPlugin(pluginConfig: PluginConfig): Promise<BasePlugin | null> {
    const factory = this.registry.get(pluginConfig.name);
    if (!factory) {
      throw new Error(`Plugin factory not found: ${pluginConfig.name}`);
    }

    // Validate configuration
    const isValid = await factory.validateConfig(pluginConfig.config);
    if (!isValid) {
      throw new Error(`Invalid configuration for plugin: ${pluginConfig.name}`);
    }

    // Create plugin instance
    const plugin = await factory.create(pluginConfig.config);

    // Create plugin context
    const context = this.createPluginContext(pluginConfig);

    // Initialize plugin
    await plugin.initialize(context);

    return plugin;
  }

  /**
   * Create plugin context with dependency injection
   */
  private createPluginContext(pluginConfig: PluginConfig): PluginContext {
    return {
      config: pluginConfig.config,
      logger: this.logger,
      storage: this.storage,
      events: this.events,
    };
  }
}

/**
 * Default plugin registry implementation
 */
export class DefaultPluginRegistry implements PluginRegistry {
  private factories = new Map<string, PluginFactory>();

  register(factory: PluginFactory): void {
    const metadata = factory.getMetadata();
    this.factories.set(metadata.name, factory);
  }

  unregister(name: string): void {
    this.factories.delete(name);
  }

  get(name: string): PluginFactory | undefined {
    return this.factories.get(name);
  }

  list(): PluginFactory[] {
    return Array.from(this.factories.values());
  }

  search(query: string): PluginFactory[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.factories.values()).filter(factory => {
      const metadata = factory.getMetadata();
      return (
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery)
      );
    });
  }
}

/**
 * File-based storage implementation
 */
export class FileStorage implements Storage {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async get(key: string): Promise<any> {
    const filePath = path.join(this.basePath, `${key}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async set(key: string, value: any): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`);
    await fs.unlink(filePath);
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = path.join(this.basePath, prefix);
    try {
      const entries = await fs.readdir(dirPath);
      return entries
        .filter(entry => entry.endsWith('.json'))
        .map(entry => entry.slice(0, -5)); // Remove .json extension
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

/**
 * Node.js EventEmitter implementation
 */
export class NodeEventEmitter implements EventEmitter {
  private emitter = new NativeEventEmitter();

  on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
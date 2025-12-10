/**
 * Enhanced Modular Plugin System
 * Provides comprehensive plugin management with security, dependency resolution, and lifecycle management
 */

import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";
import {
  BasePlugin,
  PluginMetadata,
  PluginContext,
  PluginHealth,
  Logger,
  Storage,
} from "./base.js";
import { PluginSecurityManager } from "./security.js";

/**
 * Plugin registry and management system
 */
export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(pluginId: string): Plugin | undefined;
  list(): Plugin[];
  listByType<T extends Plugin>(type: PluginType): T[];
  search(query: PluginSearchQuery): Plugin[];
}

export interface PluginSearchQuery {
  name?: string;
  author?: string;
  tags?: string[];
  category?: string;
  version?: string;
}

export enum PluginType {
  TRACKER = "tracker",
  VISUALIZER = "visualizer",
  HOOK = "hook",
  WORKFLOW = "workflow",
  INTEGRATION = "integration",
  UTILITY = "utility",
}

export enum PluginStatus {
  LOADED = "loaded",
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
  DISABLED = "disabled",
}

export interface Plugin {
  id: string;
  metadata: PluginMetadata;
  instance: BasePlugin;
  status: PluginStatus;
  dependencies: string[];
  dependents: string[];
  loadTime?: Date;
  lastError?: Error;
  metrics: PluginMetrics;
}

export interface PluginMetrics {
  loadTime: number;
  memoryUsage: number;
  executionCount: number;
  errorCount: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
  optional: boolean;
}

export interface PluginManifest {
  metadata: PluginMetadata;
  type: PluginType;
  entry: string;
  dependencies?: PluginDependency[];
  permissions?: string[];
  resources?: PluginResources;
  configuration?: PluginConfigurationSchema;
}

export interface PluginResources {
  maxMemory: number;
  maxCpuTime: number;
  allowedPaths: string[];
  networkAccess: boolean;
  fileSystemAccess: boolean;
}

export interface PluginConfigurationSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Plugin Manager Implementation
 */
export class PluginManager implements PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private eventBus: EventEmitter;
  private logger: Logger;
  private storage: Storage;
  private config: Record<string, any>;
  private pluginDirectory: string;

  constructor(
    eventBus: EventEmitter,
    _securityManager: PluginSecurityManager,
    logger: Logger,
    storage: Storage,
    config: Record<string, any>,
    pluginDirectory: string = "./plugins",
  ) {
    this.eventBus = eventBus;
    // Security manager stored for future use
    // this.securityManager = securityManager;
    this.logger = logger;
    this.storage = storage;
    this.config = config;
    this.pluginDirectory = pluginDirectory;
  }

  /**
   * Register a new plugin
   */
  async register(plugin: Plugin): Promise<void> {
    try {
      // Validate plugin
      await this.validatePlugin(plugin);

      // Check dependencies
      await this.resolveDependencies(plugin);

      // Security check
      await this.securityCheck(plugin);

      // Load plugin
      await this.loadPlugin(plugin);

      // Initialize plugin
      await this.initializePlugin(plugin);

      // Update registry
      this.plugins.set(plugin.id, plugin);

      // Emit event
      this.eventBus.emit("plugin:registered", plugin);

      this.logger.info(
        `Plugin registered: ${plugin.id} (${plugin.metadata.name})`,
      );
    } catch (error) {
      this.logger.error(`Failed to register plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
      // Check for dependents
      await this.checkDependents(pluginId);

      // Cleanup plugin
      await this.cleanupPlugin(plugin);

      // Remove from registry
      this.plugins.delete(pluginId);

      // Emit event
      this.eventBus.emit("plugin:unregistered", plugin);

      this.logger.info(`Plugin unregistered: ${pluginId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get plugin by ID
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all plugins
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * List plugins by type
   */
  listByType<T extends Plugin>(type: string): T[] {
    return this.list().filter(
      (plugin) => (plugin.metadata as any).type === type,
    ) as T[];
  }

  /**
   * Search plugins
   */
  search(query: PluginSearchQuery): Plugin[] {
    return this.list().filter((plugin) => {
      if (
        query.name &&
        !plugin.metadata.name.toLowerCase().includes(query.name.toLowerCase())
      ) {
        return false;
      }
      if (
        query.author &&
        !plugin.metadata.author
          .toLowerCase()
          .includes(query.author.toLowerCase())
      ) {
        return false;
      }
      if (query.version && plugin.metadata.version !== query.version) {
        return false;
      }
      return true;
    });
  }

  /**
   * Load plugins from directory
   */
  async loadFromDirectory(directory?: string): Promise<void> {
    const pluginDir = directory || this.pluginDirectory;

    try {
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPluginFromPath(path.join(pluginDir, entry.name));
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to load plugins from directory ${pluginDir}:`,
        error,
      );
    }
  }

  /**
   * Enable plugin
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status === PluginStatus.ACTIVE) {
      return;
    }

    try {
      await this.activatePlugin(plugin);
      plugin.status = PluginStatus.ACTIVE;
      this.eventBus.emit("plugin:enabled", plugin);
      this.logger.info(`Plugin enabled: ${pluginId}`);
    } catch (error) {
      plugin.status = PluginStatus.ERROR;
      plugin.lastError = error as Error;
      this.logger.error(`Failed to enable plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Disable plugin
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status === PluginStatus.INACTIVE) {
      return;
    }

    try {
      await this.deactivatePlugin(plugin);
      plugin.status = PluginStatus.INACTIVE;
      this.eventBus.emit("plugin:disabled", plugin);
      this.logger.info(`Plugin disabled: ${pluginId}`);
    } catch (error) {
      plugin.status = PluginStatus.ERROR;
      plugin.lastError = error as Error;
      this.logger.error(`Failed to disable plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get plugin health
   */
  async getHealth(pluginId: string): Promise<PluginHealth | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }

    try {
      return await plugin.instance.getHealth();
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const plugins = this.list();
    const healthChecks = await Promise.all(
      plugins.map(async (plugin) => ({
        plugin: plugin.id,
        health: await this.getHealth(plugin.id),
      })),
    );

    const healthy = healthChecks.filter(
      (h) => h.health?.status === "healthy",
    ).length;
    const degraded = healthChecks.filter(
      (h) => h.health?.status === "degraded",
    ).length;
    const unhealthy = healthChecks.filter(
      (h) => h.health?.status === "unhealthy",
    ).length;

    return {
      overall:
        unhealthy === 0
          ? degraded === 0
            ? "healthy"
            : "degraded"
          : "unhealthy",
      totalPlugins: plugins.length,
      healthy,
      degraded,
      unhealthy,
      lastCheck: new Date(),
      plugins: healthChecks,
    };
  }

  /**
   * Private helper methods
   */
  private async validatePlugin(plugin: Plugin): Promise<void> {
    if (!plugin.metadata.name || !plugin.metadata.version) {
      throw new Error("Plugin metadata missing required fields");
    }

    if (!plugin.instance) {
      throw new Error("Plugin instance is required");
    }

    // Validate configuration schema if provided
    if ((plugin.metadata as any).configuration) {
      // Configuration validation would go here
    }

    // Suppress unused parameter warning
    void plugin;
  }

  private async resolveDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }

    for (const depId of plugin.dependencies) {
      const dep = this.plugins.get(depId);
      if (!dep) {
        throw new Error(`Dependency not found: ${depId}`);
      }

      if (dep.status !== PluginStatus.ACTIVE) {
        throw new Error(`Dependency not active: ${depId}`);
      }
    }
  }

  private async securityCheck(_plugin: Plugin): Promise<void> {
    // Security validation would go here
    // await this.securityManager.validatePlugin(_plugin);
  }

  private async loadPlugin(plugin: Plugin): Promise<void> {
    const startTime = Date.now();

    try {
      plugin.status = PluginStatus.LOADED;
      plugin.loadTime = new Date();
      plugin.metrics.loadTime = Date.now() - startTime;

      this.eventBus.emit("plugin:loaded", plugin);
    } catch (error) {
      plugin.status = PluginStatus.ERROR;
      plugin.lastError = error as Error;
      throw error;
    }
  }

  private async initializePlugin(plugin: Plugin): Promise<void> {
    const context: PluginContext = {
      config: this.config,
      logger: this.logger,
      storage: this.storage,
      events: this.eventBus,
      permissions: plugin.metadata.permissions || [],
    };

    await plugin.instance.initialize(context);
  }

  private async cleanupPlugin(plugin: Plugin): Promise<void> {
    if (plugin.status === PluginStatus.ACTIVE) {
      await this.deactivatePlugin(plugin);
    }

    await plugin.instance.cleanup();
  }

  private async activatePlugin(plugin: Plugin): Promise<void> {
    // Plugin-specific activation logic
    if (
      "activate" in plugin.instance &&
      typeof plugin.instance.activate === "function"
    ) {
      await (plugin.instance as any).activate();
    }
  }

  private async deactivatePlugin(plugin: Plugin): Promise<void> {
    // Plugin-specific deactivation logic
    if (
      "deactivate" in plugin.instance &&
      typeof plugin.instance.deactivate === "function"
    ) {
      await (plugin.instance as any).deactivate();
    }
  }

  private async checkDependents(pluginId: string): Promise<void> {
    const dependents = this.list().filter((plugin) =>
      plugin.dependencies.includes(pluginId),
    );

    if (dependents.length > 0) {
      const dependentNames = dependents.map((p) => p.metadata.name).join(", ");
      throw new Error(
        `Cannot unregister plugin ${pluginId}: has dependents (${dependentNames})`,
      );
    }

    // Suppress unused parameter warning
    void pluginId;
  }

  private async loadPluginFromPath(pluginPath: string): Promise<void> {
    try {
      const manifestPath = path.join(pluginPath, "plugin.json");
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Load plugin module
      const entryPath = path.join(pluginPath, manifest.entry);
      const pluginModule = await import(entryPath);

      // Create plugin instance
      const PluginClass =
        pluginModule.default || pluginModule[manifest.metadata.name];
      if (!PluginClass) {
        throw new Error(`Plugin class not found in ${entryPath}`);
      }

      const instance = new PluginClass();

      const plugin: Plugin = {
        id: `${manifest.metadata.name}@${manifest.metadata.version}`,
        metadata: manifest.metadata,
        instance,
        status: PluginStatus.LOADED,
        dependencies: manifest.dependencies?.map((d) => d.pluginId) || [],
        dependents: [],
        metrics: {
          loadTime: 0,
          memoryUsage: 0,
          executionCount: 0,
          errorCount: 0,
          averageExecutionTime: 0,
        },
      };

      await this.register(plugin);
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
    }

    // Suppress unused parameter warning
    void pluginPath;
  }
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  totalPlugins: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  lastCheck: Date;
  plugins: Array<{
    plugin: string;
    health: PluginHealth | null;
  }>;
}

/**
 * Plugin Factory
 */
export class PluginFactory {
  static createPlugin(
    metadata: PluginMetadata,
    instance: BasePlugin,
    _type: PluginType,
  ): Plugin {
    return {
      id: `${metadata.name}@${metadata.version}`,
      metadata,
      instance,
      status: PluginStatus.LOADED,
      dependencies: metadata.dependencies || [],
      dependents: [],
      metrics: {
        loadTime: 0,
        memoryUsage: 0,
        executionCount: 0,
        errorCount: 0,
        averageExecutionTime: 0,
      },
    };
  }

  static async fromManifest(manifestPath: string): Promise<Plugin> {
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest: PluginManifest = JSON.parse(manifestContent);

    const entryPath = path.resolve(path.dirname(manifestPath), manifest.entry);
    const pluginModule = await import(entryPath);
    const PluginClass =
      pluginModule.default || pluginModule[manifest.metadata.name];

    if (!PluginClass) {
      throw new Error(`Plugin class not found: ${manifest.metadata.name}`);
    }

    const instance = new PluginClass();
    return this.createPlugin(manifest.metadata, instance, manifest.type);
  }
}

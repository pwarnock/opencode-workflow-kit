import { EventEmitter } from 'events';
import { 
  CLIPlugin, 
  PluginManager,
  PluginCommand,
  PluginMiddleware,
  PluginHooks
} from './types.js';

export interface PluginContext {
  command: string;
  args: any[];
  options: any;
  plugin?: CLIPlugin;
  metadata: Map<string, any>;
}

export interface PluginDependency {
  name: string;
  version: string;
  optional: boolean;
}

export interface PluginMetadata {
  plugin: CLIPlugin;
  loaded: boolean;
  dependencies: PluginDependency[];
  loadTime: Date;
  error?: Error;
}

export class UnifiedPluginManager extends EventEmitter implements PluginManager {
  private plugins = new Map<string, PluginMetadata>();
  private commands = new Map<string, { plugin: CLIPlugin; command: PluginCommand }>();
  private middleware: PluginMiddleware[] = [];
  private hooks: PluginHooks[] = [];
  private pluginPaths: string[] = [];

  constructor(pluginPaths: string[] = []) {
    super();
    this.pluginPaths = pluginPaths;
  }

  /**
   * Load a plugin into the system
   */
  async loadPlugin(plugin: CLIPlugin): Promise<void> {
    try {
      // Validate plugin structure
      this.validatePlugin(plugin);

      // Check dependencies
      await this.checkDependencies(plugin);

      // Register commands
      for (const command of plugin.commands) {
        if (this.commands.has(command.name)) {
          throw new Error(`Command '${command.name}' already registered by ${this.commands.get(command.name)?.plugin.name}`);
        }
        
        this.commands.set(command.name, { plugin, command });
      }

      // Register middleware
      if (plugin.middleware) {
        this.middleware.push(...plugin.middleware);
      }

      // Register hooks
      if (plugin.hooks) {
        this.hooks.push(plugin.hooks);
      }

      // Store plugin metadata
      const metadata: PluginMetadata = {
        plugin,
        loaded: true,
        dependencies: this.extractDependencies(plugin),
        loadTime: new Date()
      };

      this.plugins.set(plugin.name, metadata);

      // Emit events
      this.emit('pluginLoaded', plugin);
      console.log(`✅ Plugin loaded: ${plugin.name} v${plugin.version}`);

    } catch (error) {
      const metadata: PluginMetadata = {
        plugin,
        loaded: false,
        dependencies: this.extractDependencies(plugin),
        loadTime: new Date(),
        error: error as Error
      };

      this.plugins.set(plugin.name, metadata);
      this.emit('pluginError', plugin, error);
      
      throw error;
    }
  }

  /**
   * Unload a plugin from the system
   */
  async unloadPlugin(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    if (!metadata) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (!metadata.loaded) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    const plugin = metadata.plugin;

    // Check for dependent plugins
    const dependents = this.findDependentPlugins(name);
    if (dependents.length > 0) {
      throw new Error(`Cannot unload '${name}': required by ${dependents.join(', ')}`);
    }

    // Unregister commands
    for (const command of plugin.commands) {
      this.commands.delete(command.name);
    }

    // Remove middleware
    if (plugin.middleware) {
      this.middleware = this.middleware.filter(m => !plugin.middleware!.includes(m));
    }

    // Remove hooks
    if (plugin.hooks) {
      this.hooks = this.hooks.filter(h => h !== plugin.hooks);
    }

    // Update metadata
    metadata.loaded = false;

    // Emit events
    this.emit('pluginUnloaded', plugin);
    console.log(`🔌 Plugin unloaded: ${plugin.name}`);

    // Remove from registry
    this.plugins.delete(name);
  }

  /**
   * Execute a command through the plugin system
   */
  async executeCommand(commandName: string, args: any[] = [], options: any = {}): Promise<any> {
    const commandEntry = this.commands.get(commandName);
    if (!commandEntry) {
      throw new Error(`Command '${commandName}' not found`);
    }

    const { plugin, command } = commandEntry;
    const context: PluginContext = {
      command: commandName,
      args,
      options,
      plugin,
      metadata: new Map()
    };

    try {
      // Execute before hooks
      await this.executeBeforeHooks(commandName, args);

      // Execute middleware chain
      const result = await this.executeMiddleware(context, async () => {
        // Execute the actual command
        const commandResult = await command.handler(args, options);
        
        // Execute after hooks
        await this.executeAfterHooks(commandName, commandResult);
        
        return commandResult;
      });

      return result;

    } catch (error) {
      // Execute error hooks
      await this.executeErrorHooks(error as Error, commandName);
      throw error;
    }
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): CLIPlugin[] {
    return Array.from(this.plugins.values())
      .filter(metadata => metadata.loaded)
      .map(metadata => metadata.plugin);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all available commands
   */
  listCommands(): Array<{ name: string; plugin: string; description: string }> {
    return Array.from(this.commands.entries()).map(([name, entry]) => ({
      name,
      plugin: entry.plugin.name,
      description: entry.command.description
    }));
  }

  /**
   * Discover and load plugins from configured paths
   */
  async discoverPlugins(): Promise<void> {
    for (const pluginPath of this.pluginPaths) {
      try {
        // This would implement dynamic plugin discovery
        // For now, we'll focus on explicit plugin loading
        console.log(`🔍 Discovering plugins in: ${pluginPath}`);
      } catch (error) {
        console.warn(`⚠️  Failed to discover plugins in ${pluginPath}:`, error);
      }
    }
  }

  /**
   * Validate plugin structure and requirements
   */
  private validatePlugin(plugin: CLIPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }

    if (!Array.isArray(plugin.commands) || plugin.commands.length === 0) {
      throw new Error('Plugin must have at least one command');
    }

    // Validate each command
    for (const command of plugin.commands) {
      if (!command.name || typeof command.name !== 'string') {
        throw new Error('Command must have a valid name');
      }

      if (!command.description || typeof command.description !== 'string') {
        throw new Error('Command must have a valid description');
      }

      if (typeof command.handler !== 'function') {
        throw new Error('Command must have a valid handler function');
      }
    }
  }

  /**
   * Check if plugin dependencies are satisfied
   */
  private async checkDependencies(plugin: CLIPlugin): Promise<void> {
    const dependencies = this.extractDependencies(plugin);
    
    for (const dep of dependencies) {
      if (dep.optional) continue;

      const depMetadata = this.plugins.get(dep.name);
      if (!depMetadata || !depMetadata.loaded) {
        throw new Error(`Required dependency '${dep.name}' not found for plugin '${plugin.name}'`);
      }

      // Version compatibility check (simplified)
      if (!this.isVersionCompatible(dep.version, depMetadata.plugin.version)) {
        throw new Error(
          `Plugin '${plugin.name}' requires '${dep.name}@${dep.version}' but '${depMetadata.plugin.version}' is loaded`
        );
      }
    }
  }

  /**
   * Extract dependencies from plugin metadata
   */
  private extractDependencies(_plugin: CLIPlugin): PluginDependency[] {
    // This would typically read from plugin's package.json or metadata
    // For now, we'll return empty array
    return [];
  }

  /**
   * Find plugins that depend on a given plugin
   */
  private findDependentPlugins(pluginName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, metadata] of this.plugins) {
      if (!metadata.loaded) continue;
      
      const hasDependency = metadata.dependencies.some(
        dep => dep.name === pluginName && !dep.optional
      );
      
      if (hasDependency) {
        dependents.push(name);
      }
    }
    
    return dependents;
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddleware(
    context: PluginContext, 
    finalHandler: () => Promise<any>
  ): Promise<any> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middleware.length) {
        const result = await finalHandler();
        context.metadata.set('result', result);
        return;
      }

      const middleware = this.middleware[index++];
      await middleware.execute(context, next);
    };

    await next();
    return context.metadata.get('result');
  }

  /**
   * Execute before command hooks
   */
  private async executeBeforeHooks(command: string, args: any[]): Promise<void> {
    for (const hooks of this.hooks) {
      if (hooks.beforeCommand) {
        await hooks.beforeCommand(command, args);
      }
    }
  }

  /**
   * Execute after command hooks
   */
  private async executeAfterHooks(command: string, result: any): Promise<void> {
    for (const hooks of this.hooks) {
      if (hooks.afterCommand) {
        await hooks.afterCommand(command, result);
      }
    }
  }

  /**
   * Execute error hooks
   */
  private async executeErrorHooks(error: Error, command: string): Promise<void> {
    for (const hooks of this.hooks) {
      if (hooks.onError) {
        await hooks.onError(error, command);
      }
    }
  }

  /**
   * Simple version compatibility check
   */
  private isVersionCompatible(required: string, available: string): boolean {
    // Simplified version check - in real implementation would use semver
    return required === available || required === '*';
  }
}
/**
 * OpenCode Workflow Kit - Core Library
 * 
 * A unified foundation for workflow automation, configuration management,
 * and plugin-based extensibility.
 */

// Export all core types
export * from './types/index.js';

// Import core classes for factory functions
import type { Cache, Validator, SecurityManager, Plugin as IPlugin } from './types/index.js';
import { Validator as ValidatorClass } from './validation/validator-class.js';
import { MemoryCache } from './validation/memory-cache-class.js';
import { SecurityManager as SecurityManagerClass } from './validation/security-manager-class.js';





// Export core classes
export {
  Validator
} from './validation/validator-class.js';

export {
  MemoryCache
} from './validation/memory-cache-class.js';

export {
  SecurityManager
} from './validation/security-manager-class.js';

// Version information
export const VERSION = '0.5.0';

/**
 * Core factory functions
 */
export function createCache(ttl?: number): Cache {
  return new MemoryCache(ttl);
}

export function createValidator(): Validator {
  return new ValidatorClass();
}

export function createSecurityManager(): SecurityManager {
  return new SecurityManagerClass();
}

/**
 * Plugin system integration
 */
export class PluginManager {
  private plugins = new Map<string, IPlugin>();

  /**
   * Register a plugin
   */
  register(plugin: IPlugin): void {
    console.log(`🔌 Registering plugin: ${plugin.name} v${plugin.version}`);
    
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    const removed = this.plugins.delete(name);
    
    if (removed) {
      console.log(`🔌 Unregistered plugin: ${name}`);
    }

    return removed;
  }

  /**
   * Get registered plugin
   */
  get(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all registered plugins
   */
  list(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Initialize all enabled plugins
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing plugins...');
    
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        try {
          if (plugin.initialize) {
            await plugin.initialize();
          }
          console.log(`✅ Plugin initialized: ${plugin.name}`);
        } catch (error) {
          console.error(`❌ Plugin initialization failed: ${plugin.name}`, error);
        }
      } else {
        console.log(`⏸️ Plugin disabled: ${plugin.name}`);
      }
    }
  }

  /**
   * Execute plugin by name
   */
  async execute(name: string, input?: any): Promise<any> {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin is disabled: ${name}`);
    }

    if (!plugin.execute) {
      throw new Error(`Plugin does not support execution: ${name}`);
    }

    return await plugin.execute(input);
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up plugins...');
    
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        try {
          await plugin.cleanup();
          console.log(`✅ Plugin cleaned up: ${plugin.name}`);
        } catch (error) {
          console.error(`❌ Plugin cleanup failed: ${plugin.name}`, error);
        }
      }
    }
  }
}

// Default export
export default {
  VERSION,
  PluginManager,
  createCache,
  createValidator,
  createSecurityManager
};
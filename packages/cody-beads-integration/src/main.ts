/**
 * OpenCode Cody-Beads Integration Package
 * Main entry point and public API exports
 */

// Core exports
export { ConfigurationValidator, validateConfiguration, validateConfigurationFile } from './core/config/validation.js';
export { PluginManager, PluginFactory, PluginType, PluginStatus } from './core/plugin-system/manager.js';
export { BasePlugin, PluginContext, PluginMetadata, PluginHealth } from './core/plugin-system/base.js';
export { PluginSecurityManager } from './core/plugin-system/security.js';

// Sync engine exports - using existing exports
export { SyncEngine } from './core/sync-engine.js';

// Workflow engine exports - using existing exports
export { WorkflowEngine } from './core/workflow-engine.js';

// Configuration exports
import type { Configuration, GitHubConfig, CodyConfig, BeadsConfig, SyncConfig, TemplatesConfig } from './core/config/validation.js';
export type { Configuration, GitHubConfig, CodyConfig, BeadsConfig, SyncConfig, TemplatesConfig };

// Utility exports
export * from './utils/config.js';
export * from './utils/beads.js';
export * from './utils/github.js';

// CLI exports (for programmatic use)
export { createCLI, runCLI } from './cli/index.js';

// Types exports
export type {
  Plugin,
  PluginRegistry,
  PluginMetrics,
  PluginDependency,
  PluginManifest,
  PluginResources,
  SystemHealth
} from './core/plugin-system/manager.js';

// Define missing types locally
export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  CODY_TO_BEADS = 'cody-to-beads',
  BEADS_TO_CODY = 'beads-to-cody'
}

export enum ConflictResolution {
  MANUAL = 'manual',
  CODY_WINS = 'cody-wins',
  BEADS_WINS = 'beads-wins',
  TIMESTAMP = 'timestamp'
}

export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  itemsProcessed: number;
  conflicts: any[];
  errors: any[];
  duration: number;
  timestamp: Date;
}

export interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'file' | 'api' | 'manual';
  config: any;
  enabled: boolean;
}

export interface WorkflowAction {
  id: string;
  name: string;
  type: string;
  config: any;
}

export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  actions: WorkflowAction[];
  errors: any[];
  duration: number;
  timestamp: Date;
}

/**
 * Package version
 */
export const VERSION = '0.5.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@pwarnock/cody-beads',
  version: VERSION,
  description: 'Seamless integration between Cody Product Builder Toolkit and Beads for AI-driven development workflows',
  author: 'OpenCode Workflow Kit Contributors',
  license: 'MIT',
  repository: 'https://github.com/pwarnock/opencode-workflow-kit',
  homepage: 'https://github.com/pwarnock/opencode-workflow-kit/tree/main/packages/cody-beads-integration'
} as const;

/**
 * Default configuration factory
 */
export function createDefaultConfiguration(): Partial<Configuration> {
  return {
    version: '1.0.0',
    github: {
      owner: '',
      repo: '',
      token: '',
      apiUrl: 'https://api.github.com',
      timeout: 30000,
      retries: 3
    },
    cody: {
      projectId: '',
      apiUrl: 'https://api.cody.ai',
      timeout: 30000,
      retries: 3,
      workspace: './.cody',
      autoAdvance: false
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
      syncMilestones: false,
      syncAssignees: true,
      syncProjects: false
    },
    templates: {
      defaultTemplate: 'minimal',
      templatePath: './templates'
    }
  };
}

/**
 * Quick setup function for common use cases
 */
export async function quickSetup(options: {
  githubToken?: string;
  codyProjectId?: string;
  beadsPath?: string;
  configPath?: string;
} = {}): Promise<{
  config: Configuration;
  validator: typeof ConfigurationValidator;
  syncEngine: typeof SyncEngine;
  pluginManager: typeof PluginManager;
}> {
  const { ConfigurationValidator } = await import('./core/config/validation.js');
  const { SyncEngine } = await import('./core/sync-engine.js');
  const { PluginManager } = await import('./core/plugin-system/manager.js');
  const { EventEmitter } = await import('events');

  // Create configuration
  const defaultConfig = createDefaultConfiguration();
  const config: Configuration = {
    ...defaultConfig,
    github: {
      ...defaultConfig.github!,
           token: options.githubToken || defaultConfig.github!.token
    },
    cody: {
      ...defaultConfig.cody!,
      projectId: options.codyProjectId || defaultConfig.cody!.projectId
    },
    beads: {
      ...defaultConfig.beads!,
      projectPath: options.beadsPath || defaultConfig.beads!.projectPath
    }
  } as Configuration;

  // Initialize components
  const validator = new (ConfigurationValidator as any)();
  const eventBus = new EventEmitter();
  
  // Create basic implementations for missing dependencies
  const logger = {
    debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
  };

  const storage = {
    get: async (key: string) => {
      // Simple in-memory storage for demo
      return (global as any)._quickSetupStorage?.[key];
    },
    set: async (key: string, value: any) => {
      (global as any)._quickSetupStorage = (global as any)._quickSetupStorage || {};
      (global as any)._quickSetupStorage[key] = value;
    },
    delete: async (key: string) => {
      delete (global as any)._quickSetupStorage?.[key];
    },
    list: async (prefix: string) => {
      const storage = (global as any)._quickSetupStorage || {};
      return Object.keys(storage).filter(key => key.startsWith(prefix));
    }
  };

  const securityManager = {} as any; // Placeholder

  const syncEngine = new (SyncEngine as any)(config, validator, logger, storage);
  const pluginManager = new (PluginManager as any)(
    eventBus,
    securityManager,
    logger,
    storage,
    config
  );

  // Validate configuration
  const validation = validator.validate(config);
  if (!validation.valid) {
    throw new Error(`Configuration validation failed: ${validation.errors.map((e: any) => e.message).join(', ')}`);
  }

  return {
    config,
    validator,
    syncEngine,
    pluginManager
  };
}

/**
 * Health check function
 */
export async function healthCheck(components: {
  syncEngine?: any;
  pluginManager?: any;
  config?: Configuration;
} = {}): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, any>;
  timestamp: Date;
}> {
  const results: Record<string, any> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check configuration
  if (components.config) {
    const { ConfigurationValidator } = await import('./core/config/validation.js');
    const validator = new ConfigurationValidator();
    const validation = validator.validate(components.config);
    results.config = {
      status: validation.valid ? 'healthy' : 'unhealthy',
      errors: validation.errors,
      warnings: validation.warnings
    };
    if (!validation.valid) {
      overallStatus = 'unhealthy';
    }
  }

  // Check plugin manager
  if (components.pluginManager) {
    try {
      const systemHealth = await components.pluginManager.getSystemHealth();
      results.pluginManager = systemHealth;
      if (systemHealth.overall === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (systemHealth.overall === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      results.pluginManager = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      overallStatus = 'unhealthy';
    }
  }

  // Check sync engine
  if (components.syncEngine) {
    try {
      const syncHealth = await components.syncEngine.getHealth();
      results.syncEngine = syncHealth;
      if (syncHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (syncHealth.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      results.syncEngine = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      overallStatus = 'unhealthy';
    }
  }

  return {
    overall: overallStatus,
    components: results,
    timestamp: new Date()
  };
}

/**
 * Re-export for CLI usage
 */
export { createCLI as cli } from './cli/index.js';

// Legacy exports for backward compatibility
export { program } from './cli/index.js';
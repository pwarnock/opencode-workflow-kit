import chalk from 'chalk';
import { PluginMiddleware } from './types.js';

/**
 * Middleware Manager for CLI command execution
 * Handles middleware chain execution with priority and error handling
 */
export class MiddlewareManager {
  private middlewares: Array<{
    name: string;
    priority: number;
    middleware: PluginMiddleware;
  }> = [];

  /**
   * Register a middleware with optional priority
   */
  register(middleware: PluginMiddleware, priority: number = 0): void {
    this.middlewares.push({
      name: middleware.name,
      priority,
      middleware
    });

    // Sort by priority (higher priority executes first)
    this.middlewares.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a middleware by name
   */
  unregister(name: string): boolean {
    const index = this.middlewares.findIndex(m => m.name === name);
    if (index >= 0) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * List all registered middlewares
   */
  list(): Array<{ name: string; priority: number }> {
    return this.middlewares.map(m => ({
      name: m.name,
      priority: m.priority
    }));
  }

  /**
   * Execute the middleware chain
   */
  async execute(
    context: any,
    finalHandler: () => Promise<any>
  ): Promise<any> {
    let index = 0;

    const executeNext = async (): Promise<any> => {
      if (index >= this.middlewares.length) {
        return finalHandler();
      }

      const { middleware } = this.middlewares[index++];

      return new Promise<any>((resolve, reject) => {
        middleware.execute(context, () => executeNext())
          .then(resolve)
          .catch(reject);
      });
    };

    return executeNext();
  }
}

/**
 * Built-in middleware implementations
 */

/**
 * Logging Middleware - Logs command execution
 */
export const loggingMiddleware: PluginMiddleware = {
  name: 'logging-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    const command = context.command;
    console.log(chalk.blue(`\n📝 Executing command: ${command}`));

    if (context.args && Object.keys(context.args).length > 0) {
      console.log(chalk.gray(`   Arguments: ${JSON.stringify(context.args)}`));
    }

    if (context.options && Object.keys(context.options).length > 0) {
      console.log(chalk.gray(`   Options: ${JSON.stringify(context.options)}`));
    }

    await next();

    console.log(chalk.green(`✅ Command completed: ${command}`));
  }
};

/**
 * Error Handling Middleware - Catches and handles errors
 */
export const errorHandlingMiddleware: PluginMiddleware = {
  name: 'error-handling-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      const err = error as Error;
      context.metadata.set('error', {
        message: err.message,
        command: context.command,
        timestamp: new Date().toISOString()
      });

      console.error(chalk.red(`❌ Error in command '${context.command}': ${err.message}`));

      if (process.env.DEBUG) {
        console.error(chalk.gray(err.stack || ''));
      }

      throw error;
    }
  }
};

/**
 * Timing Middleware - Measures command execution time
 */
export const timingMiddleware: PluginMiddleware = {
  name: 'timing-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    const start = process.hrtime.bigint();

    try {
      await next();
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

      context.metadata.set('executionTime', duration);

      if (process.env.VERBOSE) {
        console.log(chalk.dim(`⏱️  Execution time: ${duration.toFixed(2)}ms`));
      }
    }
  }
};

/**
 * Config Middleware - Loads and validates configuration
 */
export const configMiddleware: PluginMiddleware = {
  name: 'config-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    // Load configuration if needed
    const configPath = process.cwd() + '/.opencode-cli-config.json';

    try {
      const fs = await import('fs/promises');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      context.metadata.set('config', config);
    } catch {
      // Config file optional
      context.metadata.set('config', null);
    }

    await next();
  }
};

/**
 * Validation Middleware - Validates command arguments
 */
export const validationMiddleware: PluginMiddleware = {
  name: 'validation-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    // Validate required arguments
    const requiredFields = context.metadata.get('requiredFields') || [];

    for (const field of requiredFields) {
      if (!context.args[field]) {
        throw new Error(`Missing required argument: ${field}`);
      }
    }

    await next();
  }
};

/**
 * Cache Middleware - Caches command results
 */
export const cacheMiddleware: PluginMiddleware = {
  name: 'cache-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    const cacheKey = `${context.command}:${JSON.stringify(context.args)}`;

    // Check cache
    const cacheStore = context.metadata.get('cacheStore') || new Map();
    const cachedResult = cacheStore.get(cacheKey);

    if (cachedResult && !context.options.nocache) {
      console.log(chalk.dim('📦 Using cached result'));
      context.metadata.set('result', cachedResult);
      context.metadata.set('fromCache', true);
      return;
    }

    // Execute command and cache result
    await next();

    const result = context.metadata.get('result');
    if (result && !context.options.nocache) {
      cacheStore.set(cacheKey, result);
      context.metadata.set('cacheStore', cacheStore);
    }
  }
};

/**
 * Auth Middleware - Handles authentication
 */
export const authMiddleware: PluginMiddleware = {
  name: 'auth-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    // Check for auth token
    const token = process.env.OPENCODE_TOKEN || context.options.token;

    if (!token && context.metadata.get('requiresAuth')) {
      throw new Error(
        'Authentication required. Set OPENCODE_TOKEN environment variable or use --token option'
      );
    }

    context.metadata.set('token', token);
    await next();
  }
};

/**
 * Dry Run Middleware - Simulates command execution
 */
export const dryRunMiddleware: PluginMiddleware = {
  name: 'dry-run-middleware',
  execute: async (context: any, next: () => Promise<void>) => {
    if (context.options.dryRun) {
      console.log(chalk.yellow('🧪 DRY RUN MODE - No actual changes will be made'));
      console.log(chalk.yellow(`Command: ${context.command}`));
      console.log(chalk.yellow(`Args: ${JSON.stringify(context.args)}`));
      console.log(chalk.yellow(`Options: ${JSON.stringify(context.options)}`));

      context.metadata.set('result', { success: true, dryRun: true });
      return;
    }

    await next();
  }
};

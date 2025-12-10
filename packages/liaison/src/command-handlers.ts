import chalk from 'chalk';

/**
 * Command Handler Utilities
 * Provides common patterns and utilities for command handlers
 */

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Base Command Handler class with common functionality
 */
export abstract class BaseCommandHandler {
  protected commandName: string;

  constructor(commandName: string) {
    this.commandName = commandName;
  }

  /**
   * Log success message
   */
  protected logSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Log error message
   */
  protected logError(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
  }

  /**
   * Log warning message
   */
  protected logWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Log info message
   */
  protected logInfo(message: string): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  /**
   * Log debug message
   */
  protected logDebug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`🔍 ${message}`));
    }
  }

  /**
   * Create success result
   */
  protected createResult(success: boolean, message?: string, data?: any): CommandResult {
    return {
      success,
      message,
      data
    };
  }

  /**
   * Create error result
   */
  protected createError(error: string): CommandResult {
    return {
      success: false,
      error
    };
  }

  /**
   * Spawn a child process
   */
  protected async spawnProcess(
    command: string,
    args: string[] = [],
    options: any = {}
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          code: code || 0,
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Abstract execute method
   */
  abstract execute(args: any, options: any): Promise<CommandResult>;
}

/**
 * Sync command handler
 */
export class SyncCommandHandler extends BaseCommandHandler {
  constructor() {
    super('sync');
  }

  async execute(args: any, options: any): Promise<CommandResult> {
    try {
      this.logInfo('Starting Beads-Cody sync...');

      const syncArgs = ['scripts/automated-sync.py'];
      if (options.force) syncArgs.push('--force');
      if (options.trigger) syncArgs.push('--trigger', options.trigger);

      const result = await this.spawnProcess('python3', syncArgs);

      if (result.code === 0) {
        this.logSuccess('Sync completed successfully');
        return this.createResult(true, 'Sync completed', { output: result.stdout });
      } else {
        this.logError(`Sync failed with exit code ${result.code}`);
        return this.createError(result.stderr || `Exit code ${result.code}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logError(message);
      return this.createError(message);
    }
  }
}

/**
 * Status command handler
 */
export class StatusCommandHandler extends BaseCommandHandler {
  constructor() {
    super('status');
  }

  async execute(args: any, options: any): Promise<CommandResult> {
    try {
      this.logInfo('Checking system status...');

      const result = await this.spawnProcess('python3', ['scripts/sync-monitor.py']);

      if (result.code === 0) {
        this.logSuccess('System status healthy');
        return this.createResult(true, 'System healthy', { output: result.stdout });
      } else {
        this.logWarning('System status issues detected');
        return this.createResult(false, 'System has issues', { output: result.stdout });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createError(message);
    }
  }
}

/**
 * Config command handler
 */
export class ConfigCommandHandler extends BaseCommandHandler {
  constructor() {
    super('config');
  }

  async execute(args: any, options: any): Promise<CommandResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const configPath = path.join(process.cwd(), '.opencode-cli-config.json');

      if (options.show) {
        try {
          const configData = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configData);
          console.log(chalk.bold('Current Configuration:'));
          console.log(JSON.stringify(config, null, 2));
          return this.createResult(true, 'Config retrieved', config);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            this.logInfo('No configuration file found. Using defaults.');
            return this.createResult(true, 'Using default config');
          }
          throw error;
        }
      }

      if (options.set) {
        const [key, value] = options.set.split('=');
        if (!key || !value) {
          throw new Error('Invalid format. Use: --set key=value');
        }

        let config: Record<string, any> = {};
        try {
          const configData = await fs.readFile(configPath, 'utf-8');
          config = JSON.parse(configData);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }

        // Set nested key support
        const keys = key.split('.');
        let current: Record<string, any> = config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        // Convert value to appropriate type
        if (value === 'true') current[keys[keys.length - 1]] = true;
        else if (value === 'false') current[keys[keys.length - 1]] = false;
        else if (!isNaN(Number(value))) current[keys[keys.length - 1]] = Number(value);
        else current[keys[keys.length - 1]] = value;

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        this.logSuccess(`Configuration updated: ${key} = ${value}`);

        return this.createResult(true, 'Config updated', config);
      }

      // Show help
      console.log('Usage:');
      console.log('  opencode config --show    Show current configuration');
      console.log('  opencode config --set key=value  Set configuration value');

      return this.createResult(true, 'Help displayed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logError(message);
      return this.createError(message);
    }
  }
}

/**
 * Init command handler
 */
export class InitCommandHandler extends BaseCommandHandler {
  constructor() {
    super('init');
  }

  async execute(args: any, options: any): Promise<CommandResult> {
    try {
      this.logInfo('Initializing Beads-Cody integration...');

      const result = await this.spawnProcess('python3', ['scripts/install-automated-sync.py']);

      if (result.code === 0) {
        this.logSuccess('Beads-Cody integration initialized successfully');
        return this.createResult(true, 'Initialization complete', { output: result.stdout });
      } else {
        this.logError(`Initialization failed with exit code ${result.code}`);
        return this.createError(result.stderr || `Exit code ${result.code}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logError(message);
      return this.createError(message);
    }
  }
}

/**
 * Factory for creating command handlers
 */
export class CommandHandlerFactory {
  private handlers: Map<string, BaseCommandHandler> = new Map();

  constructor() {
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers(): void {
    this.register('sync', new SyncCommandHandler());
    this.register('status', new StatusCommandHandler());
    this.register('config', new ConfigCommandHandler());
    this.register('init', new InitCommandHandler());
  }

  /**
   * Register a command handler
   */
  register(commandName: string, handler: BaseCommandHandler): void {
    this.handlers.set(commandName, handler);
  }

  /**
   * Get a command handler
   */
  get(commandName: string): BaseCommandHandler | undefined {
    return this.handlers.get(commandName);
  }

  /**
   * Create a custom handler from a function
   */
  createFromFunction(
    commandName: string,
    fn: (args: any, options: any) => Promise<CommandResult>
  ): BaseCommandHandler {
    return {
      execute: fn
    } as BaseCommandHandler;
  }
}

/**
 * Helper to format table output
 */
export function formatTable(
  headers: string[],
  rows: string[][]
): string {
  const columnWidths = headers.map((h, i) => {
    return Math.max(
      h.length,
      ...rows.map(r => (r[i] || '').length)
    );
  });

  const separator = '+' + columnWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow = '| ' + headers.map((h, i) => h.padEnd(columnWidths[i])).join(' | ') + ' |';

  const dataRows = rows.map(row =>
    '| ' + row.map((cell, i) => (cell || '').padEnd(columnWidths[i])).join(' | ') + ' |'
  );

  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}

/**
 * Helper to display JSON output
 */
export function displayJSON(data: any, pretty: boolean = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Helper to display YAML output (simple version without dependencies)
 */
export function displayYAML(data: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  const lines: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return String(data);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        lines.push(spaces + '- ' + displayYAML(item, indent + 2).trim());
      } else {
        lines.push(spaces + '- ' + String(item));
      }
    }
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(spaces + key + ':');
        lines.push(displayYAML(value, indent + 2));
      } else {
        lines.push(spaces + key + ': ' + String(value));
      }
    }
  }

  return lines.join('\n');
}

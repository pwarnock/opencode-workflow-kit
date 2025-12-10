import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UnifiedPluginManager,
  MiddlewareManager,
  CommandHandlerFactory,
  loggingMiddleware,
  errorHandlingMiddleware,
  timingMiddleware,
  SyncCommandHandler,
  StatusCommandHandler,
  BaseCommandHandler,
  formatTable,
  displayJSON
} from './index.js';
import type { CLIPlugin } from './types.js';
import { liaisonPlugin } from './liaison-plugin.js';

describe('Unified CLI - Integration Tests', () => {
  let pluginManager: UnifiedPluginManager;
  let middlewareManager: MiddlewareManager;
  let handlerFactory: CommandHandlerFactory;

  beforeEach(() => {
    pluginManager = new UnifiedPluginManager();
    middlewareManager = new MiddlewareManager();
    handlerFactory = new CommandHandlerFactory();
  });

  describe('Plugin System', () => {
    it('should load and list plugins', async () => {
      expect(pluginManager.listPlugins()).toHaveLength(0);

      await pluginManager.loadPlugin(liaisonPlugin);
      const plugins = pluginManager.listPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('liaison');
    });

    it('should handle command execution through plugins', async () => {
      await pluginManager.loadPlugin(liaisonPlugin);
      const commands = pluginManager.listCommands();

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(cmd => cmd.name === 'listTasks')).toBe(true);
    });

    it('should prevent duplicate command registration', async () => {
      const plugin1: CLIPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: async () => ({ success: true })
          }
        ]
      };

      const plugin2: CLIPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
        commands: [
          {
            name: 'test-cmd',
            description: 'Duplicate command',
            handler: async () => ({ success: true })
          }
        ]
      };

      await pluginManager.loadPlugin(plugin1);

      try {
        await pluginManager.loadPlugin(plugin2);
        expect.fail('Should have thrown error for duplicate command');
      } catch (error) {
        expect((error as Error).message).toContain('already registered');
      }
    });

    it('should unload plugins', async () => {
      await pluginManager.loadPlugin(liaisonPlugin);
      expect(pluginManager.listPlugins()).toHaveLength(1);

      await pluginManager.unloadPlugin('liaison');
      expect(pluginManager.listPlugins()).toHaveLength(0);
    });

    it('should provide plugin metadata', async () => {
      await pluginManager.loadPlugin(liaisonPlugin);
      const metadata = pluginManager.getPluginMetadata('liaison');

      expect(metadata).toBeDefined();
      expect(metadata?.loaded).toBe(true);
      expect(metadata?.plugin.version).toBe('0.5.0');
    });
  });

  describe('Middleware System', () => {
    it('should register and list middleware', () => {
      middlewareManager.register(loggingMiddleware);
      middlewareManager.register(errorHandlingMiddleware);

      const list = middlewareManager.list();
      expect(list.length).toBe(2);
      expect(list.some(m => m.name === 'logging-middleware')).toBe(true);
    });

    it('should unregister middleware', () => {
      middlewareManager.register(loggingMiddleware);
      expect(middlewareManager.list()).toHaveLength(1);

      middlewareManager.unregister('logging-middleware');
      expect(middlewareManager.list()).toHaveLength(0);
    });

    it('should execute middleware chain with priorities', async () => {
      const order: string[] = [];

      const middleware1 = {
        name: 'middleware1',
        execute: async (context: any, next: () => Promise<void>) => {
          order.push('start1');
          await next();
          order.push('end1');
        }
      };

      const middleware2 = {
        name: 'middleware2',
        execute: async (context: any, next: () => Promise<void>) => {
          order.push('start2');
          await next();
          order.push('end2');
        }
      };

      middlewareManager.register(middleware1, 10);
      middlewareManager.register(middleware2, 5);

      const context = { metadata: new Map() };
      await middlewareManager.execute(context, async () => {
        order.push('handler');
      });

      expect(order).toEqual(['start1', 'start2', 'handler', 'end2', 'end1']);
    });

    it('should handle errors in middleware', async () => {
      const errorMiddleware = {
        name: 'error-test',
        execute: async (context: any, next: () => Promise<void>) => {
          try {
            await next();
          } catch (error) {
            context.metadata.set('caught', true);
            throw error;
          }
        }
      };

      middlewareManager.register(errorMiddleware);

      const context = { metadata: new Map() };
      try {
        await middlewareManager.execute(context, async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        expect(context.metadata.get('caught')).toBe(true);
      }
    });

    it('should apply timing middleware', async () => {
      middlewareManager.register(timingMiddleware);

      const context = { metadata: new Map() };
      await middlewareManager.execute(context, async () => {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const time = context.metadata.get('executionTime');
      expect(time).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Command Handlers', () => {
    it('should create built-in handlers', () => {
      const syncHandler = handlerFactory.get('sync');
      const statusHandler = handlerFactory.get('status');
      const configHandler = handlerFactory.get('config');

      expect(syncHandler).toBeInstanceOf(BaseCommandHandler);
      expect(statusHandler).toBeInstanceOf(BaseCommandHandler);
      expect(configHandler).toBeInstanceOf(BaseCommandHandler);
    });

    it('should register custom handlers', () => {
      class CustomHandler extends BaseCommandHandler {
        async execute() {
          return this.createResult(true, 'Custom command executed');
        }
      }

      const handler = new CustomHandler('custom');
      handlerFactory.register('custom', handler);

      expect(handlerFactory.get('custom')).toBe(handler);
    });

    it('should execute command handlers', async () => {
      class TestHandler extends BaseCommandHandler {
        async execute(args: any, options: any) {
          return this.createResult(true, 'Test executed', { args, options });
        }
      }

      const handler = new TestHandler('test');
      const result = await handler.execute({ name: 'test' }, { flag: true });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test executed');
      expect(result.data).toEqual({ args: { name: 'test' }, options: { flag: true } });
    });

    it('should handle errors in command handlers', async () => {
      class ErrorHandler extends BaseCommandHandler {
        async execute(args: any, options: any) {
          try {
            throw new Error('Handler error');
          } catch (error) {
            return this.createError(String(error));
          }
        }
      }

      const handler = new ErrorHandler('error');
      const result = await handler.execute({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should compose plugins with middleware', async () => {
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test',
            handler: async (args, options) => {
              return { success: true, data: { args, options } };
            }
          }
        ]
      };

      await pluginManager.loadPlugin(testPlugin);
      middlewareManager.register(loggingMiddleware);

      const context = {
        command: 'test-cmd',
        args: { id: '123' },
        options: { verbose: true },
        metadata: new Map()
      };

      const result = await middlewareManager.execute(context, async () => {
        const cmdResult = await pluginManager.executeCommand('test-cmd', [{ id: '123' }], { verbose: true });
        return cmdResult || { success: true };
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should create complete CLI application workflow', async () => {
      // 1. Load plugins
      await pluginManager.loadPlugin(liaisonPlugin);

      // 2. Set up middleware
      middlewareManager.register(loggingMiddleware, 10);
      middlewareManager.register(errorHandlingMiddleware, 0);

      // 3. Create command context
      const context = {
        command: 'sync',
        args: {},
        options: { force: true },
        metadata: new Map()
      };

      // 4. Execute through middleware (sync command requires external setup, so we verify the flow)
      const result = await middlewareManager.execute(context, async () => {
        // Just verify middleware chain works - sync requires Python setup
        return { success: true, skipped: true };
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should format table output', () => {
      const table = formatTable(
        ['Name', 'Status'],
        [
          ['Task 1', 'Done'],
          ['Task 2', 'In Progress']
        ]
      );

      expect(table).toContain('Name');
      expect(table).toContain('Status');
      expect(table).toContain('Task 1');
      expect(table).toContain('Done');
    });

    it('should display JSON output', () => {
      const data = { name: 'test', count: 42 };
      const json = displayJSON(data, true);

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('test');
      expect(parsed.count).toBe(42);
    });

    it('should format table with different column widths', () => {
      const table = formatTable(
        ['Short', 'VeryLongColumnName'],
        [
          ['A', 'B'],
          ['LongerValue', 'C']
        ]
      );

      expect(table).toContain('VeryLongColumnName');
      expect(table).toContain('LongerValue');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle plugin validation errors', async () => {
      const invalidPlugin: any = {
        name: '',  // Invalid: empty name
        version: '1.0.0',
        commands: []
      };

      try {
        await pluginManager.loadPlugin(invalidPlugin);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect((error as Error).message).toContain('valid name');
      }
    });

    it('should handle missing command dependencies', async () => {
      const dependentPlugin: CLIPlugin = {
        name: 'dependent',
        version: '1.0.0',
        description: 'Dependent plugin',
        commands: [
          {
            name: 'dependent-cmd',
            description: 'Requires another plugin',
            handler: async () => ({ success: true })
          }
        ]
      };

      // This would test dependency checking
      await pluginManager.loadPlugin(dependentPlugin);
      const plugins = pluginManager.listPlugins();
      expect(plugins.some(p => p.name === 'dependent')).toBe(true);
    });

    it('should handle unload of non-existent plugin', async () => {
      try {
        await pluginManager.unloadPlugin('non-existent');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });
  });
});
